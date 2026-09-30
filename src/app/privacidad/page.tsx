import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de tratamiento de datos personales" };

function Field({ value, pending }: { value: string; pending: string }) {
  return value === pending ? <span className="pending">{value}</span> : <>{value}</>;
}

export default function PrivacidadPage() {
  const l = legalInfo();
  return (
    <LegalPage title="Política de tratamiento de datos personales">
      <p>
        Esta política explica qué datos personales se tratan en este cuarto de datos, para qué, cómo se protegen y cómo puede
        ejercer sus derechos, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y
        demás normas colombianas de protección de datos personales.
      </p>

      <h2>1. Responsable y encargado del tratamiento</h2>
      <table>
        <tbody>
          <tr><td>Responsable del tratamiento</td><td>{l.responsible}</td></tr>
          <tr><td>Identificación (NIT)</td><td><Field value={l.responsibleId} pending={l.pending} /></td></tr>
          <tr><td>Domicilio y dirección</td><td><Field value={l.address} pending={l.pending} /></td></tr>
          <tr><td>Correo para consultas y reclamos</td><td><Field value={l.email} pending={l.pending} /></td></tr>
          <tr><td>Teléfono</td><td><Field value={l.phone} pending={l.pending} /></td></tr>
          <tr><td>Encargado (implementación y soporte técnico)</td><td>{l.processor}</td></tr>
        </tbody>
      </table>

      <h2>2. Datos que se tratan</h2>
      <ul>
        <li><b>Identificación:</b> nombre, correo electrónico, organización a la que pertenece y rol (auditor o administrador).</li>
        <li><b>Autenticación:</b> contraseña (se guarda cifrada, nunca en texto legible) y el vínculo con su aplicación de verificación en dos pasos.</li>
        <li><b>Actividad:</b> ingresos y cierres de sesión, intentos fallidos, documentos abiertos, páginas consultadas, tiempo de lectura, intentos de copia, impresión o captura, y la fecha y hora de cada acción.</li>
        <li><b>Datos técnicos:</b> dirección IP, ubicación aproximada deducida de la IP (ciudad, región y país), navegador, sistema operativo y tipo de dispositivo.</li>
      </ul>
      <p>
        No se recogen datos sensibles ni datos de menores de edad, no se usa la cámara ni el micrófono y no se obtiene la
        ubicación precisa del dispositivo. Solo se recogen los datos necesarios para las finalidades descritas a continuación.
      </p>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Verificar la identidad de quien ingresa y controlar que solo accedan personas autorizadas y durante el periodo autorizado.</li>
        <li>Proteger la confidencialidad de los documentos, entre otras formas mediante una marca de agua personal en cada página.</li>
        <li>Dejar constancia verificable de qué documentos se pusieron a disposición y quién los consultó, cuándo y desde dónde, como evidencia ante auditorías, controversias o posibles filtraciones.</li>
        <li>Prestar soporte técnico y atender solicitudes de los usuarios.</li>
        <li>Cumplir obligaciones legales y requerimientos de autoridades competentes.</li>
      </ul>

      <h2>4. Autorización</h2>
      <p>
        Antes de usar el cuarto de datos por primera vez, cada usuario otorga su autorización previa, expresa e informada para el
        tratamiento descrito en esta política. La aceptación queda anotada en el registro de actividad con la fecha, la hora y la
        versión de la política, y puede consultarse en cualquier momento.
      </p>

      <h2>5. Derechos del titular</h2>
      <p>Como titular de los datos, usted tiene derecho a:</p>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos personales.</li>
        <li>Solicitar prueba de la autorización otorgada.</li>
        <li>Ser informado, previa solicitud, sobre el uso que se ha dado a sus datos.</li>
        <li>Revocar la autorización o solicitar la supresión de sus datos cuando no se respeten los principios, derechos y garantías legales. La supresión no procede mientras exista un deber legal o contractual de conservarlos. En particular, el registro de actividad se conserva íntegro como constancia de la auditoría durante el plazo de conservación.</li>
        <li>Acceder de forma gratuita a sus datos personales.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio, una vez agotado el trámite de consulta o reclamo ante el responsable.</li>
      </ul>

      <h2>6. Cómo ejercer sus derechos</h2>
      <p>
        Envíe su solicitud al correo indicado en la sección 1, con su nombre, su identificación, la descripción de lo que solicita
        y un medio de respuesta. Las <b>consultas</b> se atienden en un máximo de diez (10) días hábiles, prorrogables por cinco (5)
        días hábiles más. Los <b>reclamos</b> se atienden en un máximo de quince (15) días hábiles, prorrogables por ocho (8) días
        hábiles más, informando al titular los motivos de la demora.
      </p>

      <h2>7. Dónde se guardan los datos y quién los procesa</h2>
      <p>
        Los datos se alojan en servicios de infraestructura en la nube ubicados en los Estados Unidos de América, que actúan
        como encargados del tratamiento:
      </p>
      <ul>
        <li>Supabase: base de datos y autenticación.</li>
        <li>Vercel: alojamiento de la aplicación.</li>
        <li>
          Google: almacenamiento de los documentos de la auditoría en Google Drive, con acceso de solo lectura para la
          aplicación. Google no recibe los datos de actividad de los usuarios.
        </li>
        <li>Un servicio de geolocalización por dirección IP, solo cuando la plataforma de alojamiento no suministre la ubicación aproximada.</li>
      </ul>
      <p>Ninguno de estos datos se vende, se cede con fines comerciales ni se usa para publicidad.</p>

      <h2>8. Medidas de seguridad</h2>
      <ul>
        <li>Toda la comunicación viaja cifrada (HTTPS).</li>
        <li>Acceso solo por invitación, con contraseña y verificación en dos pasos.</li>
        <li>Cierre de sesión por inactividad y fecha de vencimiento de cada acceso.</li>
        <li>Registro de actividad de solo inserción, protegido con un sello de integridad que permite detectar cualquier alteración.</li>
        <li>Acceso administrativo restringido a las personas designadas por el responsable.</li>
      </ul>

      <h2 id="cookies">9. Cookies</h2>
      <p>
        Este sitio usa <b>únicamente cookies esenciales</b>, necesarias para mantener la sesión de forma segura. Sin ellas el
        servicio no puede funcionar:
      </p>
      <ul>
        <li><b>Cookies de sesión (sb-…):</b> mantienen su sesión autenticada. No son accesibles por programas del navegador.</li>
        <li><b>Cookie de actividad (dr_act):</b> permite cerrar la sesión por inactividad.</li>
      </ul>
      <p>
        No se usan cookies de publicidad, de analítica ni de terceros, y no se hace seguimiento de su navegación fuera de este
        sitio. Puede borrar las cookies desde su navegador en cualquier momento; al hacerlo se cerrará su sesión.
      </p>

      <h2>10. Conservación</h2>
      <p>
        Los datos se conservan mientras su acceso esté vigente y, después, por el tiempo que el responsable determine para
        conservar la constancia de la auditoría, conforme a sus obligaciones legales y contractuales. Al finalizar la auditoría
        se desactivan todos los accesos y el registro completo se entrega al responsable.
      </p>

      <h2>11. Vigencia y cambios</h2>
      <p>
        Esta política rige desde la fecha indicada al inicio. Si cambia de forma sustancial, se le pedirá aceptar la nueva
        versión en su siguiente ingreso.
      </p>
    </LegalPage>
  );
}
