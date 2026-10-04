/** Catálogo de acciones registradas y su etiqueta legible. */
export const ACTION_LABELS: Record<string, string> = {
  login_exitoso: "Inicio de sesión",
  login_fallido: "Intento de inicio fallido",
  login_paso_contrasena: "Contraseña correcta (pendiente 2FA)",
  login_bloqueado: "Inicio bloqueado (demasiados intentos)",
  mfa_fallido: "Código 2FA incorrecto",
  mfa_activado: "2FA activado",
  acceso_denegado: "Acceso denegado",
  ingreso_recepcion: "Llegada por la recepción (código correcto)",
  cierre_sesion: "Cierre de sesión",
  cambio_contrasena: "Cambio de contraseña",
  consentimiento_aceptado: "Aceptación de términos y tratamiento de datos",
  documento_abierto: "Apertura de documento",
  pagina_vista: "Cambio de página",
  documento_cerrado: "Cierre de documento",
  acceso_directo_bloqueado: "Intento de descarga directa bloqueado",
  intento_copia: "Intento de copiar / imprimir / guardar",
  admin_usuario_creado: "Admin: usuario invitado",
  admin_acceso_revocado: "Admin: acceso revocado",
  admin_acceso_restaurado: "Admin: acceso restaurado",
  admin_fecha_fin_cambiada: "Admin: fecha fin de acceso",
  admin_rol_cambiado: "Admin: rol cambiado",
  admin_contrasena_restablecida: "Admin: contraseña restablecida",
  admin_2fa_restablecido: "Admin: 2FA restablecido",
  admin_documento_publicado: "Admin: documento publicado",
  admin_documento_ocultado: "Admin: documento ocultado",
  documentos_sincronizados: "Sincronización con Drive",
  documento_detectado: "Documento nuevo detectado",
  documento_retirado_origen: "Documento retirado del origen",
  registro_exportado: "Registro exportado",
  integridad_verificada: "Verificación de integridad",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
