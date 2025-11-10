function enviarCorreoCliente(clienteId = "20503503639") {
  // clienteId = 20486569604 // solo reconexion
  // clienteId = 10079154712 // no reconexion
  // clienteId = 20503503639 // ambos

  // 🔹 Grupos por tipo
  const gruposMto = getMachinesGroupedByClient("mantenimiento");
  const gruposReco = getMachinesGroupedByClient("reconexion");

  // 🔹 Fusionar ambos conjuntos
  const clientes = mergeGruposPorCliente(gruposMto, gruposReco);
  const cliente = clientes.find(c => String(c.cliente).trim() === String(clienteId).trim());

  if (!cliente) {
    Logger.log("❌ No se encontró cliente con ID: " + clienteId);
    return;
  }

  const maquinasMto = cliente.maquinas_mto || [];
  const maquinasReco = cliente.maquinas_reco || [];
  const tieneMto = maquinasMto.length > 0;
  const tieneReco = maquinasReco.length > 0;

  // 🚫 Si no hay máquinas en ninguna categoría → no se envía ni se registra
  if (!tieneMto && !tieneReco) {
    Logger.log(`⏩ Cliente ${cliente.cliente} no tiene máquinas de mantenimiento ni reconexión. No se envía correo.`);
    return;
  }


  // 🔹 Destinatarios y CC asesores
  const destinatarios = (cliente.contactos || [])
    .map(c => c.correo)
    .filter(isValidEmail)
    .map(e => e.trim());

  const asesoresCC = Array.from(new Set(
    [...maquinasMto, ...maquinasReco]
      .map(m => m?.asesor?.email)
      .filter(isValidEmail)
      .map(e => e.trim())
  ));

  // 🚫 Si no hay correos válidos de contacto → se registra pero no se envía
  if (destinatarios.length === 0) {
    Logger.log(`⚠️ Cliente ${cliente.cliente} sin contactos válidos. No se envía correo.`);
    return;
  }


  const num_semana = obtenerNumeroSemana();

  // 🔹 Construir tablas HTML según el tipo
  const htmlTablaMto = tieneMto ? construirTablaHTML(maquinasMto, false, "mantenimiento") : "";
  const htmlTablaReco = tieneReco ? construirTablaHTML(maquinasReco, false, "reconexion") : "";

  // 🔹 Generar cuerpo HTML usando la plantilla oficial
  const htmlBody = generarHTMLMantenimientoCliente({
    cliente: cliente.cliente,
    cliente_razon_social: cliente.cliente_razon_social,
    htmlTablaMto,
    htmlTablaReco
  });

  // 🔹 Crear y registrar log de envío
  const totalMaq = maquinasMto.length + maquinasReco.length;
  const tipoAviso =
    tieneMto && tieneReco ? "mixto" :
    tieneMto ? "mantenimiento" : "reconexion" 
  ;
  let inlineImages;
  
  if(tieneReco) {
    inlineImages = getInlineImages();
  }
  else {
    inlineImages = getInlineImages(['cabecera', 'pie','paquete']);
  } 

  

  const envioLog = buildEnvioLog({
    tipo: "cliente",
    id: cliente.cliente,
    nombre: cliente.cliente_razon_social,
    to: destinatarios,
    cc: asesoresCC,
    total_maquinas: totalMaq,
    resultado: "ok",
    tipo_aviso: tipoAviso
  });

  //registrarEnvio(envioLog.row);

  // 🔹 Registrar cada máquina en su tipo correspondiente
  maquinasMto.forEach(m => registrarMaquina(buildMaquinaLog(m, envioLog.id_envio, "mantenimiento")));
  maquinasReco.forEach(m => registrarMaquina(buildMaquinaLog(m, envioLog.id_envio, "reconexion")));

  // ✉️ Enviar correo
  const subject = `IPESA Comunica: Mantenimiento Preventivo - Semana ${num_semana}`;

  GmailApp.sendEmail("ksimbron@ipesa.com.pe", subject, "", {
    name: "Centro de Soluciones Conectadas",
    htmlBody,
    inlineImages
  });

  Logger.log(`✅ Correo enviado al cliente ${cliente.cliente_razon_social} (${cliente.cliente}), CC: ${asesoresCC.join(",")}`);
}





// function enviarCorreoAsesor(idAsesor = "2356udnke") {
//   const asesores = getMachinesGroupedByAsesor();
//   const asesor = asesores.find(a => String(a.id_asesor).trim() === String(idAsesor).trim());
//   if (!asesor) return;

//   const num_semana = obtenerNumeroSemana();
//   const inlineImages = getInlineImages(['cabecera']);

//   // Ya no necesitas construir las tablas manualmente 👇
//   const htmlBody = generarHTMLMantenimientoAsesor({
//     nombreAsesor: asesor.nombre_completo,
//     maquinas_mto: asesor.maquinas_mto,
//     maquinas_reco: asesor.maquinas_reco,
//     total_mto_usd: asesor.total_mto_usd,
//     total_reco_usd: asesor.total_reco_usd,
//     total_general_usd: asesor.total_general_usd
//   });

//   const subject = `CSC - Oportunidades Comerciales (Mantenimiento y Reconexión) - Semana ${num_semana}`;
//   GmailApp.sendEmail("ksimbron@ipesa.com.pe", subject, "", {
//     name: "Centro de Soluciones Conectadas",
//     htmlBody,
//     inlineImages
//   });
// }


function enviarCorreoAsesor(idAsesor = "2356udnke") {
  // 🔹 Agrupar por asesor y ubicar al solicitado
  const asesores = getMachinesGroupedByAsesor();
  const asesor = asesores.find(a => String(a.id_asesor).trim() === String(idAsesor).trim());

  if (!asesor) {
    Logger.log("❌ No se encontró asesor con ID: " + idAsesor);
    return;
  }

  // 🔹 Máquinas por tipo
  const maquinasMto  = Array.isArray(asesor.maquinas_mto)  ? asesor.maquinas_mto  : [];
  const maquinasReco = Array.isArray(asesor.maquinas_reco) ? asesor.maquinas_reco : [];
  const tieneMto  = maquinasMto.length  > 0;
  const tieneReco = maquinasReco.length > 0;

  // 🚫 Si no tiene nada que avisar → no se envía ni se registra
  if (!tieneMto && !tieneReco) {
    Logger.log(`⏩ Asesor ${asesor.nombre_completo} (${asesor.id_asesor}) sin máquinas de mantenimiento ni reconexión. No se envía correo.`);
    return;
  }

  // 🔹 Destinatarios (TO) y CC
  //   - TO: email del propio asesor (si es válido)
  //   - CC: si tu estructura trae algo como asesor.cc (array de correos), se filtra; si no, queda vacío
  const destinatarios = [asesor.email].filter(isValidEmail).map(e => e.trim());
  const cc = (Array.isArray(asesor.cc) ? asesor.cc : [])
    .filter(isValidEmail)
    .map(e => e.trim());

  if (destinatarios.length === 0) {
    Logger.log(`⚠️ Asesor ${asesor.nombre_completo} (${asesor.id_asesor}) sin correo válido. No se envía.`);
    return;
  }

  const num_semana = obtenerNumeroSemana();

  // 🔹 HTML desde plantilla oficial para asesores (ya renderiza tablas/listas)
  const htmlBody = generarHTMLMantenimientoAsesor({
    nombreAsesor: asesor.nombre_completo,
    maquinas_mto: asesor.maquinas_mto,
    maquinas_reco: asesor.maquinas_reco,
    total_mto_usd: asesor.total_mto_usd,
    total_reco_usd: asesor.total_reco_usd,
    total_general_usd: asesor.total_general_usd
  });

  // 🔹 Imágenes inline (si hay reconexión, carga paquete completo)
  const inlineImages = tieneReco
    ? getInlineImages()
    : getInlineImages(['cabecera', 'pie', 'paquete']);

  // 🔹 Construir log de envío (simétrico a cliente)
  const totalMaq  = maquinasMto.length + maquinasReco.length;
  const tipoAviso = (tieneMto && tieneReco) ? "mixto" : (tieneMto ? "mantenimiento" : "reconexion");

  const envioLog = buildEnvioLog({
    tipo: "asesor",
    id: asesor.id_asesor,
    nombre: asesor.nombre_completo,
    to: destinatarios,
    cc,
    total_maquinas: totalMaq,
    resultado: "ok",
    tipo_aviso: tipoAviso
  });

  // Si quieres que se grabe la fila de envíos, descomenta:
  // registrarEnvio(envioLog.row);

  // 🔹 Registrar cada máquina (igual que en cliente)
  maquinasMto.forEach(m =>
    registrarMaquina(
      buildMaquinaLog(m, envioLog.id_envio, "mantenimiento", { destinatario_tipo: "asesor" })
    )
  );
  maquinasReco.forEach(m =>
    registrarMaquina(
      buildMaquinaLog(m, envioLog.id_envio, "reconexion", { destinatario_tipo: "asesor" })
    )
  );

  // ✉️ Enviar correo
  const subject = `CSC - Oportunidades Comerciales (Mantenimiento y Reconexión) - Semana ${num_semana}`;
  const options = {
    name: "Centro de Soluciones Conectadas",
    htmlBody,
    inlineImages
  };
  if (cc.length) options.cc = cc.join(",");

  GmailApp.sendEmail("ksimbron@ipesa.com.pe", subject, "", options);

  // 🔹 Logs finales
  const resumenMto  = maquinasMto.slice(0, 10).map(x => x.num_serie || x.pin || x.num_interno || "s/n").join(", ");
  const resumenReco = maquinasReco.slice(0,10).map(x => x.num_serie || x.pin || x.num_interno || "s/n").join(", ");

  Logger.log(`✅ Correo enviado al asesor ${asesor.nombre_completo} (${asesor.id_asesor}).`);
  Logger.log(`   TO: ${destinatarios.join(", ")}${cc.length ? " | CC: " + cc.join(", ") : ""}`);
  Logger.log(`   MTO: ${maquinasMto.length}${maquinasMto.length ? " [" + resumenMto + (maquinasMto.length > 10 ? ", ..." : "") + "]" : ""}`);
  Logger.log(`   RECO: ${maquinasReco.length}${maquinasReco.length ? " [" + resumenReco + (maquinasReco.length > 10 ? ", ..." : "") + "]" : ""}`);
  Logger.log(`   TOTAL: ${totalMaq} | tipo_aviso=${tipoAviso} | id_envio=${envioLog.id_envio}`);
}





/**
 * 🧪 Vista previa del correo al cliente (sin enviar)
 * Permite revisar cómo quedará el correo final con mantenimiento y/o reconexión.
 * @param {string} clienteId - ID del cliente (por defecto muestra uno de ejemplo)
 */
function testCorreoCliente(clienteId = "20131368152") {
  // 🔹 Obtener datos agrupados por tipo
  const gruposMto  = getMachinesGroupedByClient("mantenimiento");
  const gruposReco = getMachinesGroupedByClient("reconexion");
        
  // 🔹 Fusionar ambos conjuntos
  const clientes = mergeGruposPorCliente(gruposMto, gruposReco);

  // 🔍 Buscar cliente específico
  const cliente = clientes.find(c => String(c.cliente).trim() === String(clienteId).trim());
  if (!cliente) {
    SpreadsheetApp.getUi().alert("❌ No se encontró cliente con ID: " + clienteId);
    return;
  }

  // 🔹 Verificar tipos de máquinas disponibles
  const tieneMto  = (cliente.maquinas_mto  || []).length > 0;
  const tieneReco = (cliente.maquinas_reco || []).length > 0;

  if (!tieneMto && !tieneReco) {
    SpreadsheetApp.getUi().alert("✅ El cliente no tiene máquinas críticas ni desconectadas.");
    return;
  }

  // 🧩 Construir tablas HTML dinámicamente (ya con tipo definido)
  const htmlTablaMto  = tieneMto
    ? construirTablaHTML(cliente.maquinas_mto, false, "mantenimiento")
    : "";
  const htmlTablaReco = tieneReco
    ? construirTablaHTML(cliente.maquinas_reco, false, "reconexion")
    : "";

  // 🧱 Generar cuerpo del correo con ambas secciones
  const htmlBody = generarHTMLMantenimientoCliente({
    cliente: cliente.cliente,
    cliente_razon_social: cliente.cliente_razon_social,
    htmlTablaMto,
    htmlTablaReco
  });

  // 🪞 Vista previa en modal de Google Sheets
  const output = HtmlService.createHtmlOutput(htmlBody)
    .setWidth(850)
    .setHeight(650);

  SpreadsheetApp.getUi().showModalDialog(output, "📧 Vista previa correo - " + cliente.cliente);
}



function probarVIPConContactos() {
  const vip = getVIPClientsWithContacts();
  console.log(JSON.stringify(vip[0], null, 2));
}


function probarVIPConAsesores() {
  const vip = getVIPClientsWithContacts();
  console.log(JSON.stringify(vip[50], null, 2));
}

function probarMaquinasPorAsesor() {
  const asesores = getMachinesGroupedByAsesor();
  // console.log(asesores)
  // console.log("MÁQUINAS:", asesores[1].maquinas.length);
  // Si quieres ver todo su JSON:
  console.log(JSON.stringify(asesores[0], null, 2));
}

function probar() {
  datos =  getMachinesGroupedByClient();
  const json1 = JSON.stringify(datos, null, 2);
  const file1 = DriveApp.createFile('datos.json', json1, MimeType.PLAIN_TEXT);
  Logger.log('Archivo alertascompletas creado: ' + file1.getUrl());

}

function probarMaquinasPorAsesor2() {
  const asesores = getMachinesGroupedByAsesor();

  if (!asesores.length) {
    console.log("⚠️ No hay asesores con máquinas críticas.");
    return;
  }

  console.log(`✅ Total asesores con máquinas críticas: ${asesores.length}`);

  asesores.forEach((asesor, i) => {
    console.log(`\n===== 🧑‍🔧 ASESOR ${i + 1} =====`);
    console.log(`ID: ${asesor.id_asesor}`);
    console.log(`Nombre: ${asesor.nombre_completo}`);
    console.log(`Correo: ${asesor.email}`);
    console.log(`Máquinas críticas: ${asesor.maquinas.length}`);

    // Muestra cada máquina con su costo estimado
    asesor.maquinas.forEach(m => {
      console.log(
        ` → ${m.num_serie} | ${m.familia} | ${m.subfamilia || "-"} | ` +
        `Próx. MTO: ${m.prox_mto} | Precio estimado: ${m.precio_estimado ?? "N/A"}`
      );
    });
  });

  // Si además quieres ver todo el JSON estructurado (útil para exportar o revisar)
  console.log("\n===== JSON COMPLETO =====");
  console.log(JSON.stringify(asesores, null, 2));
}



function probarCorreosMantenimiento() {
  const vipClients = getVIPClientsWithContacts();
  if (vipClients.length === 0) {
    Logger.log("No hay clientes con máquinas críticas.");
    return;
  }

  let totalClientes = vipClients.length;
  let clientesNotificados = 0;
  let clientesSinContactos = 0;
  let totalCorreos = 0;

  vipClients.forEach(cliente => {
    if (!cliente.maquinas || cliente.maquinas.length === 0) {
      Logger.log(`⏩ Cliente ${cliente.cliente} no tiene máquinas críticas, se omite.`);
      return;
    }

    // ✅ CC asesores + CSC
    const asesoresCC = Array.from(new Set(
      (cliente.maquinas || [])
        .map(m => m?.asesor?.email)
        .filter(isValidEmail)
        .map(e => e.trim())
    ));
    //asesoresCC.push("solucionesintegradas@ipesa.com.pe");
    const ccList = asesoresCC.join(",");

    // ✅ Destinatarios válidos (único envío)
    const destinatarios = (cliente.contactos || [])
      .map(c => c.correo)
      .filter(isValidEmail)
      .map(e => e.trim());

    // 🔑 Generamos primero el log de envío (id_envio único)
    const envioLog = buildEnvioLog({
      tipo: "cliente",
      id: cliente.cliente,
      nombre: cliente.cliente_razon_social,
      to: destinatarios,
      cc: asesoresCC,
      total_maquinas: cliente.total_maquinas,
      resultado: destinatarios.length > 0 ? "ok" : "sin_contactos",
      observacion: destinatarios.length > 0 ? "" : "No hay contactos válidos"
    });
    registrarEnvio(envioLog.row);

    const id_envio = envioLog.id_envio; // 👈 usamos este id para las máquinas

    // 🔹 Siempre registrar las máquinas críticas, haya o no contactos
    (cliente.maquinas || []).forEach(m => {
      const maquinaRow = buildMaquinaLog(m, id_envio);
      Logger.log(`🛠 id_envio usado en máquina → ${id_envio}, num_serie: ${m.num_serie}`);
      registrarMaquina(maquinaRow);
    });

    // 🔹 Logs de simulación
    if (destinatarios.length === 0) {
      clientesSinContactos++;
      Logger.log("📌 LOG CLIENTE (sin contactos) → " + JSON.stringify(envioLog));
      Logger.log(`⚠️ Cliente ${cliente.cliente} tiene máquinas críticas pero ningún contacto válido.`);
      return;
    }

    totalCorreos++;
    clientesNotificados++;
    Logger.log("📌 LOG CLIENTE (ok) → " + JSON.stringify(envioLog));
    Logger.log(`📧 Correo SIMULADO a [${destinatarios.join(", ")}] (${cliente.cliente}), CC: ${ccList}`);
    Logger.log(`Envío completado para cliente: ${cliente.cliente} → ${destinatarios.length} destinatario(s) en un solo correo`);
  });

  Logger.log("===== RESUMEN DE SIMULACIÓN CLIENTES =====");
  Logger.log(`Total clientes con máquinas críticas: ${totalClientes}`);
  Logger.log(`Clientes notificados: ${clientesNotificados}`);
  Logger.log(`Clientes sin contactos: ${clientesSinContactos}`);
  Logger.log(`Total correos simulados: ${totalCorreos}`);
  Logger.log("==========================================");
}




function probarCorreosMantenimientoAsesores() {
  const asesores = getMachinesGroupedByAsesor();
  if (asesores.length === 0) {
    Logger.log("No hay asesores con máquinas críticas.");
    return;
  }

  let totalAsesores = asesores.length;
  let asesoresNotificados = 0;
  let asesoresSinCorreo = 0;

  asesores.forEach(asesor => {
    // Validar correo
    if (!isValidEmail(asesor.email)) {
      asesoresSinCorreo++;

      const envioLog = buildEnvioLog({
        tipo: "asesor",
        id: asesor.id_asesor,
        nombre: asesor.nombre_completo,
        to: [],
        cc: [],
        total_maquinas: asesor.maquinas.length,
        resultado: "sin_email",
        observacion: "Asesor sin correo válido"
      });

      registrarEnvio(envioLog.row);

      // 🔹 Registrar igualmente las máquinas críticas bajo ese id_envio
      (asesor.maquinas || []).forEach(m => {
        const maquinaRow = buildMaquinaLog(m, envioLog.id_envio);
        registrarMaquina(maquinaRow);
      });

      Logger.log("📌 LOG ASESOR (sin email) → " + JSON.stringify(envioLog));
      return;
    }

    // Caso asesor con correo válido
    asesoresNotificados++;

    const envioLog = buildEnvioLog({
      tipo: "asesor",
      id: asesor.id_asesor,
      nombre: asesor.nombre_completo,
      to: [asesor.email.trim()],
      cc: [],
      total_maquinas: asesor.maquinas.length,
      resultado: "ok"
    });

    registrarEnvio(envioLog.row);

    // 🔹 Registrar las máquinas críticas ligadas al id_envio
    (asesor.maquinas || []).forEach(m => {
      const maquinaRow = buildMaquinaLog(m, envioLog.id_envio);
      registrarMaquina(maquinaRow);
    });

    Logger.log("📌 LOG ASESOR (ok) → " + JSON.stringify(envioLog));
    Logger.log(`📧 Correo SIMULADO a ${asesor.email.trim()} → ${asesor.nombre_completo} (${asesor.id_asesor}) con ${asesor.maquinas.length} máquina(s).`);
  });

  Logger.log("===== RESUMEN SIMULACIÓN ASESORES =====");
  Logger.log(`Total asesores con máquinas críticas: ${totalAsesores}`);
  Logger.log(`Asesores notificados (simulados): ${asesoresNotificados}`);
  Logger.log(`Asesores sin correo válido: ${asesoresSinCorreo}`);
  Logger.log("=======================================");
}

function probarPotenciales() {
  const pot = getRawPotenciales();
  console.log(pot.slice(0, 5)); // imprime las primeras filas
}


// idAsesor = "laFos29"
// obLla38
function testCorreoAsesor(idAsesor = "obLla38") {
  const asesores = getMachinesGroupedByAsesor();
  const asesor = asesores.find(a => String(a.id_asesor).trim() === String(idAsesor).trim());

  if (!asesor) {
    SpreadsheetApp.getUi().alert("❌ No se encontró asesor con ID: " + idAsesor);
    return;
  }

  const tieneMto  = (asesor.maquinas_mto  || []).length > 0;
  const tieneReco = (asesor.maquinas_reco || []).length > 0;

  if (!tieneMto && !tieneReco) {
    SpreadsheetApp.getUi().alert("✅ El asesor no tiene máquinas asignadas esta semana.");
    return;
  }

  // 🧱 Construir tablas con tipo explícito
  const htmlTablaMto  = tieneMto  ? construirTablaHTML(asesor.maquinas_mto, true, "mantenimiento") : "";
  const htmlTablaReco = tieneReco ? construirTablaHTML(asesor.maquinas_reco, true, "reconexion")   : "";

  // 🧩 Generar cuerpo real del correo
  const htmlBody = generarHTMLMantenimientoAsesor({
    nombreAsesor: asesor.nombre_completo,
    sucursal: asesor.sucursal || "",
    email_sucursal: asesor.email_sucursal || "",
    maquinas_mto: asesor.maquinas_mto,
    maquinas_reco: asesor.maquinas_reco,
    total_mto_usd: asesor.total_mto_usd,
    total_reco_usd: asesor.total_reco_usd,
    total_general_usd: asesor.total_general_usd,
    htmlTablaMto,       // ✅ ahora se pasan explícitamente
    htmlTablaReco       // ✅ también aquí
  });

  // 🪞 Mostrar vista previa dentro de Sheets
  const output = HtmlService.createHtmlOutput(htmlBody)
    .setWidth(850)
    .setHeight(650);

  SpreadsheetApp.getUi().showModalDialog(output, "📧 Vista previa correo - " + asesor.nombre_completo);
}









