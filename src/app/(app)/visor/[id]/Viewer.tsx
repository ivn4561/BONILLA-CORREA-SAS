"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { ViewKind } from "@/lib/docs/types";
import { drawWatermark, watermarkDataUrl } from "@/lib/watermark";

type OpenInfo = { viewId: string; watermark: { email: string; ip: string | null; stamp: string } };
type Blocked = "imprimir" | "guardar" | "copiar" | "clic_derecho" | "captura" | "herramientas_dev";

const json = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function Viewer({ documentId, kind, shield = true }: { documentId: string; kind: ViewKind; shield?: boolean }) {
  const [info, setInfo] = useState<OpenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; html: string; truncated: boolean }[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Escudo anticaptura: solo se ve nítida una franja alrededor del cursor (null = cursor fuera del documento).
  const [spot, setSpot] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderRef = useRef<RenderTask | null>(null);
  const imgRef = useRef<ImageBitmap | null>(null);
  const activeSec = useRef(0);
  const closed = useRef(false);
  const lastBlocked = useRef<Record<string, number>>({});

  const wmLines = info ? [
    info.watermark.email,
    `${info.watermark.stamp} · IP ${info.watermark.ip ?? "—"}`,
    "CONFIDENCIAL · NO DISTRIBUIR",
  ] : [];

  // 1) Registrar apertura (sin registro no se muestra nada)
  useEffect(() => {
    let cancel = false;
    fetch("/api/view/open", json({ documentId })).then(async (r) => {
      const d = await r.json();
      if (cancel) return;
      if (!r.ok) { setError(d.error ?? "No se pudo abrir el documento."); setLoading(false); return; }
      setInfo(d);
    }).catch(() => { setError("No se pudo abrir el documento."); setLoading(false); });
    return () => { cancel = true; };
  }, [documentId]);

  // 2) Cargar contenido
  useEffect(() => {
    if (!info) return;
    let cancel = false;
    (async () => {
      try {
        if (kind === "pdf") {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
          const task = pdfjs.getDocument({
            url: `/api/files/${encodeURIComponent(documentId)}`,
            httpHeaders: { "X-Viewer": "1" },
            withCredentials: true,
            disableStream: true,
            disableAutoFetch: true,
            rangeChunkSize: 1024 * 1024,
            cMapUrl: "/pdfjs/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/pdfjs/standard_fonts/",
            wasmUrl: "/pdfjs/wasm/",
            iccUrl: "/pdfjs/iccs/",
            enableXfa: false,
          });
          taskRef.current = task;
          const pdf = await task.promise;
          if (cancel) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages);
        } else if (kind === "image") {
          const r = await fetch(`/api/files/${encodeURIComponent(documentId)}`, { headers: { "X-Viewer": "1" } });
          if (!r.ok) throw new Error((await r.json()).error);
          imgRef.current = await createImageBitmap(await r.blob());
        } else if (kind === "docx" || kind === "text" || kind === "xlsx") {
          const r = await fetch(`/api/docs/${encodeURIComponent(documentId)}/render`, { headers: { "X-Viewer": "1" } });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          if (d.sheets) { setSheets(d.sheets); setNumPages(d.sheets.length); } else setHtml(d.html);
        } else {
          throw new Error("Este tipo de archivo no se puede visualizar. Solicite al administrador una versión en PDF.");
        }
        setLoading(false);
      } catch (e) {
        if (!cancel) { setError(e instanceof Error ? e.message : "Error al cargar el documento."); setLoading(false); }
      }
    })();
    return () => { cancel = true; taskRef.current?.destroy(); taskRef.current = null; pdfRef.current = null; };
  }, [info, kind, documentId]);

  // 3) Dibujar página (PDF / imagen) con marca de agua incrustada en el canvas
  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !info) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const container = canvas.parentElement!.clientWidth - 32;
    if (kind === "pdf" && pdfRef.current) {
      const p = await pdfRef.current.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const scale = Math.min(zoom, (container / base.width) * zoom);
      const vp = p.getViewport({ scale: scale * dpr });
      canvas.width = vp.width; canvas.height = vp.height;
      canvas.style.width = `${vp.width / dpr}px`; canvas.style.height = `${vp.height / dpr}px`;
      renderRef.current?.cancel();
      const task = p.render({ canvas, canvasContext: ctx, viewport: vp });
      renderRef.current = task;
      try {
        await task.promise;
      } catch (e) {
        if ((e as Error)?.name === "RenderingCancelledException") return;
        throw e;
      }
      drawWatermark(ctx, canvas.width, canvas.height, wmLines, dpr * scale);
    } else if (kind === "image" && imgRef.current) {
      const img = imgRef.current;
      const scale = Math.min(1, container / img.width) * zoom;
      canvas.width = img.width * scale * dpr; canvas.height = img.height * scale * dpr;
      canvas.style.width = `${img.width * scale}px`; canvas.style.height = `${img.height * scale}px`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawWatermark(ctx, canvas.width, canvas.height, wmLines, dpr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, kind, page, zoom]);

  useEffect(() => { if (!loading) render().catch(() => setError("No se pudo dibujar la página.")); }, [loading, render]);

  // 4) Registrar cambios de página (con retardo para no registrar cada clic rápido)
  const logged = useRef(1);
  useEffect(() => {
    if (!info || page === logged.current) return;
    const t = setTimeout(() => {
      logged.current = page;
      fetch("/api/view/page", json({ viewId: info.viewId, page, total: numPages }));
    }, 1200);
    return () => clearTimeout(t);
  }, [page, info, numPages]);

  // 5) Tiempo de visualización: solo cuenta con la pestaña visible y enfocada
  useEffect(() => {
    if (!info) return;
    const tick = setInterval(() => { if (document.visibilityState === "visible" && document.hasFocus()) activeSec.current++; }, 1000);
    const beat = setInterval(() => {
      const n = Math.min(activeSec.current, 120);
      activeSec.current -= n;
      fetch("/api/view/heartbeat", json({ viewId: info.viewId, activeSeconds: n })).then((r) => { if (r.status === 401) location.href = "/login?motivo=inactividad"; });
    }, 30_000);
    const close = () => {
      if (closed.current) return;
      closed.current = true;
      const payload = JSON.stringify({ viewId: info.viewId, activeSeconds: Math.min(activeSec.current, 120) });
      navigator.sendBeacon("/api/view/close", new Blob([payload], { type: "text/plain" }));
    };
    window.addEventListener("pagehide", close);
    return () => { clearInterval(tick); clearInterval(beat); window.removeEventListener("pagehide", close); close(); };
  }, [info]);

  // 6) Protecciones: clic derecho, atajos, impresión, pérdida de foco
  useEffect(() => {
    if (!info) return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const hideFor = (ms: number) => {
      setHidden(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setHidden(!document.hasFocus() || document.visibilityState !== "visible"), ms);
    };
    const report = (what: Blocked, msg: string) => {
      setNotice(msg);
      setTimeout(() => setNotice(null), 2500);
      const now = Date.now();
      if (now - (lastBlocked.current[what] ?? 0) < 10_000) return;
      lastBlocked.current[what] = now;
      fetch("/api/view/blocked", json({ viewId: info.viewId, what }));
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && k === "p") { e.preventDefault(); report("imprimir", "La impresión está deshabilitada."); }
      else if (mod && k === "s") { e.preventDefault(); report("guardar", "La descarga está deshabilitada."); }
      else if (mod && (k === "c" || k === "x" || k === "a")) { e.preventDefault(); report("copiar", "Copiar está deshabilitado."); }
      else if (e.key === "F12" || (mod && e.shiftKey && ["i", "j", "c"].includes(k)) || (mod && k === "u")) { e.preventDefault(); report("herramientas_dev", "Acción no permitida."); }
      else if (e.key === "PrintScreen") {
        e.preventDefault();
        hideFor(2000);
        report("captura", "Captura de pantalla bloqueada.");
        // Windows ya copió la imagen al portapapeles: la reemplazamos por texto.
        if (e.type === "keyup") navigator.clipboard?.writeText("Captura bloqueada · Cuarto de datos").catch(() => {});
      }
      // macOS: Cmd+Shift+3/4/5 · Windows: Win+Shift+S (herramienta Recortes)
      else if (e.type === "keydown" && e.shiftKey && (e.metaKey || e.key === "Meta" || e.key === "OS")) { hideFor(3000); report("captura", "Captura de pantalla bloqueada."); }
      else if (e.type === "keydown" && (e.key === "Meta" || e.key === "OS")) hideFor(1500);
    };
    const onCtx = (e: MouseEvent) => { e.preventDefault(); report("clic_derecho", "Menú contextual deshabilitado."); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); report("copiar", "Copiar está deshabilitado."); };
    const onPrint = () => report("imprimir", "La impresión está deshabilitada.");
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    const onVis = () => setHidden(document.visibilityState !== "visible");
    const noDrag = (e: DragEvent) => e.preventDefault();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("copy", onCopy);
    document.addEventListener("dragstart", noDrag);
    window.addEventListener("beforeprint", onPrint);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("dragstart", noDrag);
      window.removeEventListener("beforeprint", onPrint);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [info]);

  const paged = kind === "pdf" || !!sheets;

  return (
    <div className="card protected relative overflow-hidden" data-testid="viewer">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-cream-2 px-4 py-2">
        <div className="flex items-center gap-2">
          {paged && (
            <>
              <button className="btn-ghost px-3 py-1" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Página anterior">‹</button>
              <span className="text-xs text-navy" data-testid="page-indicator">{sheets ? `Hoja ${page} de ${numPages}` : `Página ${page} de ${numPages}`}</span>
              <button className="btn-ghost px-3 py-1" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} aria-label="Página siguiente">›</button>
            </>
          )}
        </div>
        {(kind === "pdf" || kind === "image") && (
          <div className="flex items-center gap-2">
            <button className="btn-ghost px-3 py-1" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))} aria-label="Alejar">−</button>
            <span className="w-12 text-center text-xs text-navy">{Math.round(zoom * 100)}%</span>
            <button className="btn-ghost px-3 py-1" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} aria-label="Acercar">+</button>
          </div>
        )}
        <span className="text-[0.65rem] uppercase tracking-wider text-muted">Solo lectura · Actividad registrada</span>
      </div>

      {sheets && (
        <div className="flex gap-1 overflow-x-auto border-b border-navy/10 bg-white px-2">
          {sheets.map((s, i) => (
            <button key={s.name} onClick={() => setPage(i + 1)} className={`whitespace-nowrap px-3 py-2 text-xs ${page === i + 1 ? "border-b-2 border-gold font-semibold text-navy" : "text-muted"}`}>{s.name}</button>
          ))}
        </div>
      )}

      <div
        ref={stageRef}
        className={`relative min-h-[60vh] bg-[#e9e6de] p-4 transition ${hidden ? "blur-xl" : ""}`}
        onPointerMove={(e) => shield && setSpot(e.clientY - stageRef.current!.getBoundingClientRect().top)}
        onPointerDown={(e) => shield && setSpot(e.clientY - stageRef.current!.getBoundingClientRect().top)}
        onPointerLeave={() => setSpot(null)}
      >
        {loading && !error && <p className="p-8 text-center text-sm text-muted">Cargando documento…</p>}
        {error && <p className="p-8 text-center text-sm text-red-700">{error}</p>}
        {(kind === "pdf" || kind === "image") && !error && (
          <div className="flex justify-center overflow-auto"><canvas ref={canvasRef} className="bg-white shadow-md" /></div>
        )}
        {(html || sheets) && !error && (
          <div className="relative mx-auto min-h-[50vh] max-w-4xl bg-white shadow-md">
            <div
              className={html ? "doc-html p-10" : "sheet-html max-h-[70vh] overflow-auto"}
              dangerouslySetInnerHTML={{ __html: html ?? sheets![page - 1]?.html ?? "" }}
            />
            {sheets?.[page - 1]?.truncated && <p className="px-4 py-2 text-xs text-muted">Vista limitada a las primeras 3000 filas / 80 columnas.</p>}
            <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: watermarkDataUrl(wmLines) }} />
          </div>
        )}
        {shield && !loading && !error && (
          <div
            data-testid="screen-shield"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 backdrop-blur-md"
            style={spot === null ? undefined : {
              maskImage: `linear-gradient(to bottom, #000 ${spot - 110}px, transparent ${spot - 90}px, transparent ${spot + 90}px, #000 ${spot + 110}px)`,
              WebkitMaskImage: `linear-gradient(to bottom, #000 ${spot - 110}px, transparent ${spot - 90}px, transparent ${spot + 90}px, #000 ${spot + 110}px)`,
            }}
          />
        )}
        {shield && spot === null && !loading && !error && !hidden && (
          <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
            <p className="rounded-sm bg-navy/90 px-4 py-2 text-xs text-white">Mueva el cursor (o el dedo) sobre el documento para leerlo</p>
          </div>
        )}
        {hidden && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <p className="rounded-sm bg-navy px-4 py-2 text-xs text-white">Contenido oculto mientras la ventana no está activa</p>
          </div>
        )}
      </div>
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-sm bg-navy px-4 py-2 text-xs text-white shadow-lg">{notice} Este intento quedó registrado.</div>}
    </div>
  );
}
