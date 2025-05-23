// Core variables
const diceContainer = document.getElementById("dice-container");
const operatorRow = document.getElementById("operator-row");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("output-box");
const dateDisplay = document.getElementById("date-display");
const submitBtn = document.getElementById("submit-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const bestScoreText = document.getElementById("best-score");
const qu0xMasterText = document.getElementById("qu0x-master");
const qu0xFractionText = document.getElementById("qu0x-fraction");
const popup = document.getElementById("qu0x-popup");

let expression = "";
let usedDice = [];
let dice = [];
let target = 0;
let currentDate = new Date();

const startDate = new Date(2025, 0, 1); // Jan 1, 2025
const today = new Date();
today.setHours(0, 0, 0, 0);

// Utility to get seed for a date (yyyymmdd as number)
function getSeedForDate(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return Number(`${y}${m}${d}`);
}

// Seeded random number generator (simple)
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate dice for a given seed
function rollDice(seed) {
  const result = [];
  let s = seed;
  for (let i = 0; i < 5; i++) {
    s += i * 37;
    const val = Math.floor(seededRandom(s) * 6) + 1;
    result.push(val);
  }
  return result;
}

// Generate target for a given seed
function generateTarget(seed) {
  return Math.floor(seededRandom(seed + 12345) * 90) + 10; // 10 to 99
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.classList.add("die");
    if (val === 6) die.classList.add("six");
    die.textContent = val;
    die.onclick = () => {
      if (usedDice.includes(i)) return;
      addToExpression(val.toString(), i);
    };
    if (usedDice.includes(i)) {
      die.classList.add("used");
    }
    diceContainer.appendChild(die);
  });
}

function renderOperators() {
  operatorRow.innerHTML = "";
  const ops = ["+", "-", "*", "/", "(", ")", "^", "!"];
  ops.forEach((op) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = op;
    btn.onclick = () => addToExpression(op, null);
    operatorRow.appendChild(btn);
  });

  // Backspace button
  const backBtn = document.createElement("button");
  backBtn.className = "btn";
  backBtn.textContent = "⌫";
  backBtn.onclick = backspace;
  operatorRow.appendChild(backBtn);

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.className = "btn";
  clearBtn.textContent = "Clear";
  clearBtn.onclick = clearExpression;
  operatorRow.appendChild(clearBtn);
}

function addToExpression(value, dieIndex) {
  // Prevent dice reuse
  if (dieIndex !== null && usedDice.includes(dieIndex)) return;

  // Prevent concatenation of dice numbers:
  // if last char is a number or !, and trying to add a number, block it
  const lastChar = expression.slice(-1);
  if (
    typeof value === "string" &&
    !isNaN(value) &&
    ((lastChar >= "0" && lastChar <= "9") || lastChar === "!")
  ) {
    return;
  }

  expression += value;
  expressionBox.textContent = expression;

  if (dieIndex !== null) {
    usedDice.push(dieIndex);
    renderDice();
  }

  evaluateExpression();
}

function evaluateExpression() {
  if (!expression) {
    outputBox.textContent = "";
    return;
  }
  try {
    const val = evaluate(expression);
    outputBox.textContent = val !== undefined ? val : "";
  } catch {
    outputBox.textContent = "Error";
  }
}

function backspace() {
  if (!expression) return;

  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  expressionBox.textContent = expression;

  if ("123456".includes(lastChar)) {
    // Remove the first used die with this value
    for (let i = 0; i < usedDice.length; i++) {
      if (dice[usedDice[i]].toString() === lastChar) {
        usedDice.splice(i, 1);
        break;
      }
    }
    renderDice();
  }

  evaluateExpression();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  expressionBox.textContent = "";
  outputBox.textContent = "";
  renderDice();
}

function factorial(n) {
  if (n < 0 || n % 1 !== 0) throw new Error("Invalid factorial");
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function evaluate(expr) {
  // Replace factorial expressions like (2+1)! or 3!
  const factRegex = /(\([^()]+\)|\d+)!/g;
  let replaced = expr.replace(factRegex, (match, g1) => {
    let val = Function(`"use strict";return (${g1})`)();
    return factorial(val).toString();
  });

  if (/[^0-9+\-*/().^ ]/.test(replaced)) throw new Error("Invalid characters");
  replaced = replaced.replace(/\^/g, "**");
  return Function(`"use strict";return (${replaced})`)();
}

function renderDate() {
  const y = currentDate.getFullYear();
  const m = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const d = currentDate.getDate().toString().padStart(2, "0");
  dateDisplay.textContent = `Game for: ${y}-${m}-${d}`;
}

function loadGame(date) {
  currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);

  const seed = getSeedForDate(currentDate);
  dice = rollDice(seed);
  target = generateTarget(seed);

  expression = "";
  usedDice = [];
  renderDate();
  renderDice();
  renderOperators();
  expressionBox.textContent = "";
  outputBox.textContent = "";
  bestScoreText.textContent = `Target: ${target}`;

  loadScores();
  updateButtons();
  evaluateExpression();
  updateQu0xCompletion();
}

function updateButtons() {
  // Disable prev if at start date
  prevBtn.disabled = currentDate <= startDate;
  // Disable next if at today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  nextBtn.disabled = currentDate >= tomorrow;
}

prevBtn.onclick = () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadGame(currentDate);
};

nextBtn.onclick = () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadGame(currentDate);
};

submitBtn.onclick = () => {
  if (!expression) return;
  if (usedDice.length !== dice.length) {
    alert("Use all dice exactly once.");
    return;
  }
  if (outputBox.textContent === "Error" || outputBox.textContent === "") {
    alert("Expression invalid.");
    return;
  }
  const score = Math.abs(target - Number(outputBox.textContent));
  saveScore(currentDate, score);

  if (score === 0) {
    lockDay(currentDate, expression);
    showPopup("Qu0x!");
  }

  loadScores();
};

function saveScore(date, score) {
  const key = date.toISOString().slice(0, 10);
  let stored = JSON.parse(localStorage.getItem("qu0x-scores") || "{}");
  if (!stored[key] || stored[key] > score) {
    stored[key] = score;
    localStorage.setItem("qu0x-scores", JSON.stringify(stored));
  }
}

function lockDay(date, solution) {
  const key = date.toISOString().slice(0, 10);
  let locked = JSON.parse(localStorage.getItem("qu0x-locked") || "{}");
  locked[key] = solution;
  localStorage.setItem("qu0x-locked", JSON.stringify(locked));
  updateButtons();
  loadScores();
}

function isDayLocked(date) {
  const key = date.toISOString().slice(0, 10);
  let locked = JSON.parse(localStorage.getItem("qu0x-locked") || "{}");
  return locked[key];
}

function loadScores() {
  const key = currentDate.toISOString().slice(0, 10);
  let storedScores = JSON.parse(localStorage.getItem("qu0x-scores") || "{}");
  let locked = JSON.parse(localStorage.getItem("qu0x-locked") || "{}");
  let score = storedScores[key];
  let lockedSolution = locked[key];

  if (lockedSolution) {
    expressionBox.textContent = lockedSolution;
    expression = lockedSolution;
    usedDice = dice.map((_, i) => i); // all dice used
    renderDice();
    submitBtn.disabled = true;
    bestScoreText.textContent = `Target: ${target} (LOCKED - Qu0x!)`;
  } else {
    submitBtn.disabled = false;
    bestScoreText.textContent = score === undefined ? `Target: ${target}` : `Target: ${target} | Best Score: ${score}`;
  }

  updateQu0xMaster();
}

function updateQu0xMaster() {
  let storedScores = JSON.parse(localStorage.getItem("qu0x-scores") || "{}");
  let locked = JSON.parse(localStorage.getItem("qu0x-locked") || "{}");

  // Count total games from startDate to today
  const diffDays = Math.floor((today - startDate) / (1000 * 3600 * 24)) + 1;

  // Count Qu0x (locked days)
  let qu0xCount = Object.keys(locked).length;

  // Update display with fraction and percentage
  const fractionText = `${qu0xCount} / ${diffDays}`;
  qu0xFractionText.textContent = fractionText;

  // Master score shown only if all games solved (qu0xCount === diffDays)
  if (qu0xCount === diffDays) {
    let sum = 0;
    Object.values(storedScores).forEach((v) => {
      sum += v;
    });
    qu0xMasterText.textContent = `Qu0x Master Score: ${sum}`;
  } else {
    qu0xMasterText.textContent = "Qu0x Master Score: N/A";
  }
}

function updateQu0xCompletion() {
  // Just update fraction (already done in updateQu0xMaster, so call that)
  updateQu0xMaster();
}

function showPopup(msg) {
  popup.textContent = msg;
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

// Initialize on load
window.onload = () => {
  loadGame(today);
};
