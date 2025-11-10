function doGet() {
 
  const template = HtmlService.createTemplateFromFile("tabla_correo");
  // const template = HtmlService.createTemplateFromFile("tabla_asesores");
  data = getMachinesGroupedByAsesor("mantenimiento");
  // data = getMachinesGroupedByClient("reconexion");
  template.data = data;
  return template.evaluate().setTitle("Reporte de Clientes VIP");
}

function revision_previa() {
  const vipClients = get();
  const json1 = JSON.stringify(vipClients, null, 2);
  const file1 = DriveApp.createFile('envioCorreos.json', json1, MimeType.PLAIN_TEXT);
  Logger.log('Archivo envio Correos creado: ' + file1.getUrl());
}

function main() {
  enviarCorreosMantenimiento();
  // enviarCorreosMantenimientoAsesores();
}
