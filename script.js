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

  try {
    // Replace ^ with **
    expr = expr.replace(/\^/g, "**");

    // Handle factorials with a regex and replace with calls to factorial function
    expr = expr.replace(/(\d+|\([^()]+\))!/g, (match, p1) => {
      let val = 0;
      if (p1.startsWith("(")) {
        // Evaluate inside parentheses first
        val = safeEval(p1.slice(1, -1));
      } else {
        val = Number(p1);
      }
      let f = factorial(val);
      if (isNaN(f)) throw "Invalid factorial";
      return f.toString();
    });

    // Evaluate using Function constructor for safety (no access to globals)
    return Function(`"use strict";return (${expr})`)();
  } catch {
    return NaN;
  }
}

function generateDiceForDay(dayIndex) {
  // Seeded RNG based on dayIndex to generate same dice each day
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  let dice = [];
  let seed = dayIndex + 123456;
  for (let i = 0; i < 5; i++) {
    let val = Math.floor(seededRandom(seed + i) * 6) + 1;
    dice.push(val);
  }
  return dice;
}

function generateTargetForDay(dayIndex) {
  // Seeded target number between 1 and 100
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  let seed = dayIndex + 654321;
  let target = Math.floor(seededRandom(seed) * 100) + 1;
  return target;
}

function
