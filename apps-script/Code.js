/**
 * Backend minimo - Google Apps Script.
 * Recibe el POST del frontend (application/x-www-form-urlencoded),
 * valida, y guarda una fila en Google Sheets.
 *
 * INSTALACION (resumen - detalle en SETUP.md):
 *   1. Abri el Spreadsheet -> Extensiones -> Apps Script.
 *   2. Pegá este archivo entero y guardá con el nombre que quieras.
 *   3. Ejecutá `setup()` una vez (crea la hoja de datos y autoriza).
 *   4. Implementar -> Nueva implementacion -> Aplicacion web.
 *      - Ejecutar como: "Yo"  -  Acceso: "Cualquier persona".
 *   5. Copiá la URL que termina en "/exec" y pegala en js/app.js -> SEND_URL.
 *
 * COMO AGREGAR UN CAMPO:
 *   1. Agregá el campo en QUESTIONS (js/form.js).
 *   2. Agregá "answer_<id>" a ANSWER_KEYS y el encabezado a HEADERS,
 *      en el MISMO lugar de ambas listas.
 *   3. Borrá la pestaña "Respuestas" y ejecutá setup() para recrearla
 *      (o crea la columna a mano en el Sheet).
 */

var SHEET_NAME = "Respuestas";

// Claves de los campos, en el MISMO orden que los encabezados de la hoja.
var ANSWER_KEYS = [
  "answer_nombre",
  "answer_apellido",
  "answer_telefono",
  "answer_p1",
  "answer_p2",
  "answer_p3",
  "answer_p4",
];

// Límites de tamaño por campo (§6).
var MAX_FIELD_LENGTH = 500;
var MAX_SESSION_ID_LENGTH = 64;
var MAX_RESULT_VALUE = 1000;

var HEADERS = ["Fecha", "Hora"]
  .concat(["Nombre", "Apellido", "Teléfono", "Pregunta 1", "Pregunta 2", "Pregunta 3", "Pregunta 4"])
  .concat(["Resultado", "ID de sesion"]);

/**
 * Configuración: crea la hoja "Respuestas" con sus encabezados.
 * Ejecutar UNA sola vez desde el editor de Apps Script.
 */
function setup() {
  var sheet = getSheet_();
  Logger.log('Hoja "' + SHEET_NAME + '" lista.');
  return jsonResponse_(true, { sheet: SHEET_NAME });
}

/**
 * Respuesta al GET (probar en el navegador que el deploy responde).
 */
function doGet() {
  return jsonResponse_(true, { app: "backend ok" });
}

/**
 * Recibe los datos del formulario y los guarda.
 */
function doPost(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  try {
    var row = validateAndBuildRow_(p);
    getSheet_().appendRow(row);
    return jsonResponse_(true, { row: row.length });
  } catch (err) {
    return jsonResponse_(false, { error: String(err.message || err) });
  }
}

/**
 * Valida los parámetros recibidos y devuelve la fila a insertar.
 * Lanza un Error si algo no es válido.
 */
function validateAndBuildRow_(p) {
  // Resultado numérico: entero positivo acotado.
  var result = Number(p.result);
  if (!Number.isInteger(result) || result < 1 || result > MAX_RESULT_VALUE) {
    throw new Error("resultado inválido");
  }

  // Todas las respuestas obligatorias y con tamaño acotado.
  var answers = [];
  for (var i = 0; i < ANSWER_KEYS.length; i++) {
    var val = String(p[ANSWER_KEYS[i]] || "").trim();
    if (!val) throw new Error("respuesta faltante: " + ANSWER_KEYS[i]);
    answers.push(sanitizeCell_(val));
  }

  // ID de sesión no vacío y acotado.
  var sessionId = String(p.sessionId || "").trim();
  if (!sessionId || sessionId.length > MAX_SESSION_ID_LENGTH) {
    throw new Error("sesión inválida");
  }

  // Timestamp generado en el servidor (§12).
  var now = new Date();
  var tz = Session.getScriptTimeZone();
  var fecha = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  var hora = Utilities.formatDate(now, tz, "HH:mm:ss");

  return [fecha, hora].concat(answers).concat([result, sanitizeCell_(sessionId)]);
}

/**
 * Previene inyección de fórmulas (§6): si el valor arranca con
 * = + - @ , se antepone un apóstrofe para que se guarde como texto.
 */
function sanitizeCell_(value) {
  var s = String(value).trim().substring(0, MAX_FIELD_LENGTH);
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  return s;
}

/**
 * Devuelve la hoja "Respuestas", creándola con sus encabezados si no existe.
 */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Respuesta JSON estándar. ContentService no permite códigos HTTP
 * personalizados: los errores operativos vuelven como {ok:false}.
 */
function jsonResponse_(ok, extra) {
  var payload = { ok: ok };
  if (extra) {
    for (var key in extra) payload[key] = extra[key];
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}