const expressionBox = document.getElementById('expressionBox');
const resultValue = document.getElementById('resultValue');
const gridContainer = document.getElementById('gridContainer');
const completedCount = document.getElementById('completedCount');
const popup = document.getElementById('popup');
const diceContainer = document.getElementById('diceContainer');
const weekSelector = document.getElementById('weekSelector');

let expression = '';
let usedDice = [];
let diceValues = [];
let solvedNumbers = {};
let currentWeek;

function getCurrentWeekDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 6 ? 0 : -1);
  return new Date(now.setDate(diff));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function seedRandomFromDate(date) {
  const seed = new Date(date).getTime();
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function generateDice(date) {
  const rand = seedRandomFromDate(date);
  return Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
}

function updateDiceDisplay() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const die = document.createElement('div');
    die.className = `die die-${val}`;
    die.textContent = val;
    if (usedDice.includes(idx)) die.classList.add('used');
    die.onclick = () => {
      if (!usedDice.includes(idx)) {
        expression += `D${idx}`;
        usedDice.push(idx);
        updateDisplay();
      }
    };
    diceContainer.appendChild(die);
  });
}

function factorial(n, depth = 1) {
  if (!Number.isInteger(n) || n < 0) return NaN;
  if (depth === 1) return n <= 1 ? 1 : n * factorial(n - 1, 1);
  if (depth === 2) return n <= 0 ? 1 : n * factorial(n - 2, 2);
  if (depth === 3) return n <= 0 ? 1 : n * factorial(n - 3, 3);
  return NaN;
}

function safeEval(expr) {
  const parsed = expr
    .replace(/D(\d)/g, (_, dIdx) => diceValues[+dIdx]) // Replace D0–D4 with actual dice
    .replace(/(\([^()]*\)|\d+)(!{1,3})/g, (_, base, bangs) => {
      const depth = bangs.length;
      return `factorial(${base}, ${depth})`;
    });
  return Function(`"use strict"; return (${parsed})`)();
}

function updateDisplay() {
  expressionBox.textContent = expression;
  try {
    if (usedDice.length < 5) {
      resultValue.textContent = '?';
    } else {
      const val = safeEval(expression);
      resultValue.textContent = isNaN(val) ? '?' : Math.round(val * 1000) / 1000;
    }
  } catch {
    resultValue.textContent = '?';
  }
}

function updateGrid() {
  gridContainer.innerHTML = '';
  let count = 0;
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    if (solvedNumbers[i]) {
      cell.classList.add('solved');
      count++;
    }
    cell.textContent = i;
    gridContainer.appendChild(cell);
  }
  completedCount.textContent = count;
}

function loadWeek(dateStr) {
  currentWeek = dateStr;
  expression = '';
  usedDice = [];
  solvedNumbers = JSON.parse(localStorage.getItem(`solved-${dateStr}`)) || {};
  diceValues = generateDice(dateStr);
  updateDiceDisplay();
  updateDisplay();
  updateGrid();
}

function saveWeekProgress() {
  localStorage.setItem(`solved-${currentWeek}`, JSON.stringify(solvedNumbers));
}

document.querySelectorAll('.op-btn').forEach(btn => {
  btn.onclick = () => {
    const val = btn.textContent;
    expression += val;
    updateDisplay();
  };
});

document.getElementById('submitBtn').onclick = () => {
  if (usedDice.length !== 5) {
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 2000);
    return;
  }
  try {
    const result = safeEval(expression);
    const rounded = Math.round(result);
    if (rounded >= 1 && rounded <= 100) {
      solvedNumbers[rounded] = true;
      saveWeekProgress();
      updateGrid();
    }
  } catch {}
  expression = '';
  usedDice = [];
  updateDiceDisplay();
  updateDisplay();
};

document.getElementById('backspaceBtn').onclick = () => {
  const match = expression.match(/D(\d)$/);
  if (match) {
    const idx = +match[1];
    usedDice = usedDice.filter(i => i !== idx);
  }
  expression = expression.slice(0, -1);
  updateDiceDisplay();
  updateDisplay();
};

document.getElementById('clearBtn').onclick = () => {
  expression = '';
  usedDice = [];
  updateDiceDisplay();
  updateDisplay();
};

function populateWeekSelector() {
  const start = new Date('2025-05-10');
  const now = new Date();
  let week = 1;
  while (start <= now) {
    const dateStr = formatDate(start);
    const option = document.createElement('option');
    option.value = dateStr;
    option.textContent = `Week ${week} (${dateStr})`;
    weekSelector.appendChild(option);
    start.setDate(start.getDate() + 7);
    week++;
  }
  const current = formatDate(getCurrentWeekDate());
  weekSelector.value = current;
  loadWeek(current);
}

weekSelector.onchange = (e) => loadWeek(e.target.value);

populateWeekSelector();
