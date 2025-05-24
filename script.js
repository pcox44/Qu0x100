const diceContainer = document.getElementById("dice-container");
const expressionBox = document.getElementById("expression-box");
const resultBox = document.getElementById("result-box");
const submitButton = document.getElementById("submit");
const numberGrid = document.getElementById("number-grid");
const backspaceBtn = document.getElementById("backspace");
const clearBtn = document.getElementById("clear");
const weekLabel = document.getElementById("week-label");
const weekSelector = document.getElementById("week-selector");

let diceValues = [];
let usedDice = [];
let expression = "";
let completedNumbers = {};
let currentSeed = "";

function getMostRecentSaturday(date = new Date()) {
  const day = date.getDay();
  const diff = (day + 1) % 7; // 6 → 0, 0 → 1, ..., 5 → 6
  const saturday = new Date(date);
  saturday.setDate(date.getDate() - diff);
  saturday.setHours(0, 0, 0, 0);
  return saturday;
}

function seedRandom(seed) {
  let s = seed;
  return function () {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function generateDice(seed) {
  const rand = seedRandom(seed);
  return Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
}

function updateDiceDisplay() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const die = document.createElement("div");
    die.textContent = val;
    die.className = `die die${val}`;
    if (usedDice[i]) die.classList.add("used");
    die.addEventListener("click", () => {
      if (!usedDice[i]) {
        expression += val;
        usedDice[i] = true;
        updateDiceDisplay();
        updateExpressionBox();
      }
    });
    diceContainer.appendChild(die);
  });
}

function updateExpressionBox() {
  expressionBox.textContent = expression;
  try {
    if (expression && !/[^\d()+\-*/^!]/.test(expression)) {
      const transformed = expression.replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)));
      const evaluated = eval(transformed.replace(/\^/g, "**"));
      resultBox.textContent = isNaN(evaluated) ? "?" : evaluated;
    } else resultBox.textContent = "?";
  } catch {
    resultBox.textContent = "?";
  }
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function setupButtons() {
  document.querySelectorAll(".op-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      expression += btn.dataset.value;
      updateExpressionBox();
    })
  );
  backspaceBtn.onclick = () => {
    if (expression.length === 0) return;
    const last = expression.slice(-1);
    expression = expression.slice(0, -1);
    if (/^\d$/.test(last)) {
      const idx = diceValues.findIndex((val, i) => val == last && usedDice[i]);
      if (idx !== -1) usedDice[idx] = false;
    }
    updateDiceDisplay();
    updateExpressionBox();
  };
  clearBtn.onclick = () => {
    expression = "";
    usedDice = usedDice.map(() => false);
    updateDiceDisplay();
    updateExpressionBox();
  };
  submitButton.onclick = () => {
    const val = parseInt(resultBox.textContent);
    if (val >= 1 && val <= 100 && usedDice.every(Boolean)) {
      completedNumbers[currentSeed][val] = true;
      localStorage.setItem("quox100-progress", JSON.stringify(completedNumbers));
      renderGrid();
    }
  };
}

function renderGrid() {
  numberGrid.innerHTML = "";
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    cell.textContent = i;
    if (completedNumbers[currentSeed]?.[i]) {
      cell.classList.add("completed");
    }
    numberGrid.appendChild(cell);
  }
}

function setupWeekSelector() {
  const now = new Date();
  const currentSat = getMostRecentSaturday(now);
  const firstWeek = new Date("2025-05-10T00:00:00Z");
  let temp = new Date(firstWeek);
  while (temp <= now) {
    const label = `Week of ${temp.toLocaleDateString("en-US")}`;
    const option = document.createElement("option");
    option.value = temp.toISOString().split("T")[0];
    option.textContent = label;
    if (temp.getTime() === currentSat.getTime()) option.selected = true;
    weekSelector.appendChild(option);
    temp.setDate(temp.getDate() + 7);
  }
  weekSelector.addEventListener("change", () => startGame(weekSelector.value));
}

function startGame(weekISO) {
  currentSeed = weekISO;
  const weekDate = new Date(weekISO);
  weekLabel.textContent = weekDate.toLocaleDateString("en-US");
  diceValues = generateDice(weekDate.getTime());
  usedDice = Array(5).fill(false);
  expression = "";
  completedNumbers = JSON.parse(localStorage.getItem("quox100-progress") || "{}");
  if (!completedNumbers[currentSeed]) completedNumbers[currentSeed] = {};
  updateDiceDisplay();
  updateExpressionBox();
  renderGrid();
}

setupButtons();
setupWeekSelector();
