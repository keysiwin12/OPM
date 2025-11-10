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

/**
 * 🚀 OPTIMIZADO: Inserta MÚLTIPLES registros en una sola operación
 * Mucho más rápido que llamar registrarMaquina() en un bucle
 *
 * @param {Array<Array>} filasLog - Array de filas generadas por buildMaquinaLog
 *
 * Ejemplo de uso:
 * const logs = [];
 * maquinas.forEach(m => logs.push(buildMaquinaLog(m, id_envio, "OPM")));
 * registrarMaquinasEnLote(logs); // Escribe todas de una vez
 *
 * Performance: 1,477 registros en ~2 segundos (vs 74 minutos individualmente)
 */
function registrarMaquinasEnLote(filasLog) {
  if (!filasLog || filasLog.length === 0) {
    Logger.log("⚠️ No hay registros para guardar en lote");
    return;
  }

  try {
    const sh = SpreadsheetApp.getActive().getSheetByName("REPORTES_MAQUINAS");
    if (!sh) {
      Logger.log("⚠️ Hoja REPORTES_MAQUINAS no encontrada, no se registra el log de máquinas.");
      return;
    }

    // Validar que todas las filas tengan datos
    const filasValidas = filasLog.filter(row => row && row.length > 0);

    if (filasValidas.length === 0) {
      Logger.log("⚠️ No hay filas válidas para registrar");
      return;
    }

    if (filasValidas.length !== filasLog.length) {
      Logger.log(`⚠️ Se descartaron ${filasLog.length - filasValidas.length} filas inválidas`);
    }

    // ⚡ ESCRITURA EN LOTE - Una sola operación en Sheets
    const numColumnas = filasValidas[0].length;
    const rangoInicio = sh.getLastRow() + 1;

    sh.getRange(rangoInicio, 1, filasValidas.length, numColumnas)
      .setValues(filasValidas);

    Logger.log(`✅ Registradas ${filasValidas.length} máquinas en lote (filas ${rangoInicio}-${rangoInicio + filasValidas.length - 1})`);

  } catch (err) {
    Logger.log(`❌ Error en escritura en lote: ${err.message}`);
    Logger.log("🔄 Intentando escritura individual como respaldo...");

    // Fallback: escribir una por una solo si falla el lote
    let exitosas = 0;
    filasLog.forEach((log, index) => {
      try {
        registrarMaquina(log);
        exitosas++;
      } catch (e) {
        Logger.log(`⚠️ Error registrando máquina ${index + 1}: ${e.message}`);
      }
    });

    Logger.log(`✅ Registradas ${exitosas}/${filasLog.length} máquinas (modo fallback)`);
  }
}

/**
 * 🧪 TEST: Verifica que la escritura en lote funcione correctamente
 * Ejecuta esto ANTES de usar en producción para validar
 */
function testRegistroEnLote() {
  Logger.log("=== TEST: Registro en Lote de Máquinas ===\n");

  // 1. Crear datos de prueba (simulando 5 máquinas)
  const testLogs = [];
  const id_envio_prueba = "TEST_" + Date.now();

  for (let i = 1; i <= 5; i++) {
    const maquinaPrueba = {
      cliente: "CLIENTE_TEST",
      num_serie: `TEST_SERIE_${i}`,
      num_interno: `INTERNO_${i}`,
      linea: "TEST_LINE",
      familia: "TEST_FAMILY",
      horas_trabajo_motor: 1000 + i * 100,
      prox_mto: 2000,
      horas_restantes: 100 - i * 10,
      id_asesor: "TEST_ASESOR",
      precio_estimado: 500 + i * 100
    };

    testLogs.push(buildMaquinaLog(maquinaPrueba, id_envio_prueba, "TEST_OPM"));
  }

  Logger.log(`✅ Creados ${testLogs.length} registros de prueba`);
  Logger.log(`📝 ID de envío de prueba: ${id_envio_prueba}`);

  // 2. Probar escritura en lote
  Logger.log("\n⏱️ Iniciando escritura en lote...");
  const inicio = Date.now();

  registrarMaquinasEnLote(testLogs);

  const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
  Logger.log(`⚡ Tiempo de escritura: ${tiempo}s`);

  Logger.log("\n✅ TEST COMPLETADO");
  Logger.log(`📊 Verifica en la hoja REPORTES_MAQUINAS que existan ${testLogs.length} filas con id_envio: ${id_envio_prueba}`);
  Logger.log("⚠️ Recuerda eliminar estas filas de prueba después de validar");
}

/**
 * 🧹 LIMPIEZA: Elimina los registros de prueba creados por testRegistroEnLote()
 * @param {string} id_envio_prueba - El ID que aparece en los logs del test
 */
function limpiarRegistrosPrueba(id_envio_prueba) {
  if (!id_envio_prueba || !id_envio_prueba.startsWith("TEST_")) {
    Logger.log("⚠️ Solo se pueden eliminar registros con ID que empiece con TEST_");
    Logger.log("⚠️ Por seguridad, cancelo la operación");
    return;
  }

  try {
    const sh = SpreadsheetApp.getActive().getSheetByName("REPORTES_MAQUINAS");
    if (!sh) {
      Logger.log("⚠️ Hoja REPORTES_MAQUINAS no encontrada");
      return;
    }

    const datos = sh.getDataRange().getValues();
    const filasAEliminar = [];

    // Buscar filas con el id_envio de prueba (columna B, índice 1)
    for (let i = datos.length - 1; i >= 1; i--) { // Empezar desde el final
      if (datos[i][1] === id_envio_prueba) {
        filasAEliminar.push(i + 1); // +1 porque getRange usa índice 1
      }
    }

    if (filasAEliminar.length === 0) {
      Logger.log(`ℹ️ No se encontraron registros con id_envio: ${id_envio_prueba}`);
      return;
    }

    Logger.log(`🗑️ Eliminando ${filasAEliminar.length} filas de prueba...`);

    // Eliminar de abajo hacia arriba para no alterar índices
    filasAEliminar.forEach(fila => {
      sh.deleteRow(fila);
    });

    Logger.log(`✅ ${filasAEliminar.length} filas eliminadas exitosamente`);

  } catch (err) {
    Logger.log(`❌ Error limpiando registros: ${err.message}`);
  }
}


