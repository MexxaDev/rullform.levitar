/**
 * roulette.js — Ruleta SVG con animación sincronizada con el resultado.
 *
 * CÓMO CAMBIAR EL RANGO/SECTORES:
 *   Editar SECTOR_VALUES. Ej: [1,2,3,4,5,6] o ["A","B","C"].
 *   Se dibujan automáticamente el mismo número de sectores.
 *
 * SINCRONIZACIÓN:
 *   1) se elige el resultado primero (aleatorio),
 *   2) se calcula la rotación final exacta que deja ESE sector bajo el puntero,
 *   3) se anima hasta ese ángulo. El valor lógico y el visual siempre coinciden.
 */

"use strict";

// Configuración de la ruleta — editar acá.
const SECTOR_VALUES = ["5% OFF", "10% OFF", "15% OFF", "20% OFF"];
const SECTOR_FILLS = ["#cca6a3", "#ffffff"]; // se alternan por sector

const SPIN_FULL_TURNS = 5; // vueltas completas para un giro con ritmo
const SPIN_DURATION_MS = 4200;

// Radios de la rueda (viewBox 200x200, centro 100,100).
const RADIUS = 92;
const TEXT_RADIUS = 60;

const wheelEl = document.getElementById("wheel");
const spinButton = document.getElementById("spin-btn");
const rouletteResult = document.getElementById("roulette-result");
const resultValue = document.getElementById("result-value");

const SECTOR_ANGLE = 360 / SECTOR_VALUES.length;
let canSpin = true;

/**
 * Crea el wheel (sectores + números) dentro del <g>.
 * El sector i queda centrado a SECTOR_ANGLE * i grados en sentido horario
 * respecto del puntero (arriba = 0°).
 */
function buildWheel() {
  const svgNS = "http://www.w3.org/2000/svg";
  const half = SECTOR_ANGLE / 2;

  document
    .querySelector(".roulette__svg")
    .setAttribute("aria-label", `Ruleta con ${SECTOR_VALUES.length} resultados`);

  SECTOR_VALUES.forEach((value, i) => {
    // --- Cuña: sector centrado en el tope (±half), luego rotado a su lugar.
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("transform", `rotate(${i * SECTOR_ANGLE} 100 100)`);

    const path = document.createElementNS(svgNS, "path");
    const a1 = (-90 - half) * (Math.PI / 180);
    const a2 = (-90 + half) * (Math.PI / 180);
    const x1 = 100 + RADIUS * Math.cos(a1);
    const y1 = 100 + RADIUS * Math.sin(a1);
    const x2 = 100 + RADIUS * Math.cos(a2);
    const y2 = 100 + RADIUS * Math.sin(a2);
    path.setAttribute("d", `M100 100 L${x1.toFixed(2)} ${y1.toFixed(2)} A${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`);
    path.setAttribute("fill", SECTOR_FILLS[i % SECTOR_FILLS.length]);
    path.setAttribute("stroke", "#ffffff");
    path.setAttribute("stroke-width", "1");
    group.appendChild(path);
    wheelEl.appendChild(group);

    // --- Número: texto siempre en horizontal (no rota con la rueda).
    const centerAngle = (-90 + i * SECTOR_ANGLE) * (Math.PI / 180);
    const nx = 100 + TEXT_RADIUS * Math.cos(centerAngle);
    const ny = 100 + TEXT_RADIUS * Math.sin(centerAngle);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", nx.toFixed(2));
    text.setAttribute("y", ny.toFixed(2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", "#292322");
    text.setAttribute("font-size", "14");
    text.setAttribute("font-weight", "600");
    text.textContent = value;
    wheelEl.appendChild(text);
  });
}

/**
 * Devuelve la rotación final (grados) que deja el sector del valor dado
 * centrado bajo el puntero, con un pequeño desvío aleatorio dentro del sector.
 */
function angleForValue(index) {
  // El sector está dibujado a `center` grados en sentido horario del puntero.
  // Para dejarlo bajo el puntero, la rueda debe rotar a -center (+ vueltas).
  const center = index * SECTOR_ANGLE;
  const jitter = (Math.random() - 0.5) * (SECTOR_ANGLE - 6); // dentro del sector
  return SPIN_FULL_TURNS * 360 - center + jitter;
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function spin() {
  if (!canSpin) return;

  // 1) Resultado primero (fuente única de verdad).
  const index = Math.floor(Math.random() * SECTOR_VALUES.length);
  const result = SECTOR_VALUES[index];

  // 2) Cancelar transición previa (si la hubiera) y fijar origen de rotación.
  wheelEl.style.transition = "none";
  wheelEl.style.transformOrigin = "100px 100px";
  wheelEl.style.transform = "rotate(0deg)";

  // Forzar reflow para que el reset se aplique antes de animar.
  void wheelEl.getBoundingClientRect();

  // 3) Animar.
  const target = angleForValue(index);
  if (reduceMotion()) {
    wheelEl.style.transition = "none";
    wheelEl.style.transform = `rotate(${target}deg)`;
  } else {
    wheelEl.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.85, 0.12, 0.99)`;
    wheelEl.style.transform = `rotate(${target}deg)`;
  }

  canSpin = false;
  spinButton.disabled = true;

  // 4) Al terminar la animación: fijar resultado y mostrarlo.
  const finish = () => {
    wheelEl.removeEventListener("transitionend", finish);
    wheelEl.style.transition = "none";
    wheelEl.style.transform = `rotate(${target % 360}deg)`; // acomodar el ángulo final
    showResult(result);
  };

  if (reduceMotion()) {
    finish();
  } else {
    wheelEl.addEventListener("transitionend", finish);
  }
}

function showResult(result) {
  App.result = result;
  resultValue.textContent = result;
  rouletteResult.hidden = false;

  // Fase 4: tras un breve momento para apreciar el giro, mostrar la
  // pantalla de resultado con el botón ENVIAR RESULTADO.
  setTimeout(() => {
    document.getElementById("result-big").textContent = result;
    App.showScreen(App.SCREENS.RESULT);
  }, 1200);
}

spinButton.addEventListener("click", spin);

buildWheel();