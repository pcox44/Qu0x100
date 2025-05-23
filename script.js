"use strict";

const startDate = new Date(2025, 4, 15); // May 15, 2025 (month is 0-based)
const today = new Date();
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Calculate the number of days between startDate and today (inclusive)
function daysBetween(start, end) {
  return Math.floor((end - start) / MS_PER_DAY);
}

const totalDays = daysBetween(startDate, today) + 1;

let currentDayIndex = totalDays - 1; // default to today

// Dice colors mapping for dice face value
const diceColors = {
  1: { bg: "red", fg: "white" },
  2: { bg: "white", fg: "black" },
  3: { bg: "blue", fg: "white" },
  4: { bg: "yellow", fg: "black" },
  5: { bg: "green", fg: "white" },
  6: { bg: "black", fg: "yellow" },
};

const diceContainer = document.getElementById("dice-container");
const operatorRow = document.getElementById("operator-row");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("output-box");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const backspaceBtn = document.getElementById("backspace-btn");
const dateDisplay = document.getElementById("date-display");
const targetNumberSpan = document.getElementById("target-number");
const dailyBestScoreDiv = document.getElementById("daily-best-score");
const qu0xMasterDiv = document.getElementById("qu0x-master");
const qu0xCompletionSpan = document.getElementById("qu0x-fraction");
const qu0xPopup = document.getElementById("qu0x-popup");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const dayDropdown = document.getElementById("day-dropdown");

let diceValues = [];
let expression = "";
let usedDice = new Set();
let lockedDays = {}; // dayIndex: { expression, score }
let dailyBestScores = {}; // dayIndex: bestScore (lowest difference)
let dailyQu0x = {}; // dayIndex: boolean (true if qu0x achieved)

// Utility functions for date formatting
function formatDate(date) {
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getDateForIndex(index) {
  const d = new Date(startDate.getTime() + index * MS_PER_DAY);
  return d;
}

function getStorageKey(dayIndex) {
  return `qu0x_day_${dayIndex}`;
}

function getLockedStorageKey() {
  return "qu0x_locked_days";
}

function getBestScoresKey() {
  return "qu0x_best_scores";
}

function getQu0xCompletionKey() {
  return "qu0x_completion";
}

// Save locked days and best scores to localStorage
function saveLockedDays() {
  localStorage.setItem(getLockedStorageKey(), JSON.stringify(lockedDays));
}

function loadLockedDays() {
  const data = localStorage.getItem(getLockedStorageKey());
  if (data) lockedDays = JSON.parse(data);
}

function saveBestScores() {
  localStorage.setItem(getBestScoresKey(), JSON.stringify(dailyBestScores));
}

function loadBestScores() {
  const data = localStorage.getItem(getBestScoresKey());
  if (data) dailyBestScores = JSON.parse(data);
}

function saveQu0xCompletion() {
  localStorage.setItem(getQu0xCompletionKey(), JSON.stringify(dailyQu0x));
}

function loadQu0xCompletion() {
  const data = localStorage.getItem(getQu0xCompletionKey());
  if (data) dailyQu0x = JSON.parse(data);
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function safeEval(expr) {
  // Allowed characters: digits, + - * / ^ ( ) !
  // Check for invalid characters
  if (/[^0-9+\-*/^()!.\s]/.test(expr)) return NaN;

  // Replace ^ with ** for exponentiation in JS
  expr = expr.replace(/\^/g, "**");

  // Handle factorial: find all occurrences of <number>! and replace with factorial value
  // Use regex to match numbers followed by '!'
  // Use a loop to replace all factorial expressions from right to left to handle nested factorials
  while (true) {
    const match = expr.match(/(\d+)!/);
    if (!match) break;
    const num = parseInt(match[1], 10);
    const factVal = factorial(num);
    if (isNaN(factVal)) return NaN;
    expr = expr.replace(match[0], factVal);
  }

  try {
    const val = eval(expr);
    if (typeof val === "number" && isFinite(val)) return val;
    return NaN;
  } catch {
    return NaN;
  }
}

function generateDice(seed) {
  // Deterministic dice generation based on seed (day index)
  // Use simple PRNG with seed
  function mulberry32(a) {
    return function() {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rng = mulberry32(seed + 123456789);

  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(rng() * 6) + 1);
  }
  return dice;
}

function generateTarget(seed) {
  // Generate a target number between 1 and 100 based on seed
  const rng = (function () {
    function mulberry32(a) {
      return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    return mulberry32(seed + 987654321);
  })();

  return Math.floor(rng() * 100) + 1;
}

function createDiceElements() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, idx) => {
    const die = document.createElement("div");
    die.className = `die die-${val}`;
    die.textContent = val;
    if (usedDice.has(idx)) {
      die.classList.add("fade-out");
    }
    die.title = "Click to use this die value";
    die.addEventListener("click", () => {
      if (isDayLocked()) return;
      if (!usedDice.has(idx)) {
        expression += val.toString();
        usedDice.add(idx);
        updateExpression();
        createDiceElements();
      }
    });
    diceContainer.appendChild(die);
  });
}

function createOperatorButtons() {
  const operators = ["+", "-", "*", "/", "^", "(", ")", "!"];
  operatorRow.innerHTML = "";
  operators.forEach(op => {
    const btn = document.createElement("button");
    btn.className = "operator-button";
    btn.textContent = op;
    btn.title = op === "!" ? "Factorial (only on whole non-negative integers)" : `Operator ${op}`;
    btn.addEventListener("click", () => {
      if (isDayLocked()) return;
      expression += op;
      updateExpression();
    });
    operatorRow.appendChild(btn);
  });
}

function updateExpression() {
  expressionBox.textContent = expression || "";
  updateOutput();
}

function updateOutput() {
  const val = safeEval(expression);
  if (isNaN(val)) {
    outputBox.textContent = "?";
  } else {
    outputBox.textContent = val.toFixed(4).replace(/\.?0+$/, "");
  }
}

function calculateScore(val, target) {
  return Math.abs(val - target);
}

function isDayLocked() {
  return dailyQu0x[currentDayIndex] === true;
}

function lockDay() {
  dailyQu0x[currentDayIndex] = true;
  lockedDays[currentDayIndex] = { expression, score: 0 };
  saveLockedDays();
  saveQu0xCompletion();
  updateUI();
}

function updateUI() {
  // Update date display
  const currentDate = getDateForIndex(currentDayIndex);
  dateDisplay.textContent = formatDate(currentDate);

  // Update dice and target
  diceValues = generateDice(currentDayIndex);
  createDiceElements();

  const target = generateTarget(currentDayIndex);
  targetNumberSpan.textContent = target;

  // Load previous best score for the day
  const best = dailyBestScores[currentDayIndex];
  if (best === undefined) {
    dailyBestScoreDiv.textContent = "No best score yet";
  } else if (best === 0) {
    dailyBestScoreDiv.textContent = "Perfect Qu0x!";
  } else {
    dailyBestScoreDiv.textContent = `Best Score: ${best}`;
  }

  // Reset expression and used dice if not locked
  if (isDayLocked()) {
    expression = lockedDays[currentDayIndex]?.expression || "";
    expressionBox.textContent = expression;
    updateOutput();
    submitBtn.disabled = true;
    clearBtn.disabled = true;
    backspaceBtn.disabled = true;
  } else {
    expression = "";
    usedDice.clear();
    updateExpression();
    submitBtn.disabled = false;
    clearBtn.disabled = false;
    backspaceBtn.disabled = false;
  }

  // Update Qu0x master score and fraction
  const completedCount = Object.values(dailyQu0x).filter(Boolean).length;
  qu0xCompletionSpan.textContent = `${completedCount} / ${totalDays}`;

  // Qu0x Master Score is sum of best scores for all solved days or "N/A"
  if (completedCount === totalDays) {
    const sumScores = Object.values(dailyBestScores).reduce((a, b) => a + b, 0);
    qu0xMasterDiv.textContent = `Qu0x Master Score: ${sumScores}`;
  } else {
    qu0xMasterDiv.textContent = `Qu0x Master Score: N/A`;
  }

  updateDropdown();
}

function updateDropdown() {
  dayDropdown.innerHTML = "";
  for (let i = 0; i < totalDays; i++) {
    const option = document.createElement("option");
    option.value = i;
    const d = getDateForIndex(i);
    let prefix = "";
    if (dailyQu0x[i]) prefix = "⭐ "; // Qu0x!
    else if (dailyBestScores[i] !== undefined) prefix = "✔️ "; // solved but not perfect
    option.textContent = `${prefix}${formatDate(d)}`;
    if (i === currentDayIndex) option.selected = true;
    dayDropdown.appendChild(option);
  }
}

function submitExpression() {
  if (isDayLocked()) return;

  const val = safeEval(expression);
  if (isNaN(val)) {
    alert("Invalid expression or evaluation error.");
    return;
  }

  const target = generateTarget(currentDayIndex);
  const score = calculateScore(val, target);

  // Show result and score
  outputBox.textContent = val.toFixed(4).replace(/\.?0+$/, "") + ` =`;

  if (score === 0) {
    // Qu0x achieved
    alert("🎉 Qu0x! Perfect score achieved!");
    showQu0xAnimation();
    lockDay();
    dailyBestScores[currentDayIndex] = 0;
  } else {
    alert(`Score: ${score} (difference from target ${target})`);
    if (
      dailyBestScores[currentDayIndex] === undefined ||
      score < dailyBestScores[currentDayIndex]
    ) {
      dailyBestScores[currentDayIndex] = score;
    }
  }
  saveBestScores();
  updateUI();
}

function clearExpression() {
  if (isDayLocked()) return;
  expression = "";
  usedDice.clear();
  updateExpression();
  createDiceElements();
}

function backspaceExpression() {
  if (isDayLocked()) return;
  if (expression.length === 0) return;

  // Remove last character and if it was a die value, mark that die unused again
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Check if lastChar is a digit that matches a dice value and restore that die
  // Because dice values can repeat, we check the rightmost used die with that value and remove it from usedDice
  if (/\d/.test(lastChar)) {
    const digit = parseInt(lastChar, 10);
    // Find used dice with that value, remove the last used
    let lastUsedDieIndex = -1;
    Array.from(usedDice).forEach((dieIdx) => {
      if (diceValues[dieIdx] === digit) {
        if (dieIdx > lastUsedDieIndex) lastUsedDieIndex = dieIdx;
      }
    });
    if (lastUsedDieIndex !== -1) {
      usedDice.delete(lastUsedDieIndex);
    }
  }

  updateExpression();
  createDiceElements();
}

function showQu0xAnimation() {
  qu0xPopup.style.display = "block";
  setTimeout(() => {
    qu0xPopup.style.display = "none";
  }, 3000);
}

function prevDay() {
  if (currentDayIndex > 0) {
    currentDayIndex--;
    updateUI();
  }
}

function nextDay() {
  if (currentDayIndex < totalDays - 1) {
    currentDayIndex++;
    updateUI();
  }
}

function onDropdownChange() {
  const val = parseInt(dayDropdown.value, 10);
  if (!isNaN(val)) {
    currentDayIndex = val;
    updateUI();
  }
}

// Initialization
function init() {
  loadLockedDays();
  loadBestScores();
  loadQu0xCompletion();
  createOperatorButtons();
  updateUI();

  submitBtn.addEventListener("click", submitExpression);
  clearBtn.addEventListener("click", clearExpression);
  backspaceBtn.addEventListener("click", backspaceExpression);
  prevBtn.addEventListener("click", prevDay);
  nextBtn.addEventListener("click", nextDay);
  dayDropdown.addEventListener("change", onDropdownChange);
}

init();
