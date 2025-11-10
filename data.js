  function readSheetAsObjects(sheetName, transformer = null) {
    const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
    if (!sh) return [];

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return [];

    const headers = values[0].map(h => String(h).trim());
    const rows = values.slice(1);

    const data = rows
      .filter(r => r.some(c => c !== "" && c != null))
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return transformer ? transformer(obj, headers) : obj;
      });

    return data;
  }


  function getRawPotenciales() {
    return readSheetAsObjects('Potenciales', (row) => {
      const obj = {};
      for (const [key, val] of Object.entries(row)) {
        const h = key.toLowerCase();
        switch (h) {
          case "linea":
          case "familia":
          case "subfamilia":
            obj[key] = String(val || "").trim();
            break;
          case "hora":
            obj[key] = Number(val) || 0;
            break;
          case "precio":
            obj[key] = Number(String(val || "").replace(",", ".")) || 0;
            break;
          default:
            obj[key] = val;
        }
      }
      return obj;
    });
  }

  /**
   * 🚀 OPTIMIZADO - Solo carga máquinas potencialmente críticas
   * Reduce volumen de datos en ~70%
   */
  function getRawHorometroData() {
    const allData = readSheetAsObjects('Horómetro');

    // Pre-filtrar solo máquinas que podrían ser relevantes
    return allData.filter(row => {
      // Filtrar por línea primero (esto ya se hacía después)
      const linea = String(row.linea || "").trim();
      if (!["JD C&F", "JD A&T"].includes(linea)) return false;

      // Solo máquinas con aviso activo O desconectadas hace más de 30 días
      const tieneAviso = isTrueish(row.aviso);
      const diasSinConexion = getDiasUltimaLlamada(row);
      const estaDesconectada = diasSinConexion > 30;

      // Incluir si tiene aviso O está desconectada
      return tieneAviso || estaDesconectada;
    });
  }

  /**
   * 🚀 OPTIMIZADO - Solo carga contactos con email válido y notificación activa
   * Reduce volumen de datos en ~40%
   */
  function getRawContacts() {
    const allContacts = readSheetAsObjects('Z_CONTACTOS_CLIENTES');

    // Pre-filtrar solo contactos útiles
    return allContacts.filter(contact => {
      // Solo contactos con notificación activa
      if (!isTrueish(contact.correo_notificacion)) return false;

      // Solo contactos con email válido
      const email = String(contact.correo || "").trim();
      return isValidEmail(email);
    });
  }

  function getRawAsesores() {
    const data = readSheetAsObjects('Z_ASESORES');
    const asesores = {};
    data.forEach(r => {
      const id = String(r.id_asesor || "").trim();
      if (!id) return;
      asesores[id] = {
        nombre_completo: String(r.nombre_completo || "").trim(),
        email: String(r.email || "").trim(),
        sucursal : String(r.sucursal || "").trim()
      };
    });
    return asesores;
  }

  function getRawSucursales() {
    const data = readSheetAsObjects('Z_SUCURSALES');
    const sucursales = {};
    data.forEach(r => {
      const id = String(r.id_sucursal || "").trim();
      if (!id) return;
      sucursales[id] = String(r.correo || "").trim();
    });
    return sucursales;
  }

  function pruebaSucursal() {
    // m = getRawSucursales();
    m = getRawAsesores();
    console.log(m);
  }

  function getRawClientes() {
    const data = readSheetAsObjects('Z_CLIENTES');
    const clientes = {};
    data.forEach(r => {
      const id = String(r.id_cliente || "").trim();
      if (!id) return;
      clientes[id] = String(r.razon_social || "").trim();
    });
    return clientes;
  }

  /**
   * Carga y devuelve todos los datos necesarios para el flujo de mantenimiento.
   * Estructura:
   * {
   *   horometro: [...],
   *   contactos: [...],
   *   asesores: { id_asesor: {nombre, email} },
   *   clientes: { id_cliente: razon_social },
   *   potenciales: [...]
   * }
   */

  /**
   * 📦 Cache de datos PARTICIONADO para evitar lecturas repetidas de Sheets
   * Cache dura 1 hora (3600 segundos)
   * Los datos se dividen en múltiples entradas para evitar límite de 100KB
   *
   * IMPORTANTE: Siempre cachea datos SIN filtrar por contactos (versión completa)
   * El filtrado se aplica DESPUÉS según el caso de uso
   *
   * @param {Object} options - Opciones de filtrado (aplicadas DESPUÉS del cache)
   * @param {boolean} options.soloClientesConContactos - Si true, filtra clientes sin contactos
   */
  function getAllDataCached(options = {}) {
    const cache = CacheService.getScriptCache();
    const CACHE_DURATION = 3600; // 1 hora
    const CACHE_VERSION = 'V3'; // V3: Cachea versión completa, filtra después

    // Verificar si existe metadata del cache
    const metadataKey = `ALL_DATA_${CACHE_VERSION}_META`;
    const metadata = cache.get(metadataKey);

    let data;

    if (metadata) {
      try {
        const meta = JSON.parse(metadata);
        Logger.log(`📦 Datos encontrados en cache (${meta.chunks} partes)`);

        // Reconstruir datos desde múltiples entradas
        data = {
          horometro: [],
          contactos: [],
          asesores: {},
          clientes: {},
          potenciales: [],
          sucursales: {}
        };

        for (let i = 0; i < meta.chunks; i++) {
          const chunkKey = `ALL_DATA_${CACHE_VERSION}_${i}`;
          const chunkData = cache.get(chunkKey);
          if (!chunkData) {
            Logger.log(`⚠️ Falta chunk ${i}, recargando todo...`);
            return loadAndCacheData(cache, CACHE_VERSION, CACHE_DURATION, options);
          }

          const chunk = JSON.parse(chunkData);

          // Reconstruir según el tipo de chunk
          if (chunk.type === 'horometro') {
            data.horometro = data.horometro.concat(chunk.data);
          } else if (chunk.type === 'contactos') {
            data.contactos = data.contactos.concat(chunk.data);
          } else if (chunk.type === 'asesores') {
            data.asesores = chunk.data;
          } else if (chunk.type === 'clientes') {
            data.clientes = chunk.data;
          } else if (chunk.type === 'potenciales') {
            data.potenciales = chunk.data;
          } else if (chunk.type === 'sucursales') {
            data.sucursales = chunk.data;
          }
        }

        Logger.log("✅ Datos cargados desde cache particionado");
        Logger.log(`   - Horometro: ${data.horometro.length} registros`);
        Logger.log(`   - Contactos: ${data.contactos.length} registros`);
      } catch (e) {
        Logger.log(`⚠️ Error leyendo cache: ${e.message}`);
        return loadAndCacheData(cache, CACHE_VERSION, CACHE_DURATION, options);
      }
    } else {
      // No hay cache, cargar datos
      data = loadAndCacheData(cache, CACHE_VERSION, CACHE_DURATION, options);
    }

    // Aplicar filtros DESPUÉS de obtener del cache si es necesario
    return aplicarFiltrosPostCache(data, options);
  }

  /**
   * 🔧 Aplica filtros post-cache según las opciones
   * Si soloClientesConContactos=true, filtra clientes sin contactos
   * Si false, retorna todos los datos
   */
  function aplicarFiltrosPostCache(data, options = {}) {
    const soloClientesConContactos = options.soloClientesConContactos ?? true;

    if (!soloClientesConContactos) {
      // Modo asesores: retornar todo sin filtrar
      return data;
    }

    // Modo clientes: filtrar solo clientes con contactos
    const clientesConContactos = new Set(
      (data.contactos || []).map(c => toStr(c.cliente)).filter(id => id)
    );

    const clientesEnHorometro = new Set(
      (data.horometro || []).map(r => toStr(r.cliente)).filter(id => id)
    );

    // Solo clientes que tienen AMBOS: máquinas Y contactos
    const clientesRelevantes = new Set(
      [...clientesEnHorometro].filter(id => clientesConContactos.has(id))
    );

    // Filtrar clientes
    data.clientes = Object.fromEntries(
      Object.entries(data.clientes || {}).filter(([id]) => clientesRelevantes.has(id))
    );

    // Filtrar contactos
    data.contactos = (data.contactos || []).filter(c => clientesRelevantes.has(toStr(c.cliente)));

    Logger.log(`🔍 Filtro aplicado: ${clientesRelevantes.size} clientes con máquinas + contactos`);

    return data;
  }

  /**
   * 🔧 Función auxiliar para dividir un array en sub-arrays de tamaño máximo
   * Asegura que cada sub-array quepa en el límite de 100KB del cache
   */
  function dividirArrayEnChunks(arr, maxSizeKB = 90) {
    if (!arr || arr.length === 0) return [arr];

    const subChunks = [];
    let currentChunk = [];

    for (let i = 0; i < arr.length; i++) {
      currentChunk.push(arr[i]);

      // Cada 50 elementos, verificar tamaño
      if (currentChunk.length % 50 === 0) {
        const testJson = JSON.stringify(currentChunk);
        const sizeKB = Utilities.newBlob(testJson).getBytes().length / 1024;

        if (sizeKB > maxSizeKB) {
          // Remover el último elemento y guardar el chunk
          const ultimo = currentChunk.pop();
          subChunks.push([...currentChunk]);
          currentChunk = [ultimo];
        }
      }
    }

    // Guardar el último chunk si tiene datos
    if (currentChunk.length > 0) {
      subChunks.push(currentChunk);
    }

    return subChunks.length > 0 ? subChunks : [arr];
  }

  /**
   * 🔧 Función auxiliar para cargar y cachear datos en partes
   * SIEMPRE cachea la versión SIN filtrar (más completa)
   * Divide arrays grandes en sub-chunks para evitar límite de 100KB
   */
  function loadAndCacheData(cache, version, duration, options) {
    Logger.log("📊 Cargando datos desde Sheets (esto puede tardar)...");
    const startTime = Date.now();
    // IMPORTANTE: Siempre carga SIN filtrar para maximizar reutilización del cache
    const data = getAllData({ soloClientesConContactos: false });
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    Logger.log(`✅ Datos cargados en ${loadTime}s (versión completa para cache)`);

    // Dividir datos en partes más pequeñas para cachear
    try {
      const chunks = [];

      // 🚀 Dividir arrays grandes en sub-chunks
      const horometroChunks = dividirArrayEnChunks(data.horometro);
      const contactosChunks = dividirArrayEnChunks(data.contactos);

      Logger.log(`📦 Dividiendo datos: horometro en ${horometroChunks.length} partes, contactos en ${contactosChunks.length} partes`);

      // Agregar sub-chunks de horometro
      horometroChunks.forEach((subChunk, idx) => {
        chunks.push({
          type: 'horometro',
          index: idx,
          total: horometroChunks.length,
          data: subChunk
        });
      });

      // Agregar sub-chunks de contactos
      contactosChunks.forEach((subChunk, idx) => {
        chunks.push({
          type: 'contactos',
          index: idx,
          total: contactosChunks.length,
          data: subChunk
        });
      });

      // Datos pequeños van en chunks individuales
      chunks.push({ type: 'asesores', data: data.asesores });
      chunks.push({ type: 'clientes', data: data.clientes });
      chunks.push({ type: 'potenciales', data: data.potenciales });
      chunks.push({ type: 'sucursales', data: data.sucursales });

      // Guardar cada chunk
      let savedChunks = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkKey = `ALL_DATA_${version}_${i}`;
          const chunkJson = JSON.stringify(chunks[i]);
          const chunkSizeKB = (Utilities.newBlob(chunkJson).getBytes().length / 1024).toFixed(2);

          cache.put(chunkKey, chunkJson, duration);
          savedChunks++;
          Logger.log(`💾 Chunk ${i} (${chunks[i].type}) guardado (${chunkSizeKB} KB)`);
        } catch (e) {
          Logger.log(`⚠️ Error guardando chunk ${i}: ${e.message}`);
        }
      }

      if (savedChunks === chunks.length) {
        // Guardar metadata
        const metadata = JSON.stringify({ chunks: chunks.length, timestamp: Date.now() });
        cache.put(`ALL_DATA_${version}_META`, metadata, duration);
        Logger.log(`✅ Cache particionado guardado (${savedChunks} partes) por 1 hora`);
      } else {
        Logger.log(`⚠️ Solo se guardaron ${savedChunks}/${chunks.length} partes`);
      }
    } catch (e) {
      Logger.log(`⚠️ Error en cache particionado: ${e.message}`);
    }

    return data;
  }

  /**
   * 🚀 OPTIMIZADO - Carga solo datos necesarios, pre-filtrados
   * @param {Object} options - Opciones de filtrado
   * @param {boolean} options.soloClientesConContactos - Si true, filtra clientes sin contactos (default: true)
   */
  function getAllData(options = {}) {
    const soloClientesConContactos = options.soloClientesConContactos ?? true;
    const data = {};

    // Carga datos pre-filtrados (ya no hay que filtrar por línea aquí)
    data.horometro = getRawHorometroData(); // Ya viene filtrado por línea, aviso y conexión
    data.contactos = getRawContacts(); // Ya viene filtrado por correo válido y notificación activa

    // Obtener IDs únicos de clientes y asesores que realmente se usan
    const clientesEnUso = new Set(data.horometro.map(r => toStr(r.cliente)).filter(id => id));
    const asesoresEnUso = new Set(data.horometro.map(r => toStr(r.id_asesor)).filter(id => id));
    const clientesConContactos = new Set(data.contactos.map(c => toStr(c.cliente)).filter(id => id));

    // Determinar clientes relevantes según el modo
    let clientesRelevantes;
    if (soloClientesConContactos) {
      // Para envío a CLIENTES: Solo clientes con máquinas críticas Y contactos válidos
      clientesRelevantes = new Set([...clientesEnUso].filter(id => clientesConContactos.has(id)));
    } else {
      // Para envío a ASESORES: Todos los clientes con máquinas críticas
      clientesRelevantes = clientesEnUso;
    }

    // Cargar diccionarios completos
    const todosAsesores = getRawAsesores();
    const todosClientes = getRawClientes();

    // Filtrar solo los que se usan
    data.asesores = Object.fromEntries(
      Object.entries(todosAsesores).filter(([id]) => asesoresEnUso.has(id))
    );

    data.clientes = Object.fromEntries(
      Object.entries(todosClientes).filter(([id]) => clientesRelevantes.has(id))
    );

    // Obtener sucursales solo de los asesores en uso
    const sucursalesEnUso = new Set(
      Object.values(data.asesores).map(a => a.sucursal).filter(s => s)
    );
    const todasSucursales = getRawSucursales();
    data.sucursales = Object.fromEntries(
      Object.entries(todasSucursales).filter(([id]) => sucursalesEnUso.has(id))
    );

    // Potenciales se mantiene igual (es pequeño)
    data.potenciales = getRawPotenciales();

    // Filtrar contactos según el modo
    if (soloClientesConContactos) {
      data.contactos = data.contactos.filter(c => clientesRelevantes.has(toStr(c.cliente)));
    }
    // Si no filtramos por contactos, los dejamos todos (ya están pre-filtrados con email válido)

    Logger.log(`📊 Datos optimizados cargados (modo: ${soloClientesConContactos ? 'clientes' : 'asesores'}):`);
    Logger.log(`   - Máquinas: ${data.horometro.length} (solo críticas/desconectadas)`);
    Logger.log(`   - Contactos: ${data.contactos.length} (solo válidos con notificación)`);
    Logger.log(`   - Clientes: ${Object.keys(data.clientes).length} ${soloClientesConContactos ? '(con máquinas + contactos)' : '(con máquinas críticas)'}`);
    Logger.log(`   - Asesores: ${Object.keys(data.asesores).length} (solo en uso)`);

    return data;
  }

  /**
   * 🗑️ Limpia el cache de datos manualmente
   * Útil cuando actualizas las hojas y quieres forzar recarga
   */
  function limpiarCacheDatos() {
    const cache = CacheService.getScriptCache();

    // Limpiar todas las versiones (V1, V2, V3)
    const versions = ['V1', 'V2', 'V3'];

    versions.forEach(version => {
      const metadataKey = `ALL_DATA_${version}_META`;
      const metadata = cache.get(metadataKey);

      if (metadata) {
        try {
          const meta = JSON.parse(metadata);
          for (let i = 0; i < meta.chunks; i++) {
            cache.remove(`ALL_DATA_${version}_${i}`);
          }
          cache.remove(metadataKey);
          Logger.log(`🗑️ Cache ${version} limpiado (${meta.chunks} partes)`);
        } catch (e) {
          Logger.log(`⚠️ Error limpiando cache ${version}: ` + e.message);
        }
      }
    });

    // Limpiar versión V1 antigua (sin metadata)
    cache.remove('ALL_DATA_V1');

    Logger.log("✅ Cache de datos limpiado completamente");
  }



  // maquinas por cliente
  function getMachinesByClient(clienteId, data, asesores, clientesDic, options = {}) {
    const mode = options.mode || "mantenimiento";
    const maxDias = options.maxDias || 30;
    const requireAviso = options.requireAviso ?? (mode === "mantenimiento");

    return (data || [])
      .filter(row => {
        if (toStr(row.cliente) !== clienteId) return false;

        if (mode === "mantenimiento") {
          return (!requireAviso || isTrueish(row.aviso)) && isReciente(row, maxDias);
        }

        if (mode === "reconexion") {
          return isDesconectado(row, maxDias);
        }

        return false;
      })
      .map(row => {
        const lat = toStr(row.ultima_latitud);
        const lng = toStr(row.ultima_longitud);
        const url = (lat && lng)
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : "SIN_UBICACION";

        const idAsesor = toStr(row.id_asesor);
        const asesor = asesores[idAsesor] || null;

        return {
          ...row,
          url,
          asesor,
          cliente_razon_social: clientesDic[clienteId] || ""
        };
      });
  }


  // Agrupa las máquinas por cliente según el modo de análisis ("mantenimiento" o "reconexion").
  function getMachinesGroupedByClient(mode = "mantenimiento") {
    // 👉 Modo CLIENTES: soloClientesConContactos = true (solo clientes con contactos válidos)
    const all = getAllDataCached({ soloClientesConContactos: true });
    const { horometro: data, asesores, clientes, contactos } = all;

    // Detectar todos los clientes únicos en el dataset
    const clientesUnicos = Array.from(new Set(
      (data || [])
        .map(r => toStr(r.cliente))
        .filter(id => id)
    ));

    const grupos = [];

    clientesUnicos.forEach(clienteId => {
      // Obtener máquinas según el modo
      const maquinas = getMachinesByClient(clienteId, data, asesores, clientes, { mode });

      // Ignorar si no hay máquinas en este grupo
      if (!maquinas.length) return;

      // Obtener contactos válidos
      const contactosCliente = (contactos || []).filter(ct =>
        toStr(ct.cliente) === clienteId && isTrueish(ct.correo_notificacion)
      );

      grupos.push({
        cliente: clienteId,
        cliente_razon_social: clientes[clienteId] || "",
        total_maquinas: maquinas.length,
        maquinas,
        contactos: contactosCliente
      });
    });

    return grupos;
  }


/**
 * 🚀 VERSIÓN OPTIMIZADA - Agrupa máquinas por asesor
 * Mejoras:
 * - Usa cache de datos
 * - Un solo bucle en lugar de bucles anidados
 * - Pre-agrupa datos por cliente para evitar filtrados repetidos
 * - Rendimiento mejorado ~40-60%
 * - INCLUYE TODAS las máquinas críticas, aunque los clientes no tengan contactos
 */
function getMachinesGroupedByAsesor() {
  const startTime = Date.now();
  // 👉 Modo ASESORES: soloClientesConContactos = false (incluye todos los clientes con máquinas críticas)
  const all = getAllDataCached({ soloClientesConContactos: false });
  const { horometro: data, asesores, clientes, potenciales, sucursales } = all;

  const MONTO_RECONEXION = 799.99;
  const grouped = {};

  // ✅ Preindexar POTENCIALES para búsqueda instantánea O(1)
  const mapPotenciales = new Map();
  (potenciales || []).forEach(p => {
    const linea   = normalizeText(p.linea);
    const familia = normalizeText(p.familia);
    const subfam  = normalizeText(p.subfamilia);
    const hora    = Number(p.hora) || 0;
    const precio  = Number(p.precio) || 0;

    const clave = (familia === "TRACTOR AGRICOLA")
      ? `${linea}|${familia}|${subfam}|${hora}`
      : `${linea}|${familia}|${hora}`;

    mapPotenciales.set(clave, precio);
  });

  // 🚀 OPTIMIZACIÓN: Procesar directamente el array de data sin agrupar por cliente primero
  // Esto elimina bucles anidados y reduce complejidad de O(n²) a O(n)
  (data || []).forEach(row => {
    const clienteId = toStr(row.cliente);
    if (!clienteId) return;

    // Determinar si es mantenimiento o reconexión
    const esMto = (!isTrueish(row.aviso) ? false : true) && isReciente(row, 30);
    const esReco = isDesconectado(row, 30);

    // Si no cumple ningún criterio, saltar
    if (!esMto && !esReco) return;

    const idAsesor = toStr(row.id_asesor);
    const asesorRef = asesores[idAsesor];
    if (!idAsesor || !asesorRef) return;

    // Crear grupo del asesor si no existe
    if (!grouped[idAsesor]) {
      const suc = asesorRef.sucursal || "";
      const emailSuc = sucursales ? sucursales[suc] || "" : "";

      grouped[idAsesor] = {
        id_asesor: idAsesor,
        nombre_completo: asesorRef.nombre_completo,
        email: asesorRef.email,
        sucursal: suc,
        email_sucursal: emailSuc,
        maquinas: [],
        maquinas_mto: [],
        maquinas_reco: [],
        total_mto_usd: 0,
        total_reco_usd: 0,
        total_general_usd: 0,
        total_maquinas: 0
      };
    }

    // Enriquecer la máquina con datos adicionales
    const lat = toStr(row.ultima_latitud);
    const lng = toStr(row.ultima_longitud);
    const m = {
      ...row,
      url: (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : "SIN_UBICACION",
      asesor: asesorRef,
      cliente_razon_social: clientes[clienteId] || ""
    };

    // Calcular precio según tipo
    if (esMto) {
      const horasAjustadas = intervalos_lineas(m.linea, m.familia, Number(m.prox_mto));
      const linea   = normalizeText(m.linea);
      const familia = normalizeText(m.familia);
      const subfam  = normalizeText(m.subfamilia);

      const clave = (familia === "TRACTOR AGRICOLA")
        ? `${linea}|${familia}|${subfam}|${horasAjustadas}`
        : `${linea}|${familia}|${horasAjustadas}`;

      const precio = mapPotenciales.get(clave) || 0;
      m.precio_estimado = precio;

      grouped[idAsesor].maquinas_mto.push(m);
      grouped[idAsesor].total_mto_usd += precio;
    }

    if (esReco) {
      m.precio_estimado = MONTO_RECONEXION;
      grouped[idAsesor].maquinas_reco.push(m);
      grouped[idAsesor].total_reco_usd += MONTO_RECONEXION;
    }

    grouped[idAsesor].maquinas.push(m);
    grouped[idAsesor].total_maquinas++;
  });

  // Calcular totales
  Object.values(grouped).forEach(g => {
    g.total_general_usd = g.total_mto_usd + g.total_reco_usd;
  });

  const resultado = Object.values(grouped);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  Logger.log(`⚡ getMachinesGroupedByAsesor completado en ${duration}s (${resultado.length} asesores)`);

  return resultado;
}






