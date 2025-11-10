/**
 * 🧱 Construye un log de envío para la hoja REPORTES_ENVIO
 * Incluye soporte para tipo_aviso = "mantenimiento" | "reconexion" | "mixto"
 * @param {Object} data - Info del envío
 * @return {Object} { id_envio, row }
 */
function buildEnvioLog(data) {
  const fecha = new Date();

  const id_envio = Math.random().toString(36).substring(2, 10).toUpperCase();

  const row = [
    id_envio, // ID principal único
    Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    data.tipo || "",               // "cliente" | "asesor"
    data.id || "",                 // ID del cliente o asesor
    data.nombre || "",             // nombre o razón social
    (data.to || []).join("; "),    // destinatarios
    (data.cc || []).join("; "),    // copias
    data.total_maquinas || 0,      // total máquinas incluidas
    data.resultado || "ok",        // "ok" | "sin_contactos" | "sin_email"
    data.observacion || "",        // observaciones opcionales
    data.precio_estimado || ""          // 🆕 mantenimiento | reconexion | mixto
  ];

  return { id_envio, row };
}

/**
 * ✉️ Inserta un registro en la hoja REPORTES_ENVIO
 * @param {Array} row - Fila generada por buildEnvioLog
 */
function registrarEnvio(row) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName("REPORTES_ENVIO");
    if (!sh) {
      Logger.log("⚠️ Hoja REPORTES_ENVIO no encontrada, no se registra el log.");
      return;
    }
    sh.appendRow(row);
  } catch (err) {
    Logger.log("⚠️ Error registrando en REPORTES_ENVIO: " + err.message);
  }
}

/**
 * 🧩 Construye un log de máquina (mantenimiento o reconexión)
 * @param {Object} m - Objeto máquina
 * @param {string} id_envio - ID de envío relacionado
 * @param {string} tipo_aviso - "mantenimiento" | "reconexion"
 * @return {Array} fila lista para appendRow
 */
function buildMaquinaLog(m, id_envio, tipo_aviso = "") {
  
  const id_maquina_log = getNewId();
  Logger.log(`🛠 id_envio usado en máquina → ${id_envio}, num_serie: ${m.num_serie}, tipo_aviso: ${tipo_aviso}`);

  return [
    id_maquina_log,                 // ID único de log de máquina
    id_envio,                       // Relación con REPORTES_ENVIO
    m.cliente || "",                // ID cliente
    m.num_serie || "",              // Número de serie
    m.num_interno || "",            // Interno o flota
    m.linea || "",                  // Línea (JD A&T, JD C&F, etc.)
    m.familia || "",                // Familia
    m.horas_trabajo_motor || 0,     // Horas totales
    m.prox_mto || 0,                // Próximo mantenimiento
    m.horas_restantes || 0,         // Horas restantes
    m.id_asesor || "",              // ID asesor
    m.precio_estimado || "",
    tipo_aviso || ""                // 🆕 mantenimiento | reconexion
  ];
}

/**
 * 🪪 Inserta un registro en la hoja REPORTES_MAQUINAS
 * @param {Array} logRow - Fila generada por buildMaquinaLog
 */
function registrarMaquina(logRow) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName("REPORTES_MAQUINAS");
    if (!sh) {
      Logger.log("⚠️ Hoja REPORTES_MAQUINAS no encontrada, no se registra el log de máquina.");
      return;
    }
    sh.appendRow(logRow);
  } catch (err) {
    Logger.log("⚠️ Error registrando en REPORTES_MAQUINAS: " + err.message);
  }
}



