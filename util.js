// === Helper para validar email ===
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function toStr(v) { return String(v == null ? "" : v).trim(); }

function isTrueish(v) {
  return v === true || toStr(v).toLowerCase() === "true";
}

function formatFechaCorta(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (isNaN(date)) return "-";
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } catch (e) {
    return "-";
  }
}

/**
 * Devuelve el número de días desde la última llamada, o null si no es válido.
 * Acepta valores tipo string, number, vacío o null.
 */
function getDiasUltimaLlamada(row) {
  const raw = row?.dias_ultima_llamada;
  // 🔹 Si está vacío o nulo → se asume 0 días (reciente)
  if (raw === "" || raw == null) return 0;

  const dias = Number(raw);

  // 🔹 Si no es número o negativo → también se asume 0 (reciente)
  if (isNaN(dias) || dias < 0) return 0;

  return dias;
}

function isReciente(row, maxDias = 30) {
  const d = getDiasUltimaLlamada(row);
  return d != null && d <= maxDias;
}
function isDesconectado(row, maxDias = 30) {
  const d = getDiasUltimaLlamada(row);
  return d != null && d > maxDias;
}


function obtenerNumeroSemana() {
  var fecha = new Date(); //fecha hoy
  var primer_dia_year = new Date(fecha.getFullYear(), 0, 1); 
  var dia_semana = primer_dia_year.getDay(); //que día de la semana es en número, domingo 0, lunes 1, martes 2....
  
  var diaAjuste = (dia_semana <= 4 ? 1 - dia_semana : 8 - dia_semana); //para saber cuántos días faltan para el´próximo lunes, tomando referencia miercoles para atraso o adelanto
  primer_dia_year.setDate(primer_dia_year.getDate() + diaAjuste);
 
  var diferenciaTiempo = fecha - primer_dia_year;
  var semanas = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24 * 7)); // Convertimos a semanas

  return semanas;
}

function intervalos_lineas(linea, familia, horas) {
  
  let max_valor;
  let horas_procesadas;
  
  if (linea === 'JD C&F') {
    max_valor = 6000;
    if (horas % 6000 == 0){
      horas_procesadas = 6000;
    }else{
      horas_procesadas = horas - max_valor * Math.floor(horas / max_valor);
    }
  } else if (linea === 'JD A&T' && !["COSECHADORA","CARGADORA DE CAÑA","PULVERIZADORA","PULVERIZADOR"].includes(familia)) {
    if (horas <= 100){
      horas_procesadas = 100;
    } else {
        //horas_procesadas_xd = Math.floor((horas)/ 300)*300 + 100;
        horas_procesadas = 400 + 300 * (Math.floor((horas-400)/300)%8)
      }
  } else {
    max_valor = 6000;
    if (horas <= 100){
      horas_procesadas = 100;
    } else if (horas % 6000 == 0){
      horas_procesadas = 6000;
    }else{
      horas_procesadas = horas - max_valor * Math.floor(horas / max_valor);
    }
  }

  return horas_procesadas;
}


//hora_ultima_llamada

function test_intervalos_lineas(){
  console.log("JD C&F 250:", intervalos_lineas("JD C&F", "CARGADOR", 24000));
  console.log("COSECHADORA 100:", intervalos_lineas("JD A&T", "COSECHADORA", 6250)); 
  console.log("JD A&T 100:", intervalos_lineas("JD A&T", "TRACTOR", 11800)); 

}



function calcularProximoMto(linea, familia, horas) {
  const EXC_AT = new Set(["COSECHADORA", "CARGADORA DE CAÑA", "PULVERIZADORA", "PULVERIZADOR"]);

  // 🔹 Configuración base según tipo
  let inicio, fin, paso, ciclo;
  if (linea === "JD C&F") {
    [inicio, fin, paso, ciclo] = [250, 6000, 250, 6000];
  } else if (linea === "JD A&T" && EXC_AT.has(familia)) {
    [inicio, fin, paso, ciclo] = [100, 6000, 250, 6150]; // excepciones
  } else if (linea === "JD A&T") {
    [inicio, fin, paso, ciclo] = [100, 7300, 300, 7500]; // normales
  } else {
    console.log('otro')
  }

  // 🔹 Normalizamos horas dentro del ciclo
  const r = (horas % ciclo) || ciclo;

  // 🔹 Cálculo directo sin construir arrays
  if (r <= inicio) return inicio;

  const n = Math.ceil((r - inicio) / paso);
  const prox = inicio + n * paso;

  // 🔹 Si se pasa del final, reinicia
  return prox > fin ? inicio : prox;
}



function test_intervalos_prox(){
  console.log("JD C&F 250:", calcularProximoMto("JD C&F", "TRACTOR", 6000));
  console.log("COSECHADORA 100:", calcularProximoMto("JD A&T", "COSECHADORA", 6250)); 
  console.log("JD A&T 16000:", calcularProximoMto("JD A&T", "TRACTOR", 11600)); 
}





// Imagenes
// Configuración imágenes (cabecera y pie desde Drive)
const IMG_CABECERA_ID = "11x7SRRYm-lmZsEAGTS1AB3yMerLYEVq1";
const IMG_PIE_ID      = "1JxcYdB7ZFHZi1CGk5SgVtoB6ir74rnbF";
const IMG_PAQUETE_AD = "1cTwLrbF8lVtslGnz50cIac7drcHbAFF7";
const IMG_RECONEXION_AD = "1uErtJNjoAAok4saAJpgbMjEsVWFauW_j";

/**
 * 📦 VERSIÓN CACHEADA - Cache de imágenes en memoria por ejecución
 * Las imágenes se cargan una sola vez y se reutilizan
 * Reduce tiempo de acceso a Drive significativamente
 */
function getInlineImagesCached(keys) {
  // Cache en memoria global (dura toda la ejecución del script)
  if (!globalThis._IMAGE_CACHE) {
    globalThis._IMAGE_CACHE = {};
  }

  const cacheKey = keys ? keys.sort().join('_') : 'ALL';

  // Si ya está en cache, retornar inmediatamente
  if (globalThis._IMAGE_CACHE[cacheKey]) {
    Logger.log(`📦 Imágenes cargadas desde cache (${cacheKey})`);
    return globalThis._IMAGE_CACHE[cacheKey];
  }

  // Si no está en cache, cargar
  Logger.log(`🖼️ Cargando imágenes desde Drive (${cacheKey})...`);
  const startTime = Date.now();

  const allImages = {};

  // Cargar solo las imágenes necesarias según las claves
  const keysToLoad = keys && keys.length > 0 ? keys : ['cabecera', 'pie', 'paquete', 'reconexion'];

  keysToLoad.forEach(key => {
    try {
      switch(key) {
        case 'cabecera':
          allImages.cabecera = DriveApp.getFileById(IMG_CABECERA_ID).getBlob();
          break;
        case 'pie':
          allImages.pie = DriveApp.getFileById(IMG_PIE_ID).getBlob();
          break;
        case 'paquete':
          allImages.paquete = DriveApp.getFileById(IMG_PAQUETE_AD).getBlob();
          break;
        case 'reconexion':
          allImages.reconexion = DriveApp.getFileById(IMG_RECONEXION_AD).getBlob();
          break;
      }
    } catch (e) {
      Logger.log(`⚠️ Error cargando imagen ${key}: ${e.message}`);
    }
  });

  const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
  Logger.log(`✅ Imágenes cargadas en ${loadTime}s`);

  // Guardar en cache
  globalThis._IMAGE_CACHE[cacheKey] = allImages;

  return allImages;
}

/**
 * 🔧 Función original (mantener por compatibilidad)
 * Recomendado: migrar a getInlineImagesCached()
 */
function getInlineImages(keys) {
  // Diccionario de todas las imágenes disponibles
  const allImages = {
    cabecera: DriveApp.getFileById(IMG_CABECERA_ID).getBlob(),
    pie: DriveApp.getFileById(IMG_PIE_ID).getBlob(),
    paquete: DriveApp.getFileById(IMG_PAQUETE_AD).getBlob(),
    reconexion: DriveApp.getFileById(IMG_RECONEXION_AD).getBlob()
  };

  // Si no se pasan parámetros → devuelve todas
  if (!keys || keys.length === 0) {
    return allImages;
  }

  // Construye un objeto solo con las claves solicitadas
  const selectedImages = {};
  keys.forEach(key => {
    if (allImages[key]) {
      selectedImages[key] = allImages[key];
    }
  });

  return selectedImages;
}

/**
 * 🗑️ Limpia el cache de imágenes manualmente
 */
function limpiarCacheImagenes() {
  if (globalThis._IMAGE_CACHE) {
    globalThis._IMAGE_CACHE = {};
    Logger.log("🗑️ Cache de imágenes limpiado");
  }
}


/**
 * Une los grupos de mantenimiento y reconexión por cliente
 * para construir un solo conjunto de clientes consolidados.
 */
function mergeGruposPorCliente(gruposMto, gruposReco) {
  const mapa = new Map();

  // 🔹 Mantenimiento
  (gruposMto || []).forEach(g => {
    mapa.set(g.cliente, {
      ...g,
      maquinas_mto: g.maquinas,
      maquinas_reco: []
    });
  });

  // 🔹 Reconexión
  (gruposReco || []).forEach(g => {
    const existente = mapa.get(g.cliente);
    if (existente) {
      existente.maquinas_reco = g.maquinas;
      existente.total_maquinas += g.maquinas.length;
    } else {
      mapa.set(g.cliente, {
        ...g,
        maquinas_mto: [],
        maquinas_reco: g.maquinas
      });
    }
  });

  return Array.from(mapa.values());
}

// Helper para normalizar texto (sin tildes, todo mayúsculas)
function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

//poner hora equivalente por mientras hasta tener potencial en los logs

function aplicarIntervalosLineasEnReporte() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REPORTE');
  
  if (!sheet) {
    console.error('Hoja "REPORTE" no encontrada');
    return;
  }
  
  // Obtener todos los datos de la hoja
  const datos = sheet.getDataRange().getValues();
  const encabezados = datos[0];
  
  // Definir índices de las columnas según tu estructura
  const colLinea = 8; // Columna I (índice 8, A=0, B=1, ..., I=8)
  const colFamilia = 9; // Columna J (índice 9)
  const colHoras = 3; // Columna D (índice 3)
  const colResultado = 10; // Columna M (índice 12)
  
  // Array para almacenar los resultados
  const resultados = [];
  
  // Procesar cada fila (empezando desde la fila 2, ya que fila 1 son encabezados)
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const linea = fila[colLinea];
    const familia = fila[colFamilia];
    const horas = fila[colHoras];
    
    // Validar que los datos existan
    if (linea && familia && horas !== undefined && horas !== null && horas !== '') {
      // Aplicar la función intervalos_lineas
      const horasProcesadas = intervalos_lineas(linea, familia, horas);
      resultados.push([horasProcesadas]);
    } else {
      // Si faltan datos, poner celda vacía
      resultados.push(['']);
    }
  }
  
  // Escribir los resultados en la columna M
  if (resultados.length > 0) {
    sheet.getRange(2, colResultado + 1, resultados.length, 1).setValues(resultados);
    console.log(`Se procesaron ${resultados.length} filas en la columna M`);
  }
}

//ID
function uuidId(size = 10, prefix = '') {
  const raw = Utilities.getUuid().replace(/-/g, '').toUpperCase(); 
  const core = raw.slice(0, size); 
  return prefix ? `${prefix}-${core}` : core;
}

const APP_PREFIX = 'OPM';

function getNewId() {
  return uuidId(10, APP_PREFIX); 
}

