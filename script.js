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
  const diff = now.getDate() - day + (day === 6 ? 0 : -1); // previous Saturday
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
        expression += val;
        usedDice.push(idx);
        updateDisplay();
      }
    };
    diceContainer.appendChild(die);
  });
}

function updateDisplay() {
  expressionBox.textContent = expression;
  try {
    if (usedDice.length < 5) {
      resultValue.textContent = '?';
    } else {
      const val = eval(expression.replace(/[^-()\d/*+.!^]/g, ''));
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
    if (!expression.endsWith(val)) {
      expression += val;
      updateDisplay();
    }
  };
});

document.getElementById('submitBtn').onclick = () => {
  if (usedDice.length !== 5) {
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 2000);
    return;
  }
  try {
    const result = eval(expression);
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
  if (expression.length > 0) {
    const last = expression.slice(-1);
    const idx = diceValues.findIndex((val, i) => !usedDice.includes(i) && val.toString() === last);
    if (idx !== -1) {
      usedDice = usedDice.filter(i => i !== idx);
    }
    expression = expression.slice(0, -1);
    updateDiceDisplay();
    updateDisplay();
  }
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
    option.textContent = `Week ${week}`;
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
