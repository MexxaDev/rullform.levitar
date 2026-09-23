/**
 * form.js — Configuración, renderizado y validación del formulario.
 *
 * CÓMO AGREGAR UN CAMPO:
 *   Agregar un objeto a QUESTIONS. "id" debe ser único y el orden
 *   debe coincidir con ANSWER_KEYS en apps-script/Code.js (mismas columnas).
 *
 *   Tipos soportados:
 *   - { type: "text" }  → campo de texto libre (ej. Nombre)
 *   - { type: "tel" }   → campo de teléfono (teclado numérico en móvil)
 *   - { type: "radio" } → pregunta multiple choice (options: [...])
 *   - { type: "note" }  → texto informativo, no se guarda
 *
 *   La respuesta de cada campo se guarda en App.answers[id].
 */

"use strict";

// Configuración del formulario — editar acá.
const QUESTIONS = [
  { id: "nombre", type: "text", label: "Nombre*", placeholder: "Escribí tu nombre", autocomplete: "given-name" },
  { id: "apellido", type: "text", label: "Apellido*", placeholder: "Escribí tu apellido", autocomplete: "family-name" },
  { id: "telefono", type: "tel", label: "Teléfono de contacto*", placeholder: "Escribí tu teléfono", autocomplete: "tel" },
  { id: "contacto-note", type: "note", text: "Usaremos estos datos para enviarte increíbles descuentos 🎁" },
  {
    id: "p1",
    type: "radio",
    label: "¿Cuántos años cumplimos este año?*",
    options: ["15 años", "19 años", "16 años"],
  },
  {
    id: "p2",
    type: "radio",
    label: "¿Cuál es la dirección de nuestro primer local?*",
    options: ["Ituzaingo 1418", "Castellano 1250", "Balcarce 1343"],
  },
  {
    id: "p3",
    type: "radio",
    label: "¿Qué colores llevan nuestras bolsas?*",
    options: ["Magenta y Blanco", "Rojo y Cremita", "Rosado y Blanco"],
  },
  {
    id: "p4",
    type: "radio",
    label: "¿Entre qué calles se encuentra nuestro local hoy en día?*",
    options: ["Guemes y Avellaneda", "Lavalle y Guemes", "Güemes y Dorrego"],
  },
];

// Contenedor donde se inyectan las preguntas.
const questionsContainer = document.getElementById("questions");
const form = document.getElementById("quiz-form");
const formError = document.getElementById("form-error");

/**
 * Crea un campo de texto (label visible + input).
 */
function renderTextField(question) {
  const wrap = document.createElement("div");
  wrap.className = "question question--text";
  wrap.id = `field-${question.id}`;

  const label = document.createElement("label");
  label.className = "question__label";
  label.htmlFor = question.id;
  label.textContent = question.label;
  wrap.appendChild(label);

  const input = document.createElement("input");
  input.className = "question__input";
  input.type = question.type === "tel" ? "tel" : "text";
  input.id = question.id;
  input.name = question.id;
  if (question.placeholder) input.placeholder = question.placeholder;
  if (question.autocomplete) input.setAttribute("autocomplete", question.autocomplete);
  if (question.type === "tel") input.setAttribute("inputmode", "tel");
  wrap.appendChild(input);

  return wrap;
}

/**
 * Crea una pregunta multiple choice (fieldset con radios).
 */
function renderRadioQuestion(question) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "question";
  fieldset.id = `field-${question.id}`;

  const legend = document.createElement("legend");
  legend.className = "question__label";
  legend.textContent = question.label;
  fieldset.appendChild(legend);

  question.options.forEach((option, index) => {
    const label = document.createElement("label");
    label.className = "question__option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = question.id;
    radio.value = option;
    radio.id = `${question.id}-${index}`;

    const span = document.createElement("span");
    span.textContent = option;

    label.appendChild(radio);
    label.appendChild(span);
    fieldset.appendChild(label);
  });

  return fieldset;
}

/**
 * Renderiza todas las preguntas en el contenedor.
 */
function renderForm() {
  QUESTIONS.forEach((question) => {
    let element;
    if (question.type === "note") {
      element = document.createElement("p");
      element.className = "form-note";
      element.textContent = question.text;
    } else if (question.type === "radio") {
      element = renderRadioQuestion(question);
    } else {
      element = renderTextField(question);
    }
    questionsContainer.appendChild(element);
  });
}

/**
 * Devuelve las respuestas: { idCampo: valor, ... }
 * Solo incluye campos respondidos (los radios y textos vacíos quedan fuera).
 */
function collectAnswers() {
  const answers = {};
  QUESTIONS.forEach((question) => {
    if (question.type === "radio") {
      const checked = document.querySelector(`input[name="${question.id}"]:checked`);
      if (checked) {
        answers[question.id] = checked.value;
      }
    } else if (question.type === "text" || question.type === "tel") {
      const value = document.getElementById(question.id).value.trim();
      if (value) {
        answers[question.id] = value;
      }
    }
    // type "note" se ignora: es solo informativo.
  });
  return answers;
}

/**
 * Marca visualmente los campos que faltan completar.
 * Devuelve true si todo está completo.
 */
function validateAndHighlight() {
  const answers = collectAnswers();
  let firstInvalid = null;

  QUESTIONS.forEach((question) => {
    if (question.type === "note") return;

    const container = document.getElementById(`field-${question.id}`);
    const isComplete = Object.prototype.hasOwnProperty.call(answers, question.id);

    container.classList.toggle("question--invalid", !isComplete);

    if (!isComplete && !firstInvalid) {
      firstInvalid = container;
    }
  });

  return { ok: !firstInvalid, firstInvalid, answers };
}

// --- Eventos ---

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const { ok, firstInvalid, answers } = validateAndHighlight();

  if (!ok) {
    formError.textContent = "Completá todos los campos para continuar.";
    formError.hidden = false;
    firstInvalid.querySelector("input").focus();
    return;
  }

  // Guardar respuestas en la fuente única de verdad de la app.
  App.answers = answers;
  App.showScreen(App.SCREENS.ROULETTE);
});

// Al volver a responder, limpiar el error general.
questionsContainer.addEventListener("input", () => {
  formError.hidden = true;
});

renderForm();