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

  function getRawHorometroData() {
    return readSheetAsObjects('Horómetro');
  }

  function getRawContacts() {
    return readSheetAsObjects('Z_CONTACTOS_CLIENTES');
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

  function getAllData() {
    const data = {};

    // Carga en memoria todo el dataset base
    data.horometro = getRawHorometroData().filter(r => 
      ["JD C&F", "JD A&T"].includes(String(r.linea || "").trim())
    );
    data.contactos   = getRawContacts();
    data.asesores    = getRawAsesores();
    data.clientes    = getRawClientes();
    data.potenciales = getRawPotenciales();
    data.sucursales = getRawSucursales();

    return data;
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
    const all = getAllData(); 
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


function getMachinesGroupedByAsesor() {
  const all = getAllData(); // ✅ ahora incluye sucursales
  const { horometro: data, asesores, clientes, potenciales, sucursales } = all;

  const MONTO_RECONEXION = 799.99;
  const grouped = {};

  // ✅ Preindexar POTENCIALES para búsqueda instantánea
  const mapPotenciales = new Map();
  (potenciales || []).forEach(p => {
    const linea   = normalizeText(p.linea);
    const familia = normalizeText(p.familia);
    const subfam  = normalizeText(p.subfamilia);
    const hora    = Number(p.hora) || 0;
    const precio  = Number(p.precio) || 0;

    // 🔹 Si es TRACTOR AGRÍCOLA → clave con subfamilia
    // 🔹 Si no → clave solo con línea + familia + hora
    const clave = (familia === "TRACTOR AGRICOLA")
      ? `${linea}|${familia}|${subfam}|${hora}`
      : `${linea}|${familia}|${hora}`;

    mapPotenciales.set(clave, precio);
  });

  const clientesUnicos = Array.from(
    new Set(
      (data || [])
        .map(r => toStr(r.cliente))
        .filter(id => id)
    )
  );

  const modos = ["mantenimiento", "reconexion"];

  modos.forEach(mode => {
    clientesUnicos.forEach(clienteId => {
      const maquinasCliente = getMachinesByClient(clienteId, data, asesores, clientes, { mode });

      maquinasCliente.forEach(m => {
        const idAsesor = toStr(m.id_asesor);
        const asesorRef = asesores[idAsesor];
        if (!idAsesor || !asesorRef) return;

        // 🔹 Si no existe aún, crear el grupo del asesor
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

        let precio = 0;
        if (mode === "mantenimiento") {
          const horasAjustadas = intervalos_lineas(m.linea, m.familia, Number(m.prox_mto));
          // 🔹 Normalizar textos
          const linea   = normalizeText(m.linea);
          const familia = normalizeText(m.familia);
          const subfam  = normalizeText(m.subfamilia);

          // 💰 Clave según regla de negocio (solo tractores agrícolas usan subfamilia)
          let clave = "";
          if (familia === "TRACTOR AGRICOLA") {
            clave = `${linea}|${familia}|${subfam}|${horasAjustadas}`;
          } else {
            clave = `${linea}|${familia}|${horasAjustadas}`;
          }

          const precio = mapPotenciales.get(clave) || 0;
          m.precio_estimado = precio;

          grouped[idAsesor].maquinas_mto.push(m);
          grouped[idAsesor].total_mto_usd += precio;

        } else if (mode === "reconexion") {
          m.precio_estimado = MONTO_RECONEXION;
          grouped[idAsesor].maquinas_reco.push(m);
          grouped[idAsesor].total_reco_usd += MONTO_RECONEXION;
        }

        grouped[idAsesor].maquinas.push(m);
        grouped[idAsesor].total_maquinas++;
      });
    });
  });

  // ✅ Calcular total general al final
  Object.values(grouped).forEach(g => {
    g.total_general_usd = g.total_mto_usd + g.total_reco_usd;
  });

  return Object.values(grouped);
}






