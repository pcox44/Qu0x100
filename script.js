const diceContainer = document.getElementById("dice-container");
const expressionDiv = document.getElementById("expression");
const outputDiv = document.getElementById("output");
const gridContainer = document.getElementById("grid-container");
const submitBtn = document.getElementById("submit");
const backspaceBtn = document.getElementById("backspace");
const clearBtn = document.getElementById("clear");
const weekSelector = document.getElementById("week-selector");

let diceValues = [];
let usedDice = [];
let expression = "";
let weekStartDates = [];
let currentWeek = 0;
let solvedNumbers = {};

function generateWeekList() {
  const start = new Date("2025-05-11");
  const today = new Date();
  const sundays = [];
  while (start <= today) {
    sundays.push(new Date(start));
    start.setDate(start.getDate() + 7);
  }
  weekStartDates = sundays;
  weekSelector.innerHTML = "";
  sundays.forEach((date, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Week ${i + 1} (${date.toLocaleDateString()})`;
    weekSelector.appendChild(option);
  });
  currentWeek = sundays.length - 1;
  weekSelector.value = currentWeek;
}

function seedDice() {
  const seed = weekStartDates[currentWeek].toDateString();
  let rng = mulberry32(hashString(seed));
  diceValues = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  usedDice = Array(5).fill(false);
}

function renderDice() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `die die${val}`;
    if (usedDice[i]) die.classList.add("used");
    die.textContent = val;
    die.addEventListener("click", () => {
      if (!usedDice[i]) {
        expression += val;
        usedDice[i] = true;
        updateDisplay();
      }
    });
    diceContainer.appendChild(die);
  });
}

function updateDisplay() {
  expressionDiv.textContent = expression;
  try {
    let result = math.evaluate(expression);
    if (!Number.isFinite(result)) throw "bad result";
    outputDiv.textContent = result;
  } catch (e) {
    outputDiv.textContent = "?";
  }
  renderDice();
}

function renderGrid() {
  gridContainer.innerHTML = "";
  for (let i = 1; i <= 100; i++) {
    const div = document.createElement("div");
    div.className = "grid-number";
    if (solvedNumbers[i]) div.classList.add("solved");
    div.textContent = i;
    gridContainer.appendChild(div);
  }
}

function submitExpression() {
  try {
    const result = math.evaluate(expression);
    const rounded = Math.round(result);
    if (Number.isInteger(result) && rounded >= 1 && rounded <= 100 && usedDice.every(u => u)) {
      solvedNumbers[rounded] = true;
      saveProgress();
      expression = "";
      usedDice = Array(5).fill(false);
      updateDisplay();
      renderGrid();
    }
  } catch (e) {
    alert("Invalid expression");
  }
}

function backspace() {
  if (expression.length === 0) return;
  const last = expression.slice(-1);
  expression = expression.slice(0, -1);
  const val = parseInt(last);
  if (!isNaN(val)) {
    const idx = diceValues.findIndex((v, i) => v == val && usedDice[i]);
    if (idx !== -1) usedDice[idx] = false;
  }
  updateDisplay();
}

function clearExpression() {
  expression = "";
  usedDice = Array(5).fill(false);
  updateDisplay();
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h *= 16777619;
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function saveProgress() {
  const key = `qu0x100-week${currentWeek}`;
  localStorage.setItem(key, JSON.stringify(solvedNumbers));
}

function loadProgress() {
  const key = `qu0x100-week${currentWeek}`;
  const saved = localStorage.getItem(key);
  solvedNumbers = saved ? JSON.parse(saved) : {};
}

submitBtn.addEventListener("click", submitExpression);
backspaceBtn.addEventListener("click", backspace);
clearBtn.addEventListener("click", clearExpression);
weekSelector.addEventListener("change", () => {
  currentWeek = parseInt(weekSelector.value);
  loadProgress();
  seedDice();
  updateDisplay();
  renderGrid();
});

generateWeekList();
loadProgress();
seedDice();
updateDisplay();
renderGrid();
