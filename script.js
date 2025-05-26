// script.js

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

function getCurrentWeekStartDate() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToSaturday = (dayOfWeek + 1) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() - diffToSaturday);
  saturday.setHours(0, 0, 0, 0);
  return saturday;
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

    if (usedDice.includes(idx)) {
      die.classList.add('die-used');
    }

    die.onclick = () => {
      if (!usedDice.includes(idx)) {
        const lastChar = expression.slice(-1);
        if (lastChar && !isNaN(lastChar)) return;
        expression += val;
        usedDice.push(idx);
        updateDisplay();
        updateDiceDisplay();
      }
    };

    diceContainer.appendChild(die);
  });
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

function evaluateFactorials(expr) {
  return expr.replace(/(\d+|\([^()]+\))(!+)/g, (match, numberPart, factorialMarks) => {
    let num;
    if (numberPart.startsWith('(')) {
      try {
        const inner = numberPart.slice(1, -1);
        num = eval(inner);
      } catch {
        return match;
      }
    } else {
      num = Number(numberPart);
    }
    if (!Number.isInteger(num) || num < 0) return match;

    let val = num;
    let total = 1;
    const step = factorialMarks.length;
    while (val > 0) {
      total *= val;
      val -= step;
    }
    return total;
  });
}

function safeEval(expr) {
  try {
    let parsedExpr = expr.replace(/\^/g, '**');
    parsedExpr = evaluateFactorials(parsedExpr);
    const val = eval(parsedExpr);
    if (typeof val === 'number' && isFinite(val)) {
      return val;
    }
    return NaN;
  } catch {
    return NaN;
  }
}

function updateDisplay() {
  expressionBox.textContent = expression;
  const val = safeEval(expression);
  resultValue.textContent = isNaN(val) ? '?' : val;
}

function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  if (!isNaN(lastChar)) {
    for (let i = usedDice.length - 1; i >= 0; i--) {
      const idx = usedDice[i];
      if (diceValues[idx].toString() === lastChar) {
        usedDice.splice(i, 1);
        break;
      }
    }
  }
  updateDisplay();
  updateDiceDisplay();
}

function clearExpression() {
  expression = '';
  usedDice = [];
  updateDisplay();
  updateDiceDisplay();
}

function showPopup(msg) {
  popup.textContent = msg;
  popup.classList.remove('hidden');
  setTimeout(() => popup.classList.add('hidden'), 2000);
}

function submit() {
  if (usedDice.length !== 5) {
    showPopup('Use all 5 dice!');
    return;
  }
  const val = safeEval(expression);
  if (isNaN(val) || val < 1 || val > 100 || !Number.isInteger(val)) {
    showPopup('Invalid result! Must be integer 1-100');
    return;
  }
  if (solvedNumbers[val]) {
    showPopup(`Number ${val} already solved!`);
    return;
  }
  solvedNumbers[val] = expression;
  updateGrid();
  clearExpression();
  updateCompletedCount();
}

function updateCompletedCount() {
  completedCount.textContent = Object.keys(solvedNumbers).length;
}

function updateGrid() {
  gridContainer.innerHTML = '';
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.textContent = i;
    if (solvedNumbers[i]) {
      cell.classList.add('solved');
      cell.title = solvedNumbers[i];
    }
    gridContainer.appendChild(cell);
  }
}

function setupWeekSelector() {
  const start = new Date(2025, 4, 11);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = new Date(start);

  while (current <= today) {
    const option = document.createElement('option');
    option.value = formatDate(current);
    option.textContent = `Week of ${formatDate(current)}`;
    weekSelector.appendChild(option);
    current.setDate(current.getDate() + 7);
  }
}

function loadWeek(weekDate) {
  currentWeek = weekDate;
  expression = '';
  usedDice = [];
  solvedNumbers = {};
  updateDisplay();

  diceValues = generateDice(weekDate);
  updateDiceDisplay();

  const saved = localStorage.getItem(`qu0x100_solved_${weekDate}`);
  if (saved) {
    solvedNumbers = JSON.parse(saved);
  }

  updateGrid();
  updateCompletedCount();
}

function saveWeek() {
  if (currentWeek) {
    localStorage.setItem(`qu0x100_solved_${currentWeek}`, JSON.stringify(solvedNumbers));
  }
}

weekSelector.addEventListener('change', () => {
  saveWeek();
  loadWeek(weekSelector.value);
});

document.getElementById('backspaceBtn').addEventListener('click', backspace);
document.getElementById('clearBtn').addEventListener('click', clearExpression);
document.getElementById('submitBtn').addEventListener('click', submit);

document.querySelectorAll('.op-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const op = btn.getAttribute('data-op');
    const lastChar = expression.slice(-1);
    if (expression.length === 0 && (op !== '-' && op !== '(')) return;
    if ('+-*/^'.includes(lastChar)) {
      if (op === '(') {
        expression += op;
      } else {
        expression = expression.slice(0, -1) + op;
      }
    } else {
      expression += op;
    }
    updateDisplay();
  });
});

setupWeekSelector();
const defaultWeek = formatDate(getCurrentWeekStartDate());
weekSelector.value = defaultWeek;
loadWeek(defaultWeek);



window.addEventListener('beforeunload', saveWeek);
