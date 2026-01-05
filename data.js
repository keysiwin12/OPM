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

    // 🚫 Lista de clientes excluidos del sistema OPM
    const CLIENTES_EXCLUIDOS = new Set([
      '20285093245',
      '20537284723',
      '20602200826',
      'CGM Usados'
    ]);

    // Pre-filtrar solo máquinas que podrían ser relevantes
    return allData.filter(row => {
      // 🚫 Excluir clientes específicos
      const idCliente = String(row.cliente || "").trim();
      if (CLIENTES_EXCLUIDOS.has(idCliente)) {
        return false;
      }

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

  /**
   * 📋 NUEVO - Carga la relación Cliente → Asesor desde hoja CARTERA
   * @returns {Array} Array de objetos {id_cliente, id_asesor}
   */
  function getRawCartera() {
    const data = readSheetAsObjects('CARTERA');

    if (!data || data.length === 0) {
      Logger.log("⚠️ Hoja CARTERA vacía o no encontrada");
      return [];
    }

    // Limpiar y validar datos
    const carteraLimpia = data
      .filter(row => {
        const cliente = String(row.id_cliente || "").trim();
        const asesor = String(row.id_asesor || "").trim();
        return cliente && asesor; // Ambos deben existir
      })
      .map(row => ({
        id_cliente: String(row.id_cliente || "").trim(),
        id_asesor: String(row.id_asesor || "").trim()
      }));

    Logger.log(`📋 CARTERA cargada: ${carteraLimpia.length} relaciones cliente-asesor`);

    return carteraLimpia;
  }

  /**
   * 📋 NUEVO - Carga la relación Equipo → Sucursal Cercana desde hoja Z_EQUIPOS
   * @returns {Map} Map<num_serie, sucursal_cercana> para lookup O(1)
   */
  function getRawEquipos() {
    const data = readSheetAsObjects('Z_EQUIPOS');

    if (!data || data.length === 0) {
      Logger.log("⚠️ Hoja Z_EQUIPOS vacía o no encontrada");
      return new Map();
    }

    const equiposMap = new Map();

    data.forEach(row => {
      const numSerie = String(row.ID_EQUIPO || "").trim();
      const sucursalCercana = String(row.SUCURSAL_CERCANA || "").trim();

      if (numSerie) {
        // Guardar sucursal cercana (puede ser vacío)
        equiposMap.set(numSerie, sucursalCercana);
      }
    });

    Logger.log(`🏭 Z_EQUIPOS cargada: ${equiposMap.size} equipos con sucursal cercana`);

    return equiposMap;
  }

  function getRawAsesores() {
    const data = readSheetAsObjects('Z_ASESORES');
    const asesores = {};
    let totalAsesores = 0;
    let asesoresServicios = 0;

    data.forEach(r => {
      const id = String(r.id_asesor || "").trim();
      if (!id) return;

      totalAsesores++;

      // 🔍 Filtrar solo asesores del área "Servicios"
      const area = String(r.Área || r.Area || "").trim();
      if (area !== "Servicios") {
        return; // Saltar asesores que no son de Servicios
      }

      asesoresServicios++;

      asesores[id] = {
        nombre_completo: String(r.nombre_completo || "").trim(),
        email: String(r.email || "").trim(),
        sucursal : String(r.sucursal || "").trim(),
        area: area // Guardar área para referencia
      };
    });

    Logger.log(`👥 Asesores cargados: ${asesoresServicios} de Servicios (${totalAsesores} totales)`);

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
          sucursales: {},
          cartera: [] // 🆕 Incluir CARTERA
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
          } else if (chunk.type === 'cartera') { // 🆕 Reconstruir CARTERA
            data.cartera = data.cartera.concat(chunk.data);
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
   * 🔧 NUEVO - Crea un Map de Cliente → [Asesores] desde CARTERA
   * Permite búsqueda rápida O(1) de los asesores de un cliente
   * @param {Array} carteraArray - Array de {id_cliente, id_asesor}
   * @returns {Map} Map<id_cliente, Array<id_asesor>>
   */
  function crearMapaCartera(carteraArray) {
    const mapa = new Map();

    if (!carteraArray || carteraArray.length === 0) {
      return mapa;
    }

    carteraArray.forEach(row => {
      const cliente = row.id_cliente;
      const asesor = row.id_asesor;

      if (!mapa.has(cliente)) {
        mapa.set(cliente, []);
      }

      // Evitar duplicados: solo agregar si no existe
      if (!mapa.get(cliente).includes(asesor)) {
        mapa.get(cliente).push(asesor);
      }
    });

    // Logs informativos
    const clientesUnicos = mapa.size;
    const asesoresUnicos = new Set(carteraArray.map(r => r.id_asesor)).size;
    Logger.log(`📊 Map CARTERA creado: ${clientesUnicos} clientes, ${asesoresUnicos} asesores únicos`);

    return mapa;
  }

  /**
   * 🔧 NUEVO - Enriquece cada máquina con sus asesores desde CARTERA
   * Agrega campo 'asesores' (array) a cada máquina
   * @param {Array} horometro - Array de máquinas
   * @param {Map} carteraMap - Map de cliente → asesores
   * @returns {Array} Horometro enriquecido
   */
  function enriquecerMaquinasConAsesores(horometro, carteraMap) {
    if (!horometro || horometro.length === 0) {
      return horometro;
    }

    let conAsesor = 0;
    let sinAsesor = 0;

    horometro.forEach(maquina => {
      const idCliente = toStr(maquina.cliente);
      const asesores = carteraMap.get(idCliente) || [];

      // Agregar array de asesores a la máquina
      maquina.asesores = asesores;

      if (asesores.length > 0) {
        conAsesor++;
      } else {
        sinAsesor++;
        Logger.log(`⚠️ Cliente ${idCliente} sin asesor en CARTERA`);
      }
    });

    Logger.log(`✅ Máquinas enriquecidas: ${conAsesor} con asesor, ${sinAsesor} sin asesor`);

    return horometro;
  }

  /**
   * 🔧 NUEVO - Obtiene los asesores de un cliente desde CARTERA
   * @param {string} id_cliente - ID del cliente
   * @param {Object} data - Objeto con data.cartera
   * @returns {Array} Array de id_asesor
   */
  function obtenerAsesoresDelCliente(id_cliente, data) {
    if (!data.cartera || data.cartera.length === 0) {
      return [];
    }

    const asesores = data.cartera
      .filter(row => toStr(row.id_cliente) === toStr(id_cliente))
      .map(row => row.id_asesor);

    // Eliminar duplicados
    return [...new Set(asesores)];
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
   * Optimizado: usa longitud de string como estimación rápida (más rápido que Utilities.newBlob)
   */
  function dividirArrayEnChunks(arr, maxSizeKB = 85) {
    if (!arr || arr.length === 0) return [arr];

    const subChunks = [];
    let currentChunk = [];
    const maxBytes = maxSizeKB * 1024;

    for (let i = 0; i < arr.length; i++) {
      currentChunk.push(arr[i]);

      // Verificar cada 20 elementos o si ya tenemos 100+ elementos
      if (currentChunk.length % 20 === 0 || currentChunk.length >= 100) {
        const testJson = JSON.stringify(currentChunk);
        // Estimación rápida: length de string ≈ bytes (suficientemente preciso)
        const estimatedBytes = testJson.length;

        // Si excede el límite, guardar el chunk anterior y empezar uno nuevo
        if (estimatedBytes > maxBytes) {
          // Remover el último elemento y guardar el chunk
          const ultimo = currentChunk.pop();

          if (currentChunk.length > 0) {
            subChunks.push([...currentChunk]);
          }

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
      chunks.push({ type: 'cartera', data: data.cartera }); // 🆕 Cachear CARTERA

      // Guardar cada chunk (optimizado - sin calcular tamaño)
      let savedChunks = 0;
      Logger.log(`💾 Guardando ${chunks.length} chunks en cache...`);

      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkKey = `ALL_DATA_${version}_${i}`;
          const chunkJson = JSON.stringify(chunks[i]);

          cache.put(chunkKey, chunkJson, duration);
          savedChunks++;

          // Solo logear cada 5 chunks para no saturar logs
          if (i % 5 === 0 || i === chunks.length - 1) {
            Logger.log(`💾 Guardados ${savedChunks}/${chunks.length} chunks...`);
          }
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
    data.cartera = getRawCartera(); // 🆕 Carga relación cliente → asesor

    // 🆕 Crear Map de CARTERA y enriquecer máquinas con asesores
    const carteraMap = crearMapaCartera(data.cartera);
    enriquecerMaquinasConAsesores(data.horometro, carteraMap);

    // 🏭 Cargar Z_EQUIPOS y enriquecer máquinas con sucursal_cercana
    const equiposMap = getRawEquipos();
    data.horometro.forEach(maquina => {
      const numSerie = maquina.num_serie || "";
      // Si no existe en Z_EQUIPOS, se trata como sucursal vacía
      maquina.sucursal_cercana = equiposMap.get(numSerie) || "";
    });

    // Obtener IDs únicos de clientes que realmente se usan
    const clientesEnUso = new Set(data.horometro.map(r => toStr(r.cliente)).filter(id => id));
    const clientesConContactos = new Set(data.contactos.map(c => toStr(c.cliente)).filter(id => id));

    // 🆕 Obtener asesores desde el array asesores[] de cada máquina
    const asesoresEnUso = new Set();
    data.horometro.forEach(m => {
      if (m.asesores && Array.isArray(m.asesores)) {
        m.asesores.forEach(id_asesor => {
          if (id_asesor) asesoresEnUso.add(toStr(id_asesor));
        });
      }
    });

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
    Logger.log(`   - CARTERA: ${data.cartera.length} relaciones cliente-asesor`);

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
  // 🆕 CARTERA: Ahora cada máquina tiene array asesores[], puede aparecer en múltiples reportes
  (data || []).forEach(row => {
    const clienteId = toStr(row.cliente);
    if (!clienteId) return;

    // Determinar si es mantenimiento o reconexión
    const esMto = (!isTrueish(row.aviso) ? false : true) && isReciente(row, 30);
    const esReco = isDesconectado(row, 30);

    // Si no cumple ningún criterio, saltar
    if (!esMto && !esReco) return;

    // 🆕 Obtener array de asesores desde CARTERA (ya enriquecido por getAllData)
    const asesoresMaquina = row.asesores || [];

    // Si la máquina no tiene asesores asignados, saltarla
    if (asesoresMaquina.length === 0) {
      Logger.log(`⚠️ Máquina ${row.num_serie} sin asesor (cliente ${clienteId})`);
      return;
    }

    // 🆕 Iterar por CADA asesor de la máquina (puede ser múltiple)
    asesoresMaquina.forEach(idAsesor => {
      const idAsesorStr = toStr(idAsesor);
      const asesorRef = asesores[idAsesorStr];

      if (!idAsesorStr || !asesorRef) {
        Logger.log(`⚠️ Asesor ${idAsesorStr} no encontrado en diccionario`);
        return;
      }

      // 🏭 Filtrar por sucursal cercana
      const sucursalEquipo = (row.sucursal_cercana || "").trim().toUpperCase();
      const sucursalAsesor = (asesorRef.sucursal || "").trim().toUpperCase();

      // Si equipo tiene sucursal Y no coincide con la del asesor → SALTAR
      if (sucursalEquipo && sucursalEquipo !== sucursalAsesor) {
        Logger.log(`⚠️ Equipo ${row.num_serie} con sucursal ${sucursalEquipo} no va a asesor ${asesorRef.nombre_completo} (sucursal: ${sucursalAsesor})`);
        return; // Este asesor no recibe este equipo
      }

      // Si llegó aquí: sucursal vacía O coincide → continuar

      // Crear grupo del asesor si no existe
      if (!grouped[idAsesorStr]) {
        const suc = asesorRef.sucursal || "";
        const emailSuc = sucursales ? sucursales[suc] || "" : "";

        grouped[idAsesorStr] = {
          id_asesor: idAsesorStr,
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
        asesor: asesorRef, // Referencia al asesor actual del bucle
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

        grouped[idAsesorStr].maquinas_mto.push(m);
        grouped[idAsesorStr].total_mto_usd += precio;
      }

      if (esReco) {
        m.precio_estimado = MONTO_RECONEXION;
        grouped[idAsesorStr].maquinas_reco.push(m);
        grouped[idAsesorStr].total_reco_usd += MONTO_RECONEXION;
      }

      grouped[idAsesorStr].maquinas.push(m);
      grouped[idAsesorStr].total_maquinas++;
    }); // Fin del forEach por cada asesor
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






