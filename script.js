// === CONSTANTS ===
const START_DATE = new Date("2025-05-15");
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const today = new Date();
today.setHours(0, 0, 0, 0);
const dayCount = Math.floor((today - START_DATE) / MS_PER_DAY) + 1;
let currentDay = dayCount - 1;
let usedDice = [];
let expression = "";

// === DOM ELEMENTS ===
const dateDisplay = document.getElementById("date-display");
const targetBox = document.getElementById("target-box");
const diceContainer = document.getElementById("dice-container");
const operatorRow = document.getElementById("operator-row");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("output-box");
const submitBtn = document.getElementById("submit-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const daySelect = document.getElementById("day-select");
const dailyBest = document.getElementById("daily-best");
const qu0xMaster = document.getElementById("master-score");
const qu0xFraction = document.getElementById("qu0x-fraction");
const popup = document.getElementById("qu0x-popup");
const backspaceBtn = document.getElementById("backspace-btn");
const clearBtn = document.getElementById("clear-btn");

// === INIT ===
for (let i = 0; i < dayCount; i++) {
  const option = document.createElement("option");
  const d = new Date(START_DATE.getTime() + i * MS_PER_DAY);
  const label = `#${i + 1} - ${d.toLocaleDateString()}`;
  const score = localStorage.getItem(`score-${i}`);
  const emoji = score === "0" ? "⭐" : score ? `✅ (${score})` : "⠀";
  option.textContent = `${emoji} ${label}`;
  option.value = i;
  daySelect.appendChild(option);
}
daySelect.value = currentDay;

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getPuzzle(dayIndex) {
  const date = new Date(START_DATE.getTime() + dayIndex * MS_PER_DAY);
  const seed = date.getTime();
  const dice = [];
  for (let i = 0; i < 5; i++) {
    let r = Math.floor(getSeededRandom(seed + i) * 6) + 1;
    dice.push(r);
  }
  const target = Math.floor(getSeededRandom(seed + 99) * 100) + 1;
  return { dice, target, date };
}

function renderGame() {
  const { dice, target, date } = getPuzzle(currentDay);
  dateDisplay.textContent = `Game #${currentDay + 1} - ${date.toLocaleDateString()}`;
  targetBox.textContent = `🎯 ${target}`;
  diceContainer.innerHTML = "";
  usedDice = [];

  dice.forEach((val, i) => {
    const btn = document.createElement("div");
    btn.className = `die die-${val}`;
    btn.textContent = val;
    btn.dataset.index = i;
    btn.addEventListener("click", () => {
      if (!usedDice.includes(i)) {
        expression += val;
        usedDice.push(i);
        updateExpression();
        btn.classList.add("used");
      }
    });
    diceContainer.appendChild(btn);
  });

  expression = "";
  updateExpression();
  outputBox.textContent = "?";

  const score = localStorage.getItem(`score-${currentDay}`);
  dailyBest.textContent = score !== null ? `Daily Best: ${score}` : "";
  qu0xMaster.textContent = calculateMasterScore();
  updateCompletion();
  daySelect.value = currentDay;
}

function updateExpression() {
  expressionBox.textContent = expression;
}

function safeEval(expr) {
  try {
    if (/[^-()\d/*+.^!]/.test(expr)) return null;
    const replaced = expr.replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)));
    return eval(replaced);
  } catch {
    return null;
  }
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid!";
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

submitBtn.addEventListener("click", () => {
  const result = safeEval(expression);
  const { target } = getPuzzle(currentDay);
  if (result === null || isNaN(result)) {
    outputBox.textContent = "?";
    return;
  }

  outputBox.textContent = result;
  const score = Math.abs(target - result);
  const saved = localStorage.getItem(`score-${currentDay}`);
  if (saved === null || score < parseInt(saved)) {
    localStorage.setItem(`score-${currentDay}`, score);
    dailyBest.textContent = `Daily Best: ${score}`;
    if (score === 0) {
      popup.style.display = "block";
      setTimeout(() => popup.style.display = "none", 3000);
    }
    qu0xMaster.textContent = calculateMasterScore();
    updateCompletion();
    renderDropdown();
  }
});

backspaceBtn.addEventListener("click", () => {
  expression = expression.slice(0, -1);
  updateExpression();
});

clearBtn.addEventListener("click", () => {
  expression = "";
  usedDice = [];
  document.querySelectorAll(".die").forEach(d => d.classList.remove("used"));
  updateExpression();
  outputBox.textContent = "?";
});

prevBtn.addEventListener("click", () => {
  if (currentDay > 0) {
    currentDay--;
    renderGame();
  }
});
nextBtn.addEventListener("click", () => {
  if (currentDay < dayCount - 1) {
    currentDay++;
    renderGame();
  }
});
daySelect.addEventListener("change", (e) => {
  currentDay = parseInt(e.target.value);
  renderGame();
});

function calculateMasterScore() {
  let sum = 0;
  for (let i = 0; i < dayCount; i++) {
    const s = localStorage.getItem(`score-${i}`);
    if (s === null) return "N/A";
    sum += parseInt(s);
  }
  return sum;
}

function updateCompletion() {
  let q = 0;
  for (let i = 0; i < dayCount; i++) {
    if (localStorage.getItem(`score-${i}`) === "0") q++;
  }
  qu0xFraction.textContent = `${q} / ${dayCount}`;
}

function renderDropdown() {
  daySelect.innerHTML = "";
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(START_DATE.getTime() + i * MS_PER_DAY);
    const label = `#${i + 1} - ${d.toLocaleDateString()}`;
    const score = localStorage.getItem(`score-${i}`);
    const emoji = score === "0" ? "⭐" : score ? `✅ (${score})` : "⠀";
    const option = document.createElement("option");
    option.textContent = `${emoji} ${label}`;
    option.value = i;
    daySelect.appendChild(option);
  }
  daySelect.value = currentDay;
}

// === Start the game ===
renderGame();
