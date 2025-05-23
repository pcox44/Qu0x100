const diceContainer = document.getElementById("dice-container");
const operatorRow = document.getElementById("operator-row");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("output-box");
const submitBtn = document.getElementById("submit-btn");
const bestScoreText = document.getElementById("best-score");
const qu0xMasterText = document.getElementById("qu0x-master");
const totalQu0xText = document.getElementById("total-qu0x");
const popup = document.getElementById("qu0x-popup");
const dateDisplay = document.getElementById("date-display");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

let usedDice = [];
let expression = "";
let dice = [];
let target = 0;
let currentDate = new Date();

const startDate = new Date("2025-05-15T00:00:00");
const today = new Date();
today.setHours(0, 0, 0, 0);

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function getSeedForDate(date) {
  return parseInt(
    date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0")
  );
}

function rollDice(seed) {
  const rng = seedRandom(seed);
  const rolled = [];
  for (let i = 0; i < 5; i++) {
    rolled.push(Math.floor(rng() * 6) + 1);
  }
  return rolled;
}

function generateTarget(seed) {
  const rng = seedRandom(seed);
  return Math.floor(rng() * 100) + 1;
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((value, index) => {
    const die = document.createElement("div");
    die.className = `die die-${value}`;
    die.textContent = value;
    die.dataset.id = `die-${index}`;
    if (usedDice.includes(`die-${index}`)) die.classList.add("used");
    die.onclick = () => appendToExpression(value, `die-${index}`);
    diceContainer.appendChild(die);
  });
}

function renderOperators() {
  const ops = ["+", "-", "*", "/", "(", ")", "^", "!"];
  operatorRow.innerHTML = "";
  ops.forEach((op) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = op;
    btn.onclick = () => appendToExpression(op);
    operatorRow.appendChild(btn);
  });

  const backBtn = document.createElement("button");
  backBtn.className = "btn";
  backBtn.textContent = "⌫";
  backBtn.onclick = backspace;
  operatorRow.appendChild(backBtn);

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn";
  clearBtn.textContent = "Clear";
  clearBtn.onclick = clearExpression;
  operatorRow.appendChild(clearBtn);
}

function appendToExpression(value, id = null) {
  if (id && usedDice.includes(id)) return;
  expression += value.toString();
  if (id) usedDice.push(id);
  updateExpression();
  renderDice();
}

function updateExpression() {
  expressionBox.textContent = expression;
}

function backspace() {
  if (expression.length > 0) {
    expression = expression.slice(0, -1);
    usedDice = []; // Reset
    for (let i = 0; i < dice.length; i++) {
      const val = dice[i].toString();
      const countInExpr = (expression.match(new RegExp(val, "g")) || []).length;
      if (countInExpr > 0) {
        usedDice.push(`die-${i}`);
      }
    }
  }
  updateExpression();
  renderDice();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  updateExpression();
  renderDice();
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function safeEval(expr) {
  try {
    if (/[^-+*/()^!0-9]/.test(expr)) return NaN;
    let transformed = expr.replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)));
    transformed = transformed.replace(/\^/g, "**");
    const result = Function(`"use strict"; return (${transformed})`)();
    return Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function calculateScore(result) {
  return Math.abs(result - target);
}

function showPopup(message) {
  popup.textContent = message;
  popup.style.display = "block";
  setTimeout(() => (popup.style.display = "none"), 3000);
}

function updateScore(result) {
  const score = calculateScore(result);
  outputBox.textContent = `Result: ${result}`;

  if (score === 0) {
    showPopup("🎉 Qu0x! 🎉");
    localStorage.setItem(getKey("qu0x"), true);
  }

  const key = getKey("score");
  const prev = localStorage.getItem(key);
  if (!prev || score < parseInt(prev)) {
    localStorage.setItem(key, score);
  }

  updateBestScore();
}

function updateBestScore() {
  const key = getKey("score");
  const score = localStorage.getItem(key);
  bestScoreText.textContent = score !== null ? `Your Best Score Today: ${score}` : "";

  const qu0x = localStorage.getItem(getKey("qu0x"));
  qu0xMasterText.textContent = qu0x ? "You are a Qu0x Master today!" : "";

  let count = 0;
  const loopDate = new Date(startDate);
  while (loopDate <= today) {
    if (localStorage.getItem(getKey("qu0x", loopDate))) count++;
    loopDate.setDate(loopDate.getDate() + 1);
  }
  totalQu0xText.textContent = `Total Qu0x Achieved: ${count}`;
}

function getKey(key, date = currentDate) {
  return `${key}-${date.toISOString().split("T")[0]}`;
}

submitBtn.onclick = () => {
  const result = safeEval(expression);
  updateScore(result);
};

function loadGame(date) {
  currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);
  const seed = getSeedForDate(currentDate);
  dice = rollDice(seed);
  target = generateTarget(seed);
  dateDisplay.textContent = `Date: ${currentDate.toDateString()} | Target: ${target}`;
  expression = "";
  usedDice = [];
  renderDice();
  renderOperators();
  updateExpression();
  updateBestScore();
  prevBtn.disabled = currentDate <= startDate;
  nextBtn.disabled = currentDate >= today;
}

prevBtn.onclick = () => {
  if (currentDate > startDate) {
    currentDate.setDate(currentDate.getDate() - 1);
    loadGame(currentDate);
  }
};

nextBtn.onclick = () => {
  if (currentDate < today) {
    currentDate.setDate(currentDate.getDate() + 1);
    loadGame(currentDate);
  }
};

loadGame(currentDate);
