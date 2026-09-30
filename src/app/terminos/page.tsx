import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TerminosPage() {
  const l = legalInfo();
  return (
    <LegalPage title="Términos de uso del cuarto de datos">
      <p>
        Estos términos regulan el uso de este cuarto de datos, un espacio privado dispuesto por <b>{l.responsible}</b> (en
        adelante, el responsable) para la consulta controlada de documentación confidencial. Al ingresar, el usuario acepta
        estos términos.
      </p>

      <h2>1. Acceso personal e intransferible</h2>
      <ul>
        <li>El acceso es solo por invitación del responsable. Cada usuario recibe credenciales personales.</li>
        <li>El usuario no debe compartir su contraseña ni su verificación en dos pasos, ni permitir que otra persona use su sesión.</li>
        <li>El acceso tiene la vigencia que defina el responsable, quien puede retirarlo en cualquier momento.</li>
      </ul>

      <h2>2. Confidencialidad y uso permitido</h2>
      <p>
        Los documentos son confidenciales y se ponen a disposición únicamente para el propósito de la revisión encomendada. El
        usuario se compromete a no:
      </p>
      <ul>
        <li>Copiar, fotografiar, capturar, grabar, imprimir, transcribir o reproducir los documentos por cualquier medio.</li>
        <li>Divulgar su contenido a terceros no autorizados.</li>
        <li>Intentar eludir, desactivar o vulnerar las medidas de protección del sitio, ni acceder a información para la que no tiene autorización.</li>
      </ul>
      <p>
        El incumplimiento puede dar lugar al retiro inmediato del acceso y a las acciones contractuales y legales que
        correspondan, incluidas las previstas en la Ley 1273 de 2009 sobre delitos informáticos.
      </p>

      <h2>3. Registro de actividad y marca de agua</h2>
      <p>
        El usuario conoce y acepta que su actividad queda registrada (ingresos, documentos y páginas consultadas, tiempos,
        fecha y hora, dirección IP, ubicación aproximada y dispositivo), y que cada página muestra una marca de agua con sus datos.
        El registro cuenta con un sello de integridad y podrá usarse como constancia y medio de prueba, conforme a la Ley 527 de
        1999 sobre mensajes de datos. El tratamiento de estos datos se rige por la{" "}
        <Link href="/privacidad" className="underline">Política de tratamiento de datos personales</Link>.
      </p>

      <h2>4. Propiedad de la información</h2>
      <p>
        Los documentos pertenecen al responsable o a sus legítimos titulares. El acceso no otorga ningún derecho de propiedad,
        licencia ni uso distinto de la consulta autorizada.
      </p>

      <h2>5. Disponibilidad del servicio</h2>
      <p>
        El servicio se presta sobre infraestructura en la nube y puede tener interrupciones por mantenimiento o por causas
        ajenas al control del responsable y de su proveedor. Estas se atenderán con la mayor diligencia posible.
      </p>

      <h2>6. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Colombia.</p>

      <h2>7. Cambios</h2>
      <p>
        Si estos términos cambian de forma sustancial, se pedirá al usuario aceptar la nueva versión en su siguiente ingreso.
      </p>
    </LegalPage>
  );
}
