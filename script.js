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

// Utility: Find most recent Saturday for week seed
function getCurrentWeekDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day >= 6 ? 0 : -(7 - 6));
  const saturday = new Date(now.getFullYear(), now.getMonth(), diff);
  saturday.setHours(0, 0, 0, 0);
  return saturday;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Seeded random generator for dice
function seedRandomFromDate(date) {
  const seed = new Date(date).getTime();
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

// Generate 5 dice for the week
function generateDice(date) {
  const rand = seedRandomFromDate(date);
  return Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
}

// Update dice display with fade in/out
function updateDiceDisplay() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const die = document.createElement('div');
    die.className = `die die-${val}`;
    die.textContent = val;

    // Show faded if used
    if (usedDice.includes(idx)) {
      die.classList.add('die-used');
    }

    die.onclick = () => {
      if (!usedDice.includes(idx)) {
        // Prevent dice concatenation of numbers
        const lastChar = expression.slice(-1);
        if (lastChar && !isNaN(lastChar)) {
          return;
        }
        expression += val;
        usedDice.push(idx);
        updateDisplay();
        updateDiceDisplay();
      }
    };

    diceContainer.appendChild(die);
  });
}

// Evaluate factorial recursively (supports multiple factorials like !!)
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

function evaluateFactorials(expr) {
  // Replace occurrences of number or (expr) followed by !, !!, !!!
  return expr.replace(/(\d+|\([^()]+\))(!+)/g, (match, numberPart, factorialMarks) => {
    // Evaluate numberPart first (it might be an expression in parentheses)
    let num;
    if (numberPart.startsWith('(')) {
      try {
        // Evaluate inside the parentheses safely
        const inner = numberPart.slice(1, -1);
        num = eval(inner);
      } catch {
        return match; // leave as is if invalid
      }
    } else {
      num = Number(numberPart);
    }

    if (!Number.isInteger(num) || num < 0) {
      return match; // invalid factorial base
    }

    let val = num;
    for (let i = factorialMarks.length; i > 0; i--) {
      val = factorial(val);
      if (isNaN(val)) return match; // invalid factorial
    }

    return val.toString();
  });
}

function safeEval(expression) {
  // Replace ^ with ** for exponentiation
  let expr = expression.replace(/\^/g, '**');

  // Process factorials first
  expr = evaluateFactorials(expr);

  // Remove any characters other than numbers, operators, parentheses, decimal points
  if (/[^0-9+\-*/().!^ ]/.test(expr)) return NaN;

  try {
    return eval(expr);
  } catch {
    return NaN;
  }
}

function updateDisplay() {
  expressionBox.textContent = expression || '';
  if (usedDice.length < 5) {
    resultValue.textContent = '?';
    return;
  }

  const val = safeEval(expression);
  if (isNaN(val)) {
    resultValue.textContent = '?';
  } else {
    resultValue.textContent = Math.round(val * 1000) / 1000;
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
  solvedNumbers = JSON.parse(localStorage.getItem(`solved_${dateStr}`)) || {};
  diceValues = generateDice(dateStr);
  updateDiceDisplay();
  updateGrid();
  updateDisplay();
}

function saveSolved() {
  localStorage.setItem(`solved_${currentWeek}`, JSON.stringify(solvedNumbers));
}

function submitExpression() {
  if (usedDice.length !== 5) {
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 2000);
    return;
  }
  const val = safeEval(expression);
  if (isNaN(val)) {
    alert('Invalid expression.');
    return;
  }
  const rounded = Math.round(val);
  if (rounded >= 1 && rounded <= 100) {
    solvedNumbers[rounded] = true;
    saveSolved();
    updateGrid();
    expression = '';
    usedDice = [];
    updateDiceDisplay();
    updateDisplay();
  } else {
    alert('Result is out of range 1 to 100.');
  }
}

function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Remove last dice usage if lastChar was a dice number
  if (!isNaN(lastChar)) {
    // Find last used dice index for that value
    for (let i = usedDice.length - 1; i >= 0; i--) {
      if (diceValues[usedDice[i]] == Number(lastChar)) {
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

function fillWeekDropdown() {
  const start = new Date(2025, 4, 11);
  const today = new Date();
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 7)) {
    const label = `${formatDate(d)} (Week #${Math.floor((d - start) / (7 * 24 * 60 * 60 * 1000)) + 1})`;
    const opt = document.createElement('option');
    opt.value = formatDate(new Date(d));
    opt.textContent = label;
    weekSelector.appendChild(opt);
  }
}

weekSelector.addEventListener('change', () => {
  loadWeek(weekSelector.value);
});

document.getElementById('submitBtn').addEventListener('click', submitExpression);
document.getElementById('backspaceBtn').addEventListener('click', backspace);
document.getElementById('clearBtn').addEventListener('click', clearExpression);

document.querySelectorAll('.op-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (usedDice.length < 5 && btn.dataset.op !== '!') {
      // Prevent adding operators before all dice used (except factorial)
      return;
    }
    expression += btn.dataset.op;
    updateDisplay();
  });
});

fillWeekDropdown();

const defaultWeek = formatDate(getCurrentWeekDate());
weekSelector.value = defaultWeek;
loadWeek(defaultWeek);
