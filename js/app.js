/**
 * app.js — Máquina de estados de la SPA.
 * Estados: welcome → form → roulette → result → submitting → success | error
 * (Fase 1: solo welcome → form)
 */

"use strict";

// IDs de todas las pantallas (secciones en index.html).
// Agregar una pantalla nueva = agregar su <section> y su ID acá.
const SCREENS = {
  WELCOME: "welcome",
  FORM: "form",
  ROULETTE: "roulette",
  RESULT: "result",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  ERROR: "error",
};

// Estado actual de la aplicación. Fuente única de verdad.
let currentState = SCREENS.WELCOME;

// Identificador único de sesión en el navegador (§11).
const sessionId = (typeof crypto !== "undefined" && crypto.randomUUID)
  ? crypto.randomUUID()
  : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Respuestas del formulario (las completa form.js), resultado de la ruleta
// (lo fija roulette.js una vez que termina el giro) y control de envío.
const App = {
  SCREENS,
  answers: {},
  result: null,
  sessionId,
  submitted: false,
  showScreen,
};

document.querySelectorAll(".screen__title").forEach((title) => {
  title.setAttribute("tabindex", "-1");
});

// ============================================
// ENVÍO (Fase 4: mock — en Fase 6 se reemplaza el cuerpo de sendToSheets)
// ============================================

const submitButton = document.getElementById("submit-btn");
const submitError = document.getElementById("submit-error");
// URL de la aplicación web de Apps Script (SETUP.md, paso 18).
const SEND_URL = "https://script.google.com/macros/s/AKfycbwOSMwLyfDm8CW_vEg-Ixtlm-jE9FTMHuL14JP29MYkQ1McQiFcCySA1X2to9pmuJaKow/exec";

// Tiempo máximo de espera antes de mostrar ERROR y permitir reintentar.
const SEND_TIMEOUT_MS = 15000;

/**
 * Guardias previas al envío (§10): formulario completo,
 * resultado existente y no enviado anteriormente.
 */
function canSubmit() {
  // Ignorar ítems informativos (type "note"): no son respuestas.
  const formComplete = QUESTIONS
    .filter((q) => q.type !== "note")
    .every((q) => Object.prototype.hasOwnProperty.call(App.answers, q.id));
  const hasResult = App.result !== null && App.result !== undefined;
  return formComplete && hasResult && !App.submitted;
}

/**
 * Envía los datos al backend de Apps Script y devuelve la respuesta.
 * Usa application/x-www-form-urlencoded (petición HTTP "simple",
 * sin preflight CORS).
 */
async function sendToSheets(payload) {
  // Armar los parámetros: cada respuesta como answer_<id>.
  const params = new URLSearchParams();
  params.set("result", String(payload.result));
  params.set("sessionId", payload.sessionId);
  Object.entries(payload.answers).forEach(([key, value]) => {
    params.set(`answer_${key}`, String(value));
  });

  // Timeout para no quedar en "ENVIANDO..." si la red cuelga.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(SEND_URL, {
      method: "POST",
      body: params.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  // El backend responde {ok:true} o {ok:false} (ambos con HTTP 200).
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Error del servidor");
  }
  return data;
}

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting;
  submitButton.setAttribute("aria-busy", String(isSubmitting));
  submitButton.textContent = isSubmitting ? "ENVIANDO..." : "ENVIAR RESULTADO";
}

function showSubmitError() {
  submitError.hidden = false;
}

async function submitResult() {
  if (!canSubmit()) {
    // Defender contra fallas en silencio: nunca bloquear el envío sin avisar.
    submitError.textContent =
      "Faltan completar datos. Volvé al formulario o girá la ruleta.";
    submitError.hidden = false;
    return;
  }

  submitError.hidden = true;
  setSubmitting(true);

  const payload = {
    sessionId: App.sessionId,
    answers: App.answers,
    result: App.result,
  };

  try {
    await sendToSheets(payload);
    App.submitted = true;
    App.showScreen(App.SCREENS.SUCCESS);
  } catch (err) {
    // ERROR: mostrar mensaje y permitir reintentar.
    submitError.textContent =
      "No se pudo enviar tu resultado. Revisá tu conexión y volvé a intentar.";
    showSubmitError();
    setSubmitting(false);
  }
}

submitButton.addEventListener("click", submitResult);

/**
 * Muestra una pantalla y oculta las demás.
 * @param {string} screenId - ID del <section> a mostrar.
 */
function showScreen(screenId) {
  const target = document.getElementById(screenId);
  if (!target) return;

  document.querySelectorAll(".screen").forEach((section) => {
    section.hidden = section.id !== screenId;
  });

  currentState = screenId;

  // Mover el foco al título de la nueva pantalla (accesibilidad + teclado).
  const title = target.querySelector(".screen__title");
  if (title) {
    title.setAttribute("tabindex", "-1");
    title.focus();
  }
}

// --- Eventos de la Fase 1 ---

document.querySelector('[data-action="start"]').addEventListener("click", () => {
  showScreen(SCREENS.FORM);
});

// Estado inicial.
showScreen(SCREENS.WELCOME);
