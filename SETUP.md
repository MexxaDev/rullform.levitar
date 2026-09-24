# SETUP — Google Sheets + Google Apps Script

Guía para crear el almacenamiento de resultados y conectarlo con el frontend.

Tiempo estimado: 10 minutos. Solo se hace una vez.

---

## 1. Crear el Google Sheet

1. Entrá a <https://sheets.google.com> y creá una hoja de cálculo nueva.
2. Nombrala, por ejemplo: `Ruleta - Resultados`.
3. **No hace falta crear columnas a mano.** La función `setup()` del script crea
   la hoja `Respuestas` con los encabezados automáticamente.

## 2. Abrir el editor de Apps Script

4. En el menú superior: `Extensiones` → `Apps Script`.
5. Se abre el editor. Borrá cualquier código que tenga y pegá el contenido
   completo de **`apps-script/Code.js`**.
6. Guardá (`Ctrl+S`) y ponele un nombre al proyecto, por ejemplo `backend-ruleta`.
7. Cerrá la pestaña del editor y volvé a tu Spreadsheet.

## 3. Ejecutar `setup()` (una sola vez)

8. Volvé a `Extensiones` → `Apps Script`.
9. En la barra de herramientas, elegí la función **`setup`** en el desplegable
   (al lado del botón de ejecutar ▶).
10. Presioná **▶ Ejecutar**.
11. Primera vez aparecerá un aviso de autorización:
    - Elegí tu cuenta.
    - Presioná **Avanzado** → **Ir a ... (no seguro)**.
    - Presioná **Permitir**.
12. En el panel izquierdo de "Ejecuciones" debería aparecer que terminó sin
    errores.

### Verificar

13. En el Spreadsheet debería existir ahora una pestaña `Respuestas` con los
    encabezados:

```
Fecha | Hora | Pregunta 1 | Pregunta 2 | Pregunta 3 | Pregunta 4 | Resultado | ID de sesión
```

## 4. Publicar como Aplicación web

14. En el editor de Apps Script: **Implementar** → **Nueva implementación**.
15. Tipo: elegí **Aplicación web**.
16. Configurá:
     - **Descripción:** `v1`
     - **Ejecutar como:** `Yo` (tu cuenta)
     - **Quién tiene acceso:** `Cualquier persona`
17. Presioná **Implementar** y **Autoriza** el acceso (igual que antes).
18. Copiá la **URL de la aplicación web** (termina en `/exec`) y guardala.

> Ya no podés ver la URL completa después de cerrar ese cuadro de diálogo,
> pero siempre podés ir a **Implementar** → **Gestionar implementaciones** →
> **Editar** para verla o copiarla de nuevo.

## 5. Probar el backend con `curl`

Abrí una terminal y ejecutá (reemplazá `TU_URL`):

```powershell
curl -X POST "TU_URL" --data "result=15%25+OFF&answer_nombre=Juan&answer_apellido=Perez&answer_telefono=1133884455&answer_p1=15+años&answer_p2=Ituzaingo+1418&answer_p3=Magenta+y+Blanco&answer_p4=Guemes+y+Avellaneda&sessionId=prueba-1"
```

Respuesta esperada (HTTP 200):

```json
{"ok":true,"row":8}
```

Y en el Spreadsheet, en la pestaña `Respuestas`, aparece una fila nueva con
fecha, hora, los 7 campos del formulario, el descuento `15% OFF` y el ID `prueba-1`.

Si falta algún campo, responde `{"ok":false,"error":"respuesta faltante: ..."}`.

## 6. Conectar el frontend

20. En tu proyecto, abrí **`js/app.js`**.
21. En la constante `SEND_URL`, pegá la URL de la aplicación web:

```js
const SEND_URL = "https://script.google.com/macros/s/XXXXXX/exec";
```

Listo. A partir de ahora "ENVIAR RESULTADO" manda los datos a esta hoja.

---

## Resumen de parámetros que espera el backend

| Parámetro        | Tipo   | Descripción                                            |
|------------------|--------|--------------------------------------------------------|
| `result`         | texto  | Descuento de la ruleta, ej. `15% OFF` (máx. 20 caracteres) |
| `answer_nombre`  | texto  | Nombre (obligatorio)                                   |
| `answer_apellido`| texto  | Apellido (obligatorio)                                 |
| `answer_telefono`| texto  | Teléfono de contacto (obligatorio)                     |
| `answer_p1`      | texto  | Respuesta de la pregunta 1 (obligatorio)               |
| `answer_p2`      | texto  | Respuesta de la pregunta 2 (obligatorio)               |
| `answer_p3`      | texto  | Respuesta de la pregunta 3 (obligatorio)               |
| `answer_p4`      | texto  | Respuesta de la pregunta 4 (obligatorio)               |
| `sessionId`      | texto  | ID único de la sesión (máx. 64 caracteres)             |

## Cómo agregar un campo más (ejemplo)

1. En `js/form.js`, agregá al array `QUESTIONS`:

   ```js
   { id: "p5", type: "radio", label: "¿Nueva pregunta?*", options: ["A", "B"] },
   ```

2. En `apps-script/Code.js`, agregá la clave a `ANSWER_KEYS` y el encabezado a
   `HEADERS`, en el mismo lugar de ambas listas:

   ```js
   var ANSWER_KEYS = [..., "answer_p5"];
   var HEADERS = [..., "Pregunta 5"]; // (misma posición)
   ```

3. Borrá la pestaña `Respuestas` y ejecutá `setup()` de nuevo para que la hoja
   se recree con los encabezados actualizados.

> Nota de migración: si la app ya tiene datos en la pestaña `Respuestas`,
> borrar esa pestaña y reejecutar `setup()` recrea la estructura nueva pero
> **elimina las filas existentes**. Es lo recomendado durante el armado/producción
> inicial. Si querés conservar filas antiguas, exportalas antes.