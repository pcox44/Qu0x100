"use strict";

// Constants
const START_DATE = new Date("2025-05-15");
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_DAYS = Math.floor((new Date() - START_DATE) / MS_PER_DAY) + 1;

// Dice color mapping for reference (also in CSS)
const DICE_VALUES = [1, 2, 3, 4, 5];

// Operators and buttons
const OPERATORS = [
  "+", "-", "*", "/", "^", "!", "(", ")", "Clear", "Backspace",
];

// State variables
let currentGameIndex = 0; // 0-based, 0 = 5/15/2025
let diceUsed = new Set();
let expression = "";
let target = 0;
let bestScores = {};
let qu0xDays = new Set();
let dailyBestScore = null;
let dailySolved = false;
let qu0xCompletionCount = 0;
let totalDays = MAX_DAYS;

const daySelect = document.getElementById("day-select");
const diceContainer = document.getElementById("dice-container");
const targetBox = document.getElementById("target-box");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("output-box");
const operatorRow = document.getElementById("operator-row");
const submitBtn = document.getElementById("submit-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const gameNumberDate = document.getElementById("game-number-date");
const dayDropdown = document.getElementById("day-select");
const qu0xCompletion = document.getElementById("qu0x-completion");
const qu0xMaster = document.getElementById("qu0x-master");
const dailyBestScoreDisplay = document.getElementById("daily-best-score");
const qu0xPopup = document.getElementById("qu0x-popup");

// Utility functions
function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDateForGame(index) {
  let d = new Date(START_DATE);
  d.setDate(d.getDate() + index);
  return d;
}

function getSeedForDate(date) {
  // Seed is yyyymmdd as number
  return (
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate()
  );
}

function seededRandom(seed) {
  // Simple xorshift or linear congruential generator
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return function () {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

function getTargetNumber(seedRandom) {
  // Random target from 1 to 100 inclusive
  return 1 + Math.floor(seedRandom() * 100);
}

function generateDice(seedRandom) {
  // Five dice numbers 1-6 inclusive
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(seedRandom() * 6));
  }
  return dice;
}

function updateGameNumberDate() {
  const gameNum = currentGameIndex + 1;
  const date = getDateForGame(currentGameIndex);
  gameNumberDate.textContent = `Game #${gameNum} — ${formatDate(date)}`;
}

function updateDropdown() {
  // Clear existing options
  daySelect.innerHTML = "";

  for (let i = 0; i < MAX_DAYS; i++) {
    const option = document.createElement("option");
    const date = getDateForGame(i);
    option.value = i;
    option.textContent = formatDate(date);

    // Emoji rules
    if (qu0xDays.has(i)) {
      option.textContent = `⭐ ${option.textContent}`;
    } else if (bestScores[i] !== undefined) {
      option.textContent = `✔ (${bestScores[i]}) ${option.textContent}`;
    } else {
      // no emoji
    }

    if (i === currentGameIndex) option.selected = true;
    daySelect.appendChild(option);
  }
}

function updateDiceDisplay() {
  diceContainer.innerHTML = "";
  diceUsed.clear();

  const seed = getSeedForDate(getDateForGame(currentGameIndex));
  const seedRand = seededRandom(seed);

  // Generate dice values for current day
  const dice = generateDice(seedRand);

  for (let i = 0; i < dice.length; i++) {
    const val = dice[i];
    const die = document.createElement("div");
    die.classList.add("die");
    die.dataset.value = val;
    die.textContent = val;
    die.title = `Dice value ${val}`;
    die.tabIndex = 0;
    die.addEventListener("click", () => {
      if (!diceUsed.has(i)) {
        diceUsed.add(i);
        die.classList.add("faded");
        appendToExpression(val.toString());
        updateOutputBox();
        updateOperatorsEnabled();
      }
    });
    diceContainer.appendChild(die);
  }
}

function appendToExpression(str) {
  expression += str;
  updateExpressionBox();
}

function updateExpressionBox() {
  expressionBox.textContent = expression;
}

function updateOutputBox() {
  const val = evaluateExpression(expression);
  outputBox.textContent = val === null ? "?" : val;
}

function evaluateExpression(expr) {
  if (!expr || expr.trim() === "") return "";

  // Replace ^ with ** for exponentiation in JS eval
  let jsExpr = expr.replace(/\^/g, "**");

  // Replace factorials n! with factorial function calls
  // Use RegExp to replace all occurrences
  jsExpr = jsExpr.replace(/(\d+)!/g, (match, number) => {
    return `factorial(${number})`;
  });

  // Block invalid characters
  if (/[^0-9+\-*/^()! ]/.test(jsExpr)) {
    return null;
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = Function("factorial", `return ${jsExpr}`)(factorial);
    if (typeof result === "number" && Number.isFinite(result)) {
      return Math.round(result * 1000) / 1000; // Round to 3 decimals
    }
    return null;
  } catch (e) {
    return null;
  }
}

function factorial(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 0 || n > 12) return NaN; // safe upper limit
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function updateOperatorsEnabled() {
  const buttons = operatorRow.querySelectorAll("button");
  const diceCount = 5;

  // Enable 'Clear' always
  buttons.forEach((btn) => {
    if (btn.textContent === "Clear" || btn.textContent === "Backspace") {
      btn.disabled = false;
      return;
    }
    // Only enable operators if there is at least one die used
    btn.disabled = expression.length === 0;
  });
}

function updateDailyBestAndCompletion() {
  if (dailyBestScore === null) {
    dailyBestScoreDisplay.textContent = "Daily Best Score: N/A";
  } else {
    dailyBestScoreDisplay.textContent = `Daily Best Score: ${dailyBestScore}`;
  }

  qu0xCompletionCount = qu0xDays.size;
  qu0xCompletion.textContent = `Qu0x Completion: ${qu0xCompletionCount}/${totalDays}`;

  if (qu0xCompletionCount === totalDays) {
    const masterScoreSum = Object.values(bestScores).reduce(
      (a, b) => a + b,
      0
    );
    qu0xMaster.textContent = `Qu0x Master Score: ${masterScoreSum}`;
  } else {
    qu0xMaster.textContent = `Qu0x Master Score: N/A`;
  }
}

function clearExpression() {
  expression = "";
  updateExpressionBox();
  updateOutputBox();
  updateOperatorsEnabled();
  // Reset dice usage & fade
  diceUsed.clear();
  diceContainer.querySelectorAll(".die").forEach((die) => {
    die.classList.remove("faded");
  });
}

function initOperatorButtons() {
  operatorRow.innerHTML = "";
  OPERATORS.forEach((op) => {
    const btn = document.createElement("button");
    btn.className = "operator-btn";
    btn.textContent = op;
    btn.type = "button";
    btn.title = op === "Clear" ? "Clear expression" : op === "Backspace" ? "Delete last character" : `Add ${op} to expression`;

    btn.addEventListener("click", () => {
      if (op === "Clear") {
        clearExpression();
      } else if (op === "Backspace") {
        if (expression.length > 0) {
          expression = expression.slice(0, -1);
          updateExpressionBox();
          updateOutputBox();
          updateOperatorsEnabled();
          // Check if removed last dice number -> unfade dice accordingly
          updateDiceFadeAfterBackspace();
        }
      } else {
        // Only allow operator buttons if expression non-empty except factorial can be added always?
        if (expression.length > 0 || op === "!") {
          appendToExpression(op);
          updateOutputBox();
          updateOperatorsEnabled();
        }
      }
    });
    operatorRow.appendChild(btn);
  });
}

function updateDiceFadeAfterBackspace() {
  // After backspace, re-check which dice numbers are still used
  // Because dice input is clickable only and dice numbers appended
  // We can't precisely map characters to dice used if operators or multiple-digit numbers exist
  // We'll reset usage and re-apply fade from current expression digits

  diceUsed.clear();
  diceContainer.querySelectorAll(".die").forEach((die) => {
    die.classList.remove("faded");
  });

  // For each digit 1-6 in expression, mark one die with that value as used
  // This may be imprecise if multiple dice have same number and expression uses fewer dice
  // But it's acceptable approximation here

  const exprDigits = expression.match(/[1-6]/g) || [];

  const diceElements = Array.from(diceContainer.querySelectorAll(".die"));
  exprDigits.forEach((digitChar) => {
    const digit = Number(digitChar);
    for (let i = 0; i < diceElements.length; i++) {
      const die = diceElements[i];
      if (!diceUsed.has(i) && Number(die.dataset.value) === digit) {
        diceUsed.add(i);
        die.classList.add("faded");
        break;
      }
    }
  });
}

function lockDayIfQu0x() {
  if (dailyBestScore === 0) {
    dailySolved = true;
    submitBtn.disabled = true;
  } else {
    dailySolved = false;
    submitBtn.disabled = false;
  }
}

function submitExpression() {
  if (expression.trim() === "") return;

  const val = evaluateExpression(expression);
  if (val === null) {
    alert("Invalid expression.");
    return;
  }

  const score = Math.abs(val - target);

  if (dailySolved) {
    alert("This day is locked because you have achieved a perfect Qu0x!");
    return;
  }

  // Update best score
  if (bestScores[currentGameIndex] === undefined || score < bestScores[currentGameIndex]) {
    bestScores[currentGameIndex] = score;
  }

  dailyBestScore = bestScores[currentGameIndex];

  // Check if perfect score (Qu0x)
  if (score === 0) {
    qu0xDays.add(currentGameIndex);
    showQu0xPopup();
    lockDayIfQu0x();
  }

  updateDailyBestAndCompletion();
  updateDropdown();
  alert(`Your expression evaluates to ${val}.\nTarget: ${target}\nScore (difference): ${score}`);
}

function showQu0xPopup() {
  qu0xPopup.style.display = "block";
  setTimeout(() => {
    qu0xPopup.style.display = "none";
  }, 3000);
}

function loadGame(index) {
  if (index < 0 || index >= MAX_DAYS) return;

  currentGameIndex = index;
  clearExpression();

  const date = getDateForGame(index);
  const seed = getSeedForDate(date);
  const seedRand = seededRandom(seed);

  target = getTargetNumber(seedRand);

  updateGameNumberDate();
  updateDropdown();
  updateDiceDisplay();
  updateOperatorsEnabled();

  dailyBestScore = bestScores[currentGameIndex] ?? null;
  lockDayIfQu0x();
  updateDailyBestAndCompletion();
}

function init() {
  initOperatorButtons();

  daySelect.addEventListener("change", (e) => {
    loadGame(Number(e.target.value));
  });

  prevBtn.addEventListener("click", () => {
    loadGame(currentGameIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    loadGame(currentGameIndex + 1);
  });

  submitBtn.addEventListener("click", () => {
    submitExpression();
  });

  loadGame(0);
}

window.onload = init;
