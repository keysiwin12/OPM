/**
 * 🚀 MONITOR DE RENDIMIENTO
 * Funciones para medir y comparar el rendimiento de las optimizaciones
 */

/**
 * 🧪 Prueba de rendimiento del cache de datos
 * Compara primera carga vs segunda carga (desde cache)
 */
function testCacheDatos() {
  Logger.log("=".repeat(60));
  Logger.log("🧪 TEST DE CACHE DE DATOS");
  Logger.log("=".repeat(60));

  // Limpiar cache primero
  limpiarCacheDatos();

  // Primera ejecución (sin cache)
  Logger.log("\n📊 Primera ejecución (SIN CACHE):");
  const start1 = Date.now();
  const data1 = getAllDataCached();
  const time1 = ((Date.now() - start1) / 1000).toFixed(2);
  Logger.log(`⏱️ Tiempo: ${time1}s`);
  Logger.log(`📦 Horómetro: ${data1.horometro.length} registros (pre-filtrados)`);
  Logger.log(`👥 Contactos: ${data1.contactos.length} registros (solo válidos)`);
  Logger.log(`🧑‍💼 Asesores: ${Object.keys(data1.asesores).length} registros (solo en uso)`);
  Logger.log(`🏢 Clientes: ${Object.keys(data1.clientes).length} registros (con máquinas + contactos)`);

  // Segunda ejecución (con cache)
  Logger.log("\n📦 Segunda ejecución (CON CACHE):");
  const start2 = Date.now();
  const data2 = getAllDataCached();
  const time2 = ((Date.now() - start2) / 1000).toFixed(2);
  Logger.log(`⏱️ Tiempo: ${time2}s`);

  // Comparación
  const mejora = ((1 - (parseFloat(time2) / parseFloat(time1))) * 100).toFixed(1);
  Logger.log("\n" + "=".repeat(60));
  Logger.log(`🎯 RESULTADO: ${mejora}% más rápido con cache`);
  Logger.log(`⚡ Ahorro de tiempo: ${(parseFloat(time1) - parseFloat(time2)).toFixed(2)}s`);
  Logger.log("=".repeat(60));
}

/**
 * 🧪 Prueba de rendimiento del cache de imágenes
 */
function testCacheImagenes() {
  Logger.log("=".repeat(60));
  Logger.log("🧪 TEST DE CACHE DE IMÁGENES");
  Logger.log("=".repeat(60));

  // Limpiar cache primero
  limpiarCacheImagenes();

  // Primera carga (sin cache)
  Logger.log("\n🖼️ Primera carga (SIN CACHE):");
  const start1 = Date.now();
  const imgs1 = getInlineImagesCached(['cabecera', 'pie', 'paquete']);
  const time1 = ((Date.now() - start1) / 1000).toFixed(2);
  Logger.log(`⏱️ Tiempo: ${time1}s`);
  Logger.log(`📎 Imágenes cargadas: ${Object.keys(imgs1).length}`);

  // Segunda carga (con cache)
  Logger.log("\n📦 Segunda carga (CON CACHE):");
  const start2 = Date.now();
  const imgs2 = getInlineImagesCached(['cabecera', 'pie', 'paquete']);
  const time2 = ((Date.now() - start2) / 1000).toFixed(2);
  Logger.log(`⏱️ Tiempo: ${time2}s`);

  // Comparación
  const mejora = ((1 - (parseFloat(time2) / parseFloat(time1))) * 100).toFixed(1);
  Logger.log("\n" + "=".repeat(60));
  Logger.log(`🎯 RESULTADO: ${mejora}% más rápido con cache`);
  Logger.log(`⚡ Ahorro de tiempo: ${(parseFloat(time1) - parseFloat(time2)).toFixed(2)}s`);
  Logger.log("=".repeat(60));
}

/**
 * 🧪 Prueba de rendimiento de getMachinesGroupedByAsesor
 * La función ya está optimizada y usa cache automáticamente
 */
function testOptimizacionAsesores() {
  Logger.log("=".repeat(60));
  Logger.log("🧪 TEST DE OPTIMIZACIÓN - AGRUPACIÓN POR ASESOR");
  Logger.log("=".repeat(60));

  // Limpiar cache para prueba limpia
  limpiarCacheDatos();

  Logger.log("\n⚙️ Ejecutando getMachinesGroupedByAsesor...");
  const start = Date.now();
  const asesores = getMachinesGroupedByAsesor();
  const time = ((Date.now() - start) / 1000).toFixed(2);

  // Estadísticas
  let totalMaquinasMto = 0;
  let totalMaquinasReco = 0;
  let totalFacturacion = 0;

  asesores.forEach(a => {
    totalMaquinasMto += a.maquinas_mto.length;
    totalMaquinasReco += a.maquinas_reco.length;
    totalFacturacion += a.total_general_usd;
  });

  Logger.log("\n" + "=".repeat(60));
  Logger.log(`⏱️ Tiempo de ejecución: ${time}s`);
  Logger.log(`👥 Asesores con máquinas: ${asesores.length}`);
  Logger.log(`🔧 Total máquinas mantenimiento: ${totalMaquinasMto}`);
  Logger.log(`📡 Total máquinas reconexión: ${totalMaquinasReco}`);
  Logger.log(`💰 Facturación potencial: $${totalFacturacion.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  Logger.log("=".repeat(60));

  // Segunda ejecución con cache
  Logger.log("\n📦 Segunda ejecución (CON CACHE):");
  const start2 = Date.now();
  const asesores2 = getMachinesGroupedByAsesor();
  const time2 = ((Date.now() - start2) / 1000).toFixed(2);
  Logger.log(`⏱️ Tiempo: ${time2}s`);

  const mejora = ((1 - (parseFloat(time2) / parseFloat(time1))) * 100).toFixed(1);
  Logger.log(`🎯 Mejora con cache: ${mejora}%`);
}

/**
 * 🧪 Prueba completa del flujo de envío (sin enviar correos)
 * Simula el flujo completo para medir tiempo total
 */
function testFlujosCompletoClientes() {
  Logger.log("=".repeat(60));
  Logger.log("🧪 TEST DE FLUJO COMPLETO - CLIENTES");
  Logger.log("=".repeat(60));

  limpiarCacheDatos();
  limpiarCacheImagenes();

  const startTotal = Date.now();

  // Paso 1: Cargar datos
  Logger.log("\n📊 Paso 1: Cargando datos...");
  const start1 = Date.now();
  const gruposMto = getMachinesGroupedByClient("mantenimiento");
  const gruposReco = getMachinesGroupedByClient("reconexion");
  const clientes = mergeGruposPorCliente(gruposMto, gruposReco);
  const time1 = ((Date.now() - start1) / 1000).toFixed(2);
  Logger.log(`✅ ${clientes.length} clientes procesados en ${time1}s`);

  // Paso 2: Cargar imágenes
  Logger.log("\n🖼️ Paso 2: Cargando imágenes...");
  const start2 = Date.now();
  const imgs = getInlineImagesCached(['cabecera', 'pie', 'paquete', 'reconexion']);
  const time2 = ((Date.now() - start2) / 1000).toFixed(2);
  Logger.log(`✅ Imágenes cargadas en ${time2}s`);

  // Paso 3: Simular procesamiento de correos
  Logger.log("\n✉️ Paso 3: Simulando procesamiento de correos...");
  const start3 = Date.now();
  let clientesConMaquinas = 0;
  let clientesConContactos = 0;
  let totalCorreosAEnviar = 0;
  let totalMaquinas = 0;

  clientes.forEach(cliente => {
    const maquinasMto = cliente.maquinas_mto || [];
    const maquinasReco = cliente.maquinas_reco || [];
    const tieneMto = maquinasMto.length > 0;
    const tieneReco = maquinasReco.length > 0;

    if (tieneMto || tieneReco) {
      clientesConMaquinas++;
      totalMaquinas += maquinasMto.length + maquinasReco.length;

      const destinatarios = (cliente.contactos || [])
        .map(c => c.correo)
        .filter(isValidEmail);

      if (destinatarios.length > 0) {
        clientesConContactos++;
        totalCorreosAEnviar++;

        // Simular construcción de HTML (sin enviarlo)
        const htmlTablaMto = tieneMto ? construirTablaHTML(maquinasMto, false, "mantenimiento") : "";
        const htmlTablaReco = tieneReco ? construirTablaHTML(maquinasReco, false, "reconexion") : "";
      }
    }
  });

  const time3 = ((Date.now() - start3) / 1000).toFixed(2);
  Logger.log(`✅ Procesamiento simulado en ${time3}s`);

  const timeTotal = ((Date.now() - startTotal) / 1000).toFixed(2);

  // Resumen
  Logger.log("\n" + "=".repeat(60));
  Logger.log("📊 RESUMEN DEL FLUJO:");
  Logger.log("=".repeat(60));
  Logger.log(`⏱️ Tiempo total: ${timeTotal}s`);
  Logger.log(`📧 Correos a enviar: ${totalCorreosAEnviar}`);
  Logger.log(`🏢 Clientes con máquinas: ${clientesConMaquinas}`);
  Logger.log(`✅ Clientes con contactos: ${clientesConContactos}`);
  Logger.log(`🔧 Total máquinas: ${totalMaquinas}`);
  Logger.log(`⚡ Tiempo promedio por correo: ${(parseFloat(timeTotal) / totalCorreosAEnviar).toFixed(2)}s`);

  // Estimación
  const tiempoEnvioEstimado = parseFloat(timeTotal) + (totalCorreosAEnviar * 2); // ~2s por envío de correo
  Logger.log(`\n⏰ Tiempo estimado con envío real: ${tiempoEnvioEstimado.toFixed(2)}s (${(tiempoEnvioEstimado / 60).toFixed(2)} minutos)`);

  if (tiempoEnvioEstimado > 1800) {
    Logger.log(`⚠️ ALERTA: Excede 30 minutos. Necesitas sistema de batching.`);
  } else {
    Logger.log(`✅ OK: Dentro del límite de 30 minutos.`);
  }
  Logger.log("=".repeat(60));
}

/**
 * 🧪 Test rápido de todas las optimizaciones
 */
function testTodasLasOptimizaciones() {
  Logger.log("\n\n🚀 INICIANDO SUITE COMPLETA DE TESTS\n\n");

  testCacheDatos();
  Logger.log("\n\n");

  testCacheImagenes();
  Logger.log("\n\n");

  testOptimizacionAsesores();
  Logger.log("\n\n");

  testFlujosCompletoClientes();

  Logger.log("\n\n✅ SUITE DE TESTS COMPLETADA\n\n");
}

/**
 * 📊 Estadísticas del cache actual
 */
function mostrarEstadisticasCache() {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get('ALL_DATA_V1');

  Logger.log("=".repeat(60));
  Logger.log("📊 ESTADÍSTICAS DEL CACHE");
  Logger.log("=".repeat(60));

  if (cachedData) {
    const size = new Blob([cachedData]).getSize();
    const sizeKB = (size / 1024).toFixed(2);
    Logger.log(`✅ Cache activo`);
    Logger.log(`📦 Tamaño: ${sizeKB} KB`);
    Logger.log(`⏰ Duración configurada: 1 hora`);

    try {
      const data = JSON.parse(cachedData);
      Logger.log(`📊 Registros en cache:`);
      Logger.log(`   - Horómetro: ${data.horometro?.length || 0}`);
      Logger.log(`   - Contactos: ${data.contactos?.length || 0}`);
      Logger.log(`   - Asesores: ${Object.keys(data.asesores || {}).length}`);
      Logger.log(`   - Clientes: ${Object.keys(data.clientes || {}).length}`);
      Logger.log(`   - Potenciales: ${data.potenciales?.length || 0}`);
    } catch (e) {
      Logger.log(`⚠️ Error leyendo datos del cache: ${e.message}`);
    }
  } else {
    Logger.log(`❌ No hay datos en cache`);
    Logger.log(`💡 Ejecuta cualquier función que use getAllDataCached() para llenar el cache`);
  }

  // Cache de imágenes
  if (globalThis._IMAGE_CACHE && Object.keys(globalThis._IMAGE_CACHE).length > 0) {
    Logger.log(`\n🖼️ Cache de imágenes activo: ${Object.keys(globalThis._IMAGE_CACHE).length} conjuntos`);
  } else {
    Logger.log(`\n🖼️ Cache de imágenes: vacío`);
  }

  Logger.log("=".repeat(60));
}

/**
 * 📊 Compara tamaño de datos ANTES vs DESPUÉS de optimización
 * Muestra cuánto se redujo el volumen de datos
 */
function compararTamanioDatos() {
  Logger.log("=".repeat(60));
  Logger.log("📊 COMPARACIÓN DE TAMAÑO DE DATOS");
  Logger.log("=".repeat(60));

  // Simular carga SIN filtros (comentando temporalmente)
  Logger.log("\n📥 Cargando datos SIN optimización...");
  const startSin = Date.now();

  // Cargar todo sin filtros
  const horometroCompleto = readSheetAsObjects('Horómetro');
  const contactosCompletos = readSheetAsObjects('Z_CONTACTOS_CLIENTES');
  const todosAsesores = getRawAsesores();
  const todosClientes = getRawClientes();
  const todasSucursales = getRawSucursales();

  const timeSin = ((Date.now() - startSin) / 1000).toFixed(2);

  // Calcular tamaño aproximado en KB
  const jsonSin = JSON.stringify({
    horometro: horometroCompleto,
    contactos: contactosCompletos,
    asesores: todosAsesores,
    clientes: todosClientes,
    sucursales: todasSucursales
  });
  const sizeSin = Utilities.newBlob(jsonSin).getBytes().length / 1024;

  Logger.log(`✅ Cargado en ${timeSin}s`);
  Logger.log(`📦 Horómetro: ${horometroCompleto.length} registros`);
  Logger.log(`👥 Contactos: ${contactosCompletos.length} registros`);
  Logger.log(`🧑‍💼 Asesores: ${Object.keys(todosAsesores).length} registros`);
  Logger.log(`🏢 Clientes: ${Object.keys(todosClientes).length} registros`);
  Logger.log(`💾 Tamaño: ${sizeSin.toFixed(2)} KB`);

  // Cargar CON filtros
  Logger.log("\n📥 Cargando datos CON optimización...");
  const startCon = Date.now();
  const dataOptimizada = getAllData();
  const timeCon = ((Date.now() - startCon) / 1000).toFixed(2);

  const jsonCon = JSON.stringify(dataOptimizada);
  const sizeCon = Utilities.newBlob(jsonCon).getBytes().length / 1024;

  Logger.log(`✅ Cargado en ${timeCon}s`);
  Logger.log(`💾 Tamaño: ${sizeCon.toFixed(2)} KB`);

  // Comparación
  const reduccionRegistros = ((1 - (dataOptimizada.horometro.length / horometroCompleto.length)) * 100).toFixed(1);
  const reduccionContactos = ((1 - (dataOptimizada.contactos.length / contactosCompletos.length)) * 100).toFixed(1);
  const reduccionTamanio = ((1 - (sizeCon / sizeSin)) * 100).toFixed(1);

  Logger.log("\n" + "=".repeat(60));
  Logger.log("🎯 RESUMEN DE REDUCCIÓN:");
  Logger.log("=".repeat(60));
  Logger.log(`📉 Máquinas: -${reduccionRegistros}% (de ${horometroCompleto.length} a ${dataOptimizada.horometro.length})`);
  Logger.log(`📉 Contactos: -${reduccionContactos}% (de ${contactosCompletos.length} a ${dataOptimizada.contactos.length})`);
  Logger.log(`📉 Tamaño total: -${reduccionTamanio}% (de ${sizeSin.toFixed(2)} KB a ${sizeCon.toFixed(2)} KB)`);
  Logger.log(`⚡ Ahorro: ${(sizeSin - sizeCon).toFixed(2)} KB`);

  if (sizeCon < 100) {
    Logger.log(`\n✅ EXCELENTE: ${sizeCon.toFixed(2)} KB cabe perfectamente en cache (límite: 100 KB por entrada)`);
  } else {
    Logger.log(`\n⚠️ ADVERTENCIA: ${sizeCon.toFixed(2)} KB aún requiere cache particionado`);
  }

  Logger.log("=".repeat(60));
}

/**
 * 🧪 TEST DE FILTRADO DUAL (CLIENTES vs ASESORES)
 * Verifica que el sistema de filtrado dual funcione correctamente:
 * - Modo clientes: solo clientes con contactos válidos
 * - Modo asesores: todos los clientes con máquinas críticas
 */
function testFiltradoDual() {
  Logger.log("=".repeat(60));
  Logger.log("🧪 TEST DE FILTRADO DUAL (CLIENTES vs ASESORES)");
  Logger.log("=".repeat(60));

  limpiarCacheDatos();

  // Cargar datos para CLIENTES (solo con contactos)
  Logger.log("\n📧 Modo CLIENTES (soloClientesConContactos: true):");
  const start1 = Date.now();
  const dataClientes = getAllDataCached({ soloClientesConContactos: true });
  const time1 = ((Date.now() - start1) / 1000).toFixed(2);

  const clientesConContactos = Object.keys(dataClientes.clientes).length;
  const maquinasClientes = dataClientes.horometro.length;

  Logger.log(`✅ Cargado en ${time1}s`);
  Logger.log(`🏢 Clientes: ${clientesConContactos}`);
  Logger.log(`🔧 Máquinas: ${maquinasClientes}`);

  // Cargar datos para ASESORES (todos los clientes con máquinas)
  Logger.log("\n👥 Modo ASESORES (soloClientesConContactos: false):");
  const start2 = Date.now();
  const dataAsesores = getAllDataCached({ soloClientesConContactos: false });
  const time2 = ((Date.now() - start2) / 1000).toFixed(2);

  const clientesTotales = Object.keys(dataAsesores.clientes).length;
  const maquinasAsesores = dataAsesores.horometro.length;

  Logger.log(`✅ Cargado en ${time2}s (desde cache)`);
  Logger.log(`🏢 Clientes: ${clientesTotales}`);
  Logger.log(`🔧 Máquinas: ${maquinasAsesores}`);

  // Comparación
  const clientesSinContactos = clientesTotales - clientesConContactos;
  const maquinasSinContactos = maquinasAsesores - maquinasClientes;

  Logger.log("\n" + "=".repeat(60));
  Logger.log("🎯 COMPARACIÓN:");
  Logger.log("=".repeat(60));
  Logger.log(`📊 Clientes sin contactos válidos: ${clientesSinContactos}`);
  Logger.log(`🔧 Máquinas de clientes sin contactos: ${maquinasSinContactos}`);
  Logger.log(`\n💡 Los asesores ven ${maquinasSinContactos} máquinas adicionales`);
  Logger.log(`   que no se incluyen en correos a clientes`);

  if (clientesSinContactos > 0) {
    Logger.log(`\n✅ CORRECTO: Sistema de filtrado dual funcionando`);
    Logger.log(`   - Clientes reciben correos solo si tienen contactos válidos`);
    Logger.log(`   - Asesores ven TODAS las máquinas críticas/desconectadas`);
  } else {
    Logger.log(`\n⚠️ AVISO: Todos los clientes tienen contactos válidos`);
  }

  Logger.log("=".repeat(60));
}

/**
 * 🧪 TEST DE AGRUPACIONES COMPLETAS
 * Prueba las funciones de agrupación y verifica que:
 * - getMachinesGroupedByClient use filtrado de clientes
 * - getMachinesGroupedByAsesor incluya todas las máquinas
 */
function testAgrupacionesCompletas() {
  Logger.log("=".repeat(60));
  Logger.log("🧪 TEST DE AGRUPACIONES COMPLETAS");
  Logger.log("=".repeat(60));

  limpiarCacheDatos();

  // Test 1: Agrupación por cliente
  Logger.log("\n📧 Agrupación por CLIENTE:");
  const start1 = Date.now();
  const gruposClientes = getMachinesGroupedByClient("ambos");
  const time1 = ((Date.now() - start1) / 1000).toFixed(2);

  let totalMaquinasClientes = 0;
  gruposClientes.forEach(g => {
    totalMaquinasClientes += g.maquinas.length;
  });

  Logger.log(`✅ Procesado en ${time1}s`);
  Logger.log(`🏢 Clientes agrupados: ${gruposClientes.length}`);
  Logger.log(`🔧 Total máquinas: ${totalMaquinasClientes}`);

  // Test 2: Agrupación por asesor
  Logger.log("\n👥 Agrupación por ASESOR:");
  const start2 = Date.now();
  const gruposAsesores = getMachinesGroupedByAsesor();
  const time2 = ((Date.now() - start2) / 1000).toFixed(2);

  let totalMaquinasAsesores = 0;
  gruposAsesores.forEach(g => {
    totalMaquinasAsesores += g.maquinas_mto.length + g.maquinas_reco.length;
  });

  Logger.log(`✅ Procesado en ${time2}s (desde cache)`);
  Logger.log(`🧑‍💼 Asesores agrupados: ${gruposAsesores.length}`);
  Logger.log(`🔧 Total máquinas: ${totalMaquinasAsesores}`);

  // Comparación
  const diferenciaMaquinas = totalMaquinasAsesores - totalMaquinasClientes;

  Logger.log("\n" + "=".repeat(60));
  Logger.log("🎯 COMPARACIÓN:");
  Logger.log("=".repeat(60));
  Logger.log(`📊 Máquinas en correos a clientes: ${totalMaquinasClientes}`);
  Logger.log(`📊 Máquinas en reportes a asesores: ${totalMaquinasAsesores}`);
  Logger.log(`📊 Diferencia: ${diferenciaMaquinas} máquinas`);

  if (diferenciaMaquinas > 0) {
    Logger.log(`\n✅ CORRECTO: Asesores ven ${diferenciaMaquinas} máquinas adicionales`);
    Logger.log(`   (de clientes sin contactos válidos)`);
  } else if (diferenciaMaquinas === 0) {
    Logger.log(`\n⚠️ AVISO: Mismo número de máquinas en ambos modos`);
    Logger.log(`   (posiblemente todos los clientes tienen contactos)`);
  } else {
    Logger.log(`\n❌ ERROR: Asesores deberían ver MÁS o IGUAL máquinas que clientes`);
  }

  Logger.log("=".repeat(60));
}
