// Qu0x 100 - script.js

const diceContainer = document.getElementById("dice");
const targetCounter = document.getElementById("target");
const inputBox = document.getElementById("input");
const resultDisplay = document.getElementById("result");
const scoreDisplay = document.getElementById("score");
const expressionButtons = document.querySelectorAll(".input-button");
const backspaceButton = document.getElementById("backspace");
const clearButton = document.getElementById("clear");
const submitButton = document.getElementById("submit");
const weekSelector = document.getElementById("weekSelector");
const numberGrid = document.getElementById("numberGrid");

let currentWeekDate = getCurrentWeekDate();
let diceValues = [];
let usedDice = [];
let expression = "";
let completedTargets = new Set();

function getCurrentWeekDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 6 ? 0 : -((day + 1) % 7);
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + diff);
  saturday.setHours(0, 0, 0, 0);
  return saturday;
}

function getSeededRandom(seed) {
  let x = Math.sin(seed.getTime()) * 10000;
  return x - Math.floor(x);
}

function getDiceForDate(date) {
  const values = [];
  for (let i = 0; i < 5; i++) {
    let val = Math.floor(getSeededRandom(new Date(date.getTime() + i * 1000)) * 6) + 1;
    values.push(val);
  }
  return values;
}

function formatDateToWeekLabel(date) {
  return `Week of ${date.toISOString().split("T")[0]}`;
}

function generateWeekOptions() {
  const firstSaturday = new Date("2025-05-10");
  const today = new Date();
  const options = [];

  for (let d = new Date(firstSaturday); d <= today; d.setDate(d.getDate() + 7)) {
    options.push(new Date(d));
  }

  weekSelector.innerHTML = "";
  options.forEach((date, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = formatDateToWeekLabel(date);
    weekSelector.appendChild(option);
  });

  const selectedIndex = options.findIndex(d => d.getTime() === currentWeekDate.getTime());
  weekSelector.selectedIndex = selectedIndex;
}

function renderDice() {
  diceContainer.innerHTML = "";
  usedDice = [];
  diceValues.forEach((val, index) => {
    const die = document.createElement("div");
    die.textContent = val;
    die.className = `die die-${val}`;
    die.dataset.index = index;
    die.addEventListener("click", () => {
      if (!usedDice.includes(index)) {
        expression += val;
        usedDice.push(index);
        updateInput();
      }
    });
    diceContainer.appendChild(die);
  });
}

function updateInput() {
  inputBox.textContent = expression;
  try {
    const evaluated = evaluateExpression(expression);
    resultDisplay.textContent = `= ${evaluated}`;
  } catch {
    resultDisplay.textContent = "= ?";
  }
}

function evaluateExpression(expr) {
  const factorialRegex = /(\d+|\([^()]+\))(!{1,3})/g;

  const replaced = expr.replace(factorialRegex, (_, base, bangs) => {
    let val = eval(base);
    if (!Number.isInteger(val) || val < 0) throw "Invalid factorial base";
    let result = val;
    for (let b = 1; b < bangs.length; b++) {
      result = bangFactorial(result);
    }
    return bangFactorial(result);
  });

  return Math.round(eval(replaced));
}

function bangFactorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = n; i > 1; i--) {
    result *= i;
  }
  return result;
}

function renderGrid() {
  numberGrid.innerHTML = "";
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    cell.textContent = i;
    if (completedTargets.has(i)) {
      cell.classList.add("completed");
    }
    numberGrid.appendChild(cell);
  }
  updateTargetCounter();
}

function updateTargetCounter() {
  targetCounter.textContent = `${completedTargets.size}/100 Completed`;
}

function resetExpression() {
  expression = "";
  usedDice = [];
  updateInput();
}

submitButton.addEventListener("click", () => {
  try {
    const result = evaluateExpression(expression);
    if (usedDice.length !== 5) {
      scoreDisplay.textContent = "Use all dice!";
      return;
    }
    if (result >= 1 && result <= 100) {
      completedTargets.add(result);
      renderGrid();
      scoreDisplay.textContent = `✅ ${result} added!`;
    } else {
      scoreDisplay.textContent = `❌ ${result} is out of range.`;
    }
  } catch {
    scoreDisplay.textContent = "Invalid expression.";
  }
});

backspaceButton.addEventListener("click", () => {
  if (expression.length > 0) {
    const lastChar = expression.slice(-1);
    expression = expression.slice(0, -1);
    if (!isNaN(lastChar)) {
      const dieIndex = diceValues.findIndex((val, idx) => val == lastChar && usedDice.includes(idx));
      if (dieIndex !== -1) {
        usedDice = usedDice.filter(i => i !== dieIndex);
      }
    }
    updateInput();
  }
});

clearButton.addEventListener("click", () => {
  resetExpression();
});

expressionButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    expression += btn.textContent;
    updateInput();
  });
});

weekSelector.addEventListener("change", () => {
  const index = parseInt(weekSelector.value);
  const firstSaturday = new Date("2025-05-10");
  const selectedDate = new Date(firstSaturday);
  selectedDate.setDate(firstSaturday.getDate() + index * 7);
  selectedDate.setHours(0, 0, 0, 0);
  currentWeekDate = selectedDate;
  loadWeek();
});

function loadWeek() {
  diceValues = getDiceForDate(currentWeekDate);
  completedTargets = new Set();
  resetExpression();
  renderDice();
  renderGrid();
  scoreDisplay.textContent = "";
}

generateWeekOptions();
loadWeek();
