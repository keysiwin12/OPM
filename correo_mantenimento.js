function generarHTMLMantenimientoCliente(vars) {
  const razonSocial = vars.cliente_razon_social || "";
  const idCliente   = vars.cliente || "";

  // 🔹 Tablas
  const htmlTablaMto  = vars.htmlTablaMto || "";
  const htmlTablaReco = vars.htmlTablaReco || "";
  const tieneMto  = htmlTablaMto.trim() !== "";
  const tieneReco = htmlTablaReco.trim() !== "";

  // 🔹 Mensaje principal dinámico
  let mensajeIntro = "";
  if (tieneMto && tieneReco) {
    mensajeIntro = `
      Se ha identificado que las siguientes máquinas de su empresa requieren 
      <strong>mantenimiento preventivo</strong> o presentan 
      <strong>más de 30 días sin conexión</strong>.
    `;
  } else if (tieneMto) {
    mensajeIntro = `
      Se ha identificado que las siguientes máquinas de su empresa requieren 
      <strong>mantenimiento preventivo</strong>, debido a que cuentan con menos de 
      <strong>50 horas restantes</strong> para su próximo servicio.
    `;
  } else if (tieneReco) {
    mensajeIntro = `
      Se ha identificado que las siguientes máquinas de su empresa presentan 
      <strong>más de 30 días sin conexión</strong> con el sistema. 
      Le recomendamos revisar su estado o comunicarse con su asesor.
    `;
  }

  // 🔹 Secciones de tablas dinámicas
  let seccionTablas = "";
  if (tieneMto) {
    seccionTablas += `
      <h3 style="color: #2c5f2d; font-size: 16px; margin: 30px 0 15px 0; font-weight: 600;">
         Máquinas con mantenimiento pendiente
      </h3>
      ${htmlTablaMto}
    `;
  }
  if (tieneReco) {
    seccionTablas += `
      <h3 style="color: #2c5f2d; font-size: 16px; margin: 30px 0 15px 0; font-weight: 600;">
        Máquinas sin conexión (más de 30 días)
      </h3>
      ${htmlTablaReco}
    `;
  }

  // 🔹 Mensaje final personalizado
  let mensajeFinal = "";
  if (tieneMto && !tieneReco) {
    mensajeFinal = `
      <p style="margin: 25px 0 0 0; line-height: 1.7;">
        Nuestros asesores se pondrán en contacto con usted para coordinar la atención correspondiente 
        y evitar paradas no planificadas.
      </p>
    `;
  } else if (tieneReco && !tieneMto) {
    mensajeFinal = `
      <p style="margin: 25px 0 0 0; line-height: 1.7;">
        Le recomendamos revisar el estado de conexión de sus máquinas o comunicarse con su asesor 
        para coordinar la reconexión correspondiente.
      </p>
    `;
  } else if (tieneMto && tieneReco) {
    mensajeFinal = `
      <p style="margin: 25px 0 0 0; line-height: 1.7;">
        Nuestros asesores se pondrán en contacto con usted para coordinar las atenciones correspondientes 
        y la reconexión de los equipos identificados.
      </p>
    `;
  }

  // 🔹 HTML final completo
  return `
    <!-- Contenedor exterior con fondo verde suave -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 15px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <tr>
        <td align="center">
          
          <!-- Contenedor central blanco -->
          <table width="80%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 750px;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding: 30px 20px 20px 20px;">
                <img src="cid:cabecera" alt="Cabecera Mantenimiento" style="max-width: 100%; height: auto; width: 350px; display: block;">
              </td>
            </tr>

            <!-- Contenido principal -->
            <tr>
              <td style="padding: 0 30px 30px 30px;">
                
                <!-- Texto -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="text-align: left; font-size: 15px; color: #333; line-height: 1.7;">
                      
                      <p style="margin: 25px 0 0 0;">
                        Estimado(a) representante de <strong>${razonSocial} (${idCliente})</strong>,
                      </p>

                      ${
                        tieneMto && !tieneReco
                          ? `
                            <p style="margin: 20px 0 0 0; line-height: 1.7;">
                              Desde el <strong>Centro de Soluciones Conectadas (CSC)</strong> de <strong>IPESA</strong>,
                              representante oficial de la marca <strong>John Deere</strong>, ${mensajeIntro}
                            </p>
                          `
                          : `
                            <p style="margin: 20px 0 0 0; line-height: 1.7;">
                              Desde el <strong>Centro de Soluciones Conectadas (CSC)</strong> de <strong>IPESA</strong>,
                              representante oficial de la marca <strong>John Deere</strong>, le informamos lo siguiente:
                            </p>
                            <p style="margin: 15px 0 0 0; line-height: 1.7;">${mensajeIntro}</p>
                          `
                      }
                      
                    </td>
                  </tr>
                </table>

                <!-- Tablas -->
                <div style="margin: 35px 0;">
                  ${seccionTablas}
                </div>

                <!-- Imágenes promocionales -->
                <div style="margin: 45px 0 30px 0;">
                  <h3 style="color: #2c5f2d; font-size: 17px; margin: 0 0 25px 0; font-weight: 600; text-align: center;">
                    Conoce nuestros servicios especializados
                  </h3>
                  
                  <table align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                    <tr>
                      <td style="padding: 0 ${tieneReco ? '8px' : '0'} 0 0; text-align: center;">
                        <img src="cid:paquete" alt="Pie Paquetes" style="max-width: 100%; height: auto; width: ${tieneReco ? '320px' : '420px'}; display: block; border-radius: 6px;">
                      </td>
                      ${
                        tieneReco
                        ? `<td style="padding: 0 0 0 8px; text-align: center;">
                            <img src="cid:reconexion" alt="Pie Reconexion" style="max-width: 100%; height: auto; width: 320px; display: block; border-radius: 6px;">
                          </td>`
                        : ""
                      }
                    </tr>
                  </table>
                </div>

                <!-- Mensaje final y firma -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="text-align: left; font-size: 15px; color: #333;">
                      ${mensajeFinal}

                      <div style="margin: 35px 0 0 0; line-height: 1.7;">
                        <p style="margin: 5px 0;">Atentamente,</p>
                        <p style="margin: 5px 0;"><strong>Centro de Soluciones Conectadas</strong></p>
                        <p style="margin: 15px 0 5px 0;">
                          <a href="mailto:SolucionesIntegradas@ipesa.com.pe" style="color: #0066cc; text-decoration: none;">SolucionesIntegradas@ipesa.com.pe</a> | 
                          <span style="color: #666;">982 458 799</span>
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 30px 20px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0;">
                <img src="cid:pie" alt="Pie Mantenimiento" style="max-width: 100%; height: auto; width: 350px; display: block;">
              </td>
            </tr>
            
          </table>
          <!-- Fin contenedor central -->
          
        </td>
      </tr>
    </table>
    <!-- Fin contenedor exterior -->
  `;
}


function generarHTMLMantenimientoAsesor(vars) {
  const nombreAsesor = (vars.nombreAsesor || "").trim() || "asesor";
  // ✅ Construir las tablas si no fueron pasadas directamente
  const htmlTablaMto  = vars.htmlTablaMto  ||
    ((vars.maquinas_mto && vars.maquinas_mto.length > 0)
      ? construirTablaHTML(vars.maquinas_mto, true, "mantenimiento")
      : "");

  const htmlTablaReco = vars.htmlTablaReco ||
    ((vars.maquinas_reco && vars.maquinas_reco.length > 0)
      ? construirTablaHTML(vars.maquinas_reco, true, "reconexion")
      : "");
  const totalGeneral  = Number(vars.total_general_usd || 0);
  const total_mto_usd = Number(vars.total_mto_usd ||0);
  const total_reco_usd = Number(vars.total_reco_usd || 0);

  const tieneMto  = htmlTablaMto.trim() !== "";
  const tieneReco = htmlTablaReco.trim() !== "";

  // 🔹 Mensaje principal dinámico
  let mensajeIntro = "";
  if (tieneMto && tieneReco) {
    mensajeIntro = `
      hemos identificado <strong>máquinas de sus clientes</strong> que están por alcanzar su próximo
      <strong>mantenimiento preventivo</strong> y otras que presentan 
      <strong>más de 30 días sin conexión</strong>.
    `;
  } else if (tieneMto) {
    mensajeIntro = `
      hemos identificado <strong>máquinas de sus clientes</strong> que requieren 
      <strong>mantenimiento preventivo</strong>, debido a que cuentan con menos de 
      <strong>50 horas restantes</strong> para su próximo servicio.
    `;
  } else if (tieneReco) {
    mensajeIntro = `
      hemos identificado <strong>máquinas de sus clientes</strong> que presentan 
      <strong>más de 30 días sin conexión</strong> con el sistema. 
      Le recomendamos coordinar con ellos para restablecer la conectividad.
    `;
  }

  // 💰 Franja de facturación (bloque verde)
  const bloqueFacturacion =
    totalGeneral > 0
      ? `
        <div style="background-color:#e8f5e9; border-left:4px solid #2c5f2d; padding:12px 18px; margin:25px 0; border-radius:4px; font-family:Arial, sans-serif; line-height:1.5;">
          Esta semana tenemos la oportunidad de alcanzar una 
          <strong style="color:#2c5f2d;">
            facturación total estimada de 
            ${totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </strong>, 
          si logramos concretar los <strong>mantenimientos programados</strong> para sus clientes, 
          que suman <strong>${total_mto_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>, 
          y las <strong>reconexiones pendientes</strong>, por un valor de 
          <strong>${total_reco_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>. 
          A continuación, se detallan las oportunidades.
        </div>
      `
      : "";

  // 🔹 Secciones de tablas dinámicas
  let seccionTablas = "";
  if (tieneMto) {
    seccionTablas += `
      <h3 style="color:#2c5f2d; font-size:16px; margin:30px 0 15px 0; font-weight:600;">
         Máquinas con mantenimiento pendiente:
      </h3>
      <div style="overflow-x:auto; border:1px solid #eee; border-radius:6px; padding:4px; background:#fff;">
        ${htmlTablaMto}
      </div>
    `;
  }
  if (tieneReco) {
    seccionTablas += `
      <h3 style="color:#2c5f2d; font-size:16px; margin:30px 0 15px 0; font-weight:600;">
        Máquinas sin conexión (más de 30 días):
      </h3>
      <div style="overflow-x:auto; border:1px solid #eee; border-radius:6px; padding:4px; background:#fff;">
        ${htmlTablaReco}
      </div>
    `;
  }

  // 🔹 HTML final
  return `
    <!-- Fondo exterior gris -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" 
           style="background-color:#f5f5f5; padding:20px 0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <tr>
        <td align="center">

          <!-- Contenedor central blanco -->
          <table width="95%" cellpadding="0" cellspacing="0" border="0" 
                 style="background-color:#ffffff; border:2px solid #e0e0e0; border-radius:8px; 
                        box-shadow:0 2px 8px rgba(0,0,0,0.1); max-width:900px;">

            <!-- Cabecera -->
            <tr>
              <td align="center" style="padding:30px 20px 20px 20px;">
                <img src="cid:cabecera" alt="Cabecera Asesor" 
                     style="max-width:100%; height:auto; width:350px; display:block;">
              </td>
            </tr>

            <!-- Contenido principal -->
            <tr>
              <td style="padding:0 20px 30px 20px; text-align:left; color:#333; font-size:15px; line-height:1.7;">

                <p style="margin:25px 0 0 0;">
                  Estimado(a) <strong>${nombreAsesor}</strong>,
                </p>

                <p style="margin:20px 0 0 0;">
                  Desde el <strong>Centro de Soluciones Conectadas (CSC)</strong>,
                  ${mensajeIntro}
                </p>

                ${bloqueFacturacion}

                <div style="margin:35px 0;">
                  ${seccionTablas}
                </div>

                <p style="margin:25px 0 0 0;">
                  Le recomendamos comunicarse con sus clientes para coordinar la programación de estos mantenimientos 
                  y evitar paradas no planificadas en las operaciones.
                </p>

                <p style="margin:15px 0 0 0;">
                  P.D. Por favor, al momento de crear el pedido, considere el motivo en SAP:
                  <strong>CSC - OPM o CSC Reconexión</strong>, según corresponda.
                </p>

                <!-- Firma -->
                <div style="margin:35px 0 0 0;">
                  <p style="margin:5px 0;">Atentamente,</p>
                  <p style="margin:5px 0;"><strong>Centro de Soluciones Conectadas</strong></p>
                  <p style="margin:15px 0 5px 0;">
                    <a href="mailto:SolucionesIntegradas@ipesa.com.pe" style="color:#0066cc; text-decoration:none;">
                      SolucionesIntegradas@ipesa.com.pe
                    </a> | 
                    <span style="color:#666;">982 458 799</span>
                  </p>
                </div>

              </td>
            </tr>
          </table>
          <!-- Fin contenedor central -->
        </td>
      </tr>
    </table>
    <!-- Fin contenedor exterior -->
  `;
}


function construirTablaHTML(maquinas, esAsesor = false, tipo = "mantenimiento") {
  if (!maquinas || maquinas.length === 0)
    return "<p>No se encontraron máquinas.</p>";
  
  let total = 0;
  const esReconexion = tipo === "reconexion";

  const rows = maquinas.map((m, index) => {
    const precio = Number(m.precio_estimado) || 0;
    if (esAsesor) total += precio;

    //  Formateo de fecha si aplica
    const horaUltima = formatFechaCorta(m.hora_ultima_llamada);

    //  Alternancia de colores en filas
    const bgRow = index % 2 === 0 ? "#ffffff" : "#fafafa";

    //  Columnas dinámicas según tipo - MÁS PADDING
    const columnasBase = `
      <td style="text-align: center; padding: 12px 10px; font-size:13px;">${m.num_serie || ""}</td>
      <td style="text-align: center; padding: 12px 10px; font-size:13px;">${m.num_interno || ""}</td>
      ${esAsesor ? `<td style="text-align: left; padding: 12px 10px; font-size:13px; min-width:220px; max-width:280px;">${m.cliente || ""} - ${m.cliente_razon_social || ""}</td>` : ""}
      ${esAsesor 
        ? `<td style="text-align: center; padding: 12px 10px; font-size:13px; min-width:140px;">
             <div style="font-weight:500; color:#333;">${m.familia || ""}</div>
             <div style="font-size:12px; color:#666; margin-top:3px;">${m.linea || ""}</div>
           </td>` 
        : `<td style="text-align: center; padding: 12px 10px; font-size:13px;">${m.familia || ""}</td>`}
      <td style="text-align: center; padding: 12px 10px; font-size:13px;">${m.url && m.url !== "SIN_UBICACION"
        ? `<a href="${m.url}" target="_blank" style="color: #0066cc; text-decoration: none;">&#128205;Ver</a>`
        : "-"}</td>
      <td style="text-align: center; padding: 12px 10px; font-weight: 500; font-size:13px;">${m.horas_trabajo_motor ? Number(m.horas_trabajo_motor).toLocaleString('en-US', {maximumFractionDigits:0}) : ""}</td>
    `;

    // 🔹 Columnas específicas por tipo
    const columnasTipo = esReconexion
      ? `<td style="text-align: center; padding: 12px 10px; font-weight: 600; font-size:13px;">${horaUltima}</td>`
      : `
        <td style="text-align: center; padding: 12px 10px; font-size:13px;">${m.prox_mto ? Number(m.prox_mto).toLocaleString('en-US', {maximumFractionDigits:0}) : ""}</td>
        <td style="text-align: center; padding: 12px 10px; font-weight: 500; font-size:13px; color: ${Number(m.horas_restantes) <= 20 ? '#d32f2f' : '#333'};">${m.horas_restantes ? Number(m.horas_restantes).toLocaleString('en-US', {maximumFractionDigits:0}) : ""}</td>
      `;

    return `
      <tr style="background-color: ${bgRow}; border-bottom: 1px solid #f0f0f0;">
        ${columnasBase}
        ${columnasTipo}
        ${esAsesor ? `<td style="text-align: right; padding: 12px 10px; font-weight: 500; font-size:13px; white-space:nowrap;">$${precio.toFixed(2)}</td>` : ""}
      </tr>
    `;
  }).join("");

  // 🧩 Cabecera dinámica - CON SEPARADORES
  const headers = `
    <tr>
      <th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">N° Serie</th>
      <th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">N° Interno</th>
      ${esAsesor ? `<th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2); min-width:220px;">Cliente</th>` : ""}
      ${esAsesor 
        ? `<th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2); min-width:140px;">
             <div>Familia</div>
             <div style="font-size:11px; font-weight:500; margin-top:2px; opacity:0.9;">Línea</div>
           </th>` 
        : `<th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">Familia</th>`}
      <th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">Ubicación</th>
      <th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">Horómetro</th>
      ${esReconexion
        ? `<th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">Últ. Conex.</th>`
        : `<th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">Próx. MTO</th>
           <th style="padding: 12px 10px; text-align: center; font-weight: 600; font-size:13px; border-right: 1px solid rgba(255,255,255,0.2);">Horas Restantes</th>`}
      ${esAsesor ? `<th style="padding: 12px 10px; text-align: right; font-weight: 600; font-size:13px; white-space:nowrap;">Potencial</th>` : ""}
    </tr>
  `;

  // 🎨 Color temático de encabezado
  const bgColor = "#00B3FF";
  const textColor = "#ffffff";

  // 🧾 Ensamblar tabla - MIN-WIDTH para evitar colapso
  return `
    <table cellpadding="0" cellspacing="0"
       style="border-collapse: collapse; width: 100%; min-width:750px;
              font-size: 13px; border: 1px solid #ddd; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <thead style="background-color: ${bgColor}; color: ${textColor};">
        ${headers}
      </thead>
      <tbody>${rows}</tbody>
      ${esAsesor ? `
      <tfoot>
        <tr style="font-weight: 600; background-color: #e8f5e9; border-top: 2px solid ${bgColor};">
          <td colspan="${esReconexion ? 7 : 8}" style="text-align: right; padding: 14px 10px; font-size: 14px;">TOTAL ESTIMADO</td>
          <td style="text-align: right; padding: 14px 10px; font-size: 14px; color: #2e7d32; white-space:nowrap;">${total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        </tr>
      </tfoot>` : ""}
    </table>
  `;
}


 //📧 Envía correos automáticos de mantenimiento y reconexión (si aplica)
function enviarCorreosMantenimiento() {
  // 🔹 Obtener grupos separados
  const gruposMto = getMachinesGroupedByClient("mantenimiento");
  const gruposReco = getMachinesGroupedByClient("reconexion");

  // 🔹 Fusionar ambos grupos
  const clientes = mergeGruposPorCliente(gruposMto, gruposReco);
  if (clientes.length === 0) {
    Logger.log("📭 No hay clientes con máquinas críticas ni desconectadas.");
    return;
  }

  // 🔹 Obtener recursos comunes
  const num_semana = obtenerNumeroSemana();

  clientes.forEach(cliente => {
    const maquinasMto  = cliente.maquinas_mto  || [];
    const maquinasReco = cliente.maquinas_reco || [];
    const tieneMto  = maquinasMto.length > 0;
    const tieneReco = maquinasReco.length > 0;

    // 🚫 Si no tiene ningún tipo de máquina, no se envía ni registra
    if (!tieneMto && !tieneReco) return;

    // 🔹 Determinar tipo de aviso
    const tipoAviso =
      tieneMto && tieneReco ? "mixto" :
      tieneMto ? "OPM" :
      "RECONEXIÓN"
    ;
    
    let inlineImages;

    if(tieneReco) {
      inlineImages = getInlineImagesCached();
    }
    else {
      inlineImages = getInlineImagesCached(['cabecera', 'pie','paquete']);
    }

    // 🔹 Construir tablas HTML (solo si hay datos)
    const htmlTablaMto  = tieneMto  ? construirTablaHTML(maquinasMto,false,"mantenimiento")  : "";
    const htmlTablaReco = tieneReco ? construirTablaHTML(maquinasReco,false,"reconexion") : "";

    // 🔹 Generar cuerpo del correo usando la plantilla real
    const htmlBody = generarHTMLMantenimientoCliente({
      cliente: cliente.cliente,
      cliente_razon_social: cliente.cliente_razon_social,
      htmlTablaMto,
      htmlTablaReco
    });

    // 🔹 CC asesores únicos (de ambas tablas)
    const asesoresCC = Array.from(new Set(
      [...maquinasMto, ...maquinasReco]
        .map(m => m?.asesor?.email)
        .filter(isValidEmail)
        .map(e => e.trim())
    ));

    // 🔹 Destinatarios válidos
    const destinatarios = (cliente.contactos || [])
      .map(c => c.correo)
      .filter(isValidEmail)
      .map(e => e.trim());

    // 🚫 Sin contactos válidos → no se envía ni registra
    if (destinatarios.length === 0) {
      Logger.log(`⚠️ Cliente ${cliente.cliente} sin contactos válidos (no se envía correo).`);
      return;
    }

    // 🧾 Construir y registrar log de envío
    const totalMaq = maquinasMto.length + maquinasReco.length;
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
    registrarEnvio(envioLog.row);

    // // 🧱 Registrar máquinas (por tipo)
    // maquinasMto.forEach(m =>
    //   registrarMaquina(buildMaquinaLog(m, envioLog.id_envio, "OPM"))
    // );
    // maquinasReco.forEach(m =>
    //   registrarMaquina(buildMaquinaLog(m, envioLog.id_envio, "Reconexión"))
    // );

    // ✉️ Enviar correo
    const subject = `IPESA Comunica: Mantenimiento Preventivo - Semana ${num_semana}`;
    GmailApp.sendEmail(destinatarios.join(","), subject, "", {
    // GmailApp.sendEmail("ksimbron@ipesa.com.pe", subject, "", {
      name: "Centro de Soluciones Conectadas",
      cc: asesoresCC.join(","),
      bcc: "cgomezs@ipesa.com.pe",
      htmlBody,
      inlineImages
    });

    Logger.log(`✅ Correo enviado a ${cliente.cliente_razon_social} (${cliente.cliente}) | ${tipoAviso}`);
  });

  Logger.log("🏁 Proceso de envío de correos completado.");
}

function enviarCorreosMantenimientoAsesores() {
  const asesores = getMachinesGroupedByAsesor();
  if (asesores.length === 0) {
    Logger.log("📭 No hay asesores con máquinas críticas ni desconectadas.");
    return;
  }

  const inlineImages = getInlineImagesCached(['cabecera']);
  const num_semana = obtenerNumeroSemana();

  // 🚀 OPTIMIZACIÓN: Array para acumular TODAS las máquinas de TODOS los asesores
  const todasLasMaquinasLog = [];
  let totalMaquinasRegistradas = 0;

  asesores.forEach(asesor => {

    const asesores_enviados = ["dllacsahuanga@ipesa.com.pe","jtorresc@ipesa.com.pe","esalirrosas@ipesa.com.pe","enavarro@italtracselva.com.pe","ychapi@ipesa.com.pe","nrodriguez@ipesa.com.pe","ahuaranga@ipesa.com.pe","gpastor@italtracselva.com.pe","jchacon@ipesa.com.pe"];
    if(asesores_enviados.includes(asesor.email)) {
      Logger.log("ya enviado" + asesor.email);
      return;
    }

    const maquinasMto  = asesor.maquinas_mto  || [];
    const maquinasReco = asesor.maquinas_reco || [];
    const tieneMto  = maquinasMto.length > 0;
    const tieneReco = maquinasReco.length > 0;

    // 🚫 Si no tiene nada, no se envía ni registra
    if (!tieneMto && !tieneReco) return;

    const total_maquinas = maquinasMto.length + maquinasReco.length;
    const total_mto_usd  = asesor.total_mto_usd  || 0;
    const total_reco_usd = asesor.total_reco_usd || 0;
    const total_general  = asesor.total_general_usd || 0;

    // ✅ Lista CC: sucursal + CSC
    const ccList = [];
    if (isValidEmail(asesor.email_sucursal)) ccList.push(asesor.email_sucursal);
    ccList.push("solucionesintegradas@ipesa.com.pe");


    // 🔑 Generar log principal
    const envioLog = buildEnvioLog({
      tipo: "asesor",
      id: asesor.id_asesor,
      nombre: asesor.nombre_completo,
      to: isValidEmail(asesor.email) ? [asesor.email.trim()] : [],
      cc: [],
      total_maquinas,
      resultado: isValidEmail(asesor.email) ? "ok" : "sin_email",
      observacion: isValidEmail(asesor.email) ? "" : "Asesor sin correo válido"
    });
    registrarEnvio(envioLog.row);

    // 🚀 OPTIMIZACIÓN: Acumular máquinas en memoria (sin escribir aún a Sheets)
    // Esto reduce el tiempo de 74 minutos a ~2 segundos al escribir todo al final
    maquinasMto.forEach(m => {
      todasLasMaquinasLog.push(buildMaquinaLog(m, envioLog.id_envio, "OPM"));
      totalMaquinasRegistradas++;
    });
    maquinasReco.forEach(m => {
      todasLasMaquinasLog.push(buildMaquinaLog(m, envioLog.id_envio, "Reconexión"));
      totalMaquinasRegistradas++;
    });

    // 🚫 No tiene correo válido
    if (!isValidEmail(asesor.email)) {
      Logger.log(`⚠️ Asesor ${asesor.nombre_completo} sin correo válido.`);
      Logger.log("📌 LOG ASESOR (sin email) → " + JSON.stringify(envioLog));
      return;
    }

    // ✅ Construir HTML del correo asesor
    const htmlBody = generarHTMLMantenimientoAsesor({
      nombreAsesor: asesor.nombre_completo,
      maquinas_mto: maquinasMto,
      maquinas_reco: maquinasReco,
      total_mto_usd: total_mto_usd,
      total_reco_usd: total_reco_usd,
      total_general_usd: total_general
    });

    // ✉️ Enviar correo
    const subject = `CSC - Oportunidades (Mantenimiento y Reconexión) - Semana ${num_semana}`;
    GmailApp.sendEmail(asesor.email, subject, "", {
      name: "Centro de Soluciones Conectadas",
      cc: ccList.join(","),
      htmlBody,
      inlineImages
    });

    Logger.log(`✅ Correo enviado al asesor ${asesor.nombre_completo} (${asesor.email}) con ${total_maquinas} máquina(s).`);
  });

  // ⚡ ESCRITURA EN LOTE - Guardar TODAS las máquinas de UNA SOLA VEZ
  Logger.log(`💾 Guardando ${totalMaquinasRegistradas} registros de máquinas en lote...`);
  const tiempoInicio = Date.now();

  registrarMaquinasEnLote(todasLasMaquinasLog);

  const tiempoTranscurrido = ((Date.now() - tiempoInicio) / 1000).toFixed(2);
  Logger.log(`⚡ Registros guardados en ${tiempoTranscurrido}s (vs ~${(totalMaquinasRegistradas * 3 / 60).toFixed(1)} min con método anterior)`);

  Logger.log("🏁 Proceso de envío de correos a asesores completado.");
}




