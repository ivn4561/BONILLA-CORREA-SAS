import { describe, expect, it } from "vitest";
import {
  AttemptLimiter, ENTRY_TTL_MS, ROOM_PASS_TTL_MS, createEntryToken, createRoomPass, findRoom, parseRooms, readEntryToken, readRoomPass,
} from "@/lib/reception";

const S1 = "a".repeat(40);
const S2 = "b".repeat(40);
const ROOMS = JSON.stringify([
  { codigo: "482731", url: "https://harbor.ejemplo.co/", secreto: S1 },
  { codigo: "111222", url: "https://demo.ejemplo.co", secreto: S2 },
]);

describe("recepción: cuartos y códigos", () => {
  it("lee la lista de cuartos y encuentra el cuarto por su código", () => {
    const rooms = parseRooms(ROOMS);
    expect(rooms).toHaveLength(2);
    expect(findRoom(rooms, "482731")).toEqual({ code: "482731", url: "https://harbor.ejemplo.co", secret: S1 });
    expect(findRoom(rooms, "482732")).toBeNull();
    expect(findRoom(rooms, "")).toBeNull();
  });

  it("rechaza configuraciones inválidas o ambiguas (falla cerrado)", () => {
    expect(parseRooms("no es json")).toEqual([]);
    expect(parseRooms(JSON.stringify([{ codigo: "1234", url: "https://a.co", secreto: S1 }]))).toEqual([]);
    expect(parseRooms(JSON.stringify([{ codigo: "123456", url: "http://a.co", secreto: S1 }]))).toEqual([]);
    expect(parseRooms(JSON.stringify([{ codigo: "123456", url: "javascript:alert(1)", secreto: S1 }]))).toEqual([]);
    expect(parseRooms(JSON.stringify([{ codigo: "123456", url: "https://a.co", secreto: "corto" }]))).toEqual([]);
    const dup = [{ codigo: "123456", url: "https://a.co", secreto: S1 }, { codigo: "123456", url: "https://b.co", secreto: S2 }];
    expect(parseRooms(JSON.stringify(dup))).toEqual([]);
    expect(parseRooms(JSON.stringify([{ codigo: "123456", url: "http://localhost:3000", secreto: S1 }]))).toHaveLength(1);
  });
});

describe("recepción: pases firmados", () => {
  it("el pase de entrada solo sirve para su cuarto y por poco tiempo", () => {
    const now = 1_000_000;
    const t = createEntryToken(S1, now);
    expect(readEntryToken(t, S1, now + 1000)).toBe(true);
    expect(readEntryToken(t, S2, now + 1000)).toBe(false);
    expect(readEntryToken(t, S1, now + ENTRY_TTL_MS + 1)).toBe(false);
    expect(readEntryToken(t.replace(/^\d+/, String(now + 10 * ENTRY_TTL_MS)), S1, now)).toBe(false);
    expect(readEntryToken("basura", S1, now)).toBe(false);
    expect(readEntryToken(null, S1, now)).toBe(false);
  });

  it("la cookie del cuarto vence y no se puede falsificar", () => {
    const now = 5_000_000;
    const p = createRoomPass(S1, now);
    expect(readRoomPass(p, S1, now + 60_000)).toBe(true);
    expect(readRoomPass(p, S2, now)).toBe(false);
    expect(readRoomPass(p, S1, now + ROOM_PASS_TTL_MS + 1)).toBe(false);
    const [, sig] = p.split(".");
    expect(readRoomPass(`${now + 10 * ROOM_PASS_TTL_MS}.${sig}`, S1, now)).toBe(false);
    expect(readRoomPass(undefined, S1, now)).toBe(false);
  });
});

describe("recepción: límite de intentos", () => {
  it("bloquea una IP tras 5 fallos y la libera pasados 15 minutos", () => {
    const l = new AttemptLimiter();
    for (let i = 0; i < 5; i++) l.fail("1.1.1.1", i);
    expect(l.blocked("1.1.1.1", 10)).toBe(true);
    expect(l.blocked("2.2.2.2", 10)).toBe(false);
    expect(l.blocked("1.1.1.1", 15 * 60_000 + 10)).toBe(false);
  });

  it("bloquea a todos si hay demasiados fallos en total (ataque desde muchas IP)", () => {
    const l = new AttemptLimiter(5, 20);
    for (let i = 0; i < 20; i++) l.fail(`10.0.0.${i}`, i);
    expect(l.blocked("9.9.9.9", 30)).toBe(true);
  });
});
