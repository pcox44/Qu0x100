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

// Get most recent Saturday (or today if Saturday)
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

// Seeded RNG based on date
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

// Update dice display
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
        // Prevent dice concatenation: don't allow two digits in a row without operator
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

// Factorial (single only)
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

// Evaluate factorials including multi-factorials like !! or !!!
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

    // Evaluate multi-factorial (like 3!! or 4!!!)
    let result = num;
    const count = factorialMarks.length;

    if (count === 1) {
      return factorial(num);
    } else {
      // Multi factorial: decrement by count
      let val = num;
      let total = 1;
      while (val > 0) {
        total *= val;
        val -= count;
      }
      return total;
    }
  });
}

function safeEval(expr) {
  try {
    // Replace ^ with **
    let parsedExpr = expr.replace(/\^/g, '**');

    // Replace factorials with their computed values
    parsedExpr = evaluateFactorials(parsedExpr);

    // Evaluate safely
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
  if (isNaN(val)) {
    resultValue.textContent = '?';
  } else {
    resultValue.textContent = val;
  }
}

function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);

  expression = expression.slice(0, -1);

  // If last char was a digit, free up dice usage
  if (!isNaN(lastChar)) {
    // find which dice it was
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
  setTimeout(() => {
    popup.classList.add('hidden');
  }, 2000);
}

function submit() {
  // Must use all dice exactly once
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
  const start = new Date(2025, 4, 11); // May 11, 2025 (Month is 0-based)
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

  // Load solvedNumbers from localStorage
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

document.getElementById('backspaceBtn').addEventListener('click', () => {
  backspace();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  clearExpression();
});

document.getElementById('submitBtn').addEventListener('click', () => {
  submit();
});

document.querySelectorAll('.op-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const op = btn.getAttribute('data-op');
    // Prevent operators if expression is empty or last char is operator (except minus)
    if (expression.length === 0 && (op !== '-' && op !== '(')) return;

    const lastChar = expression.slice(-1);
    if ('+-*/^'.includes(lastChar)) {
  // Replace last operator with new
  expression = expression.slice(0, -1) + op;
} else {
  expression += op;
}


    }
    updateDisplay();
  });
});

setupWeekSelector();

const defaultWeek = formatDate(getCurrentWeekDate());
weekSelector.value = defaultWeek;
loadWeek(defaultWeek);

// Save on page unload
window.addEventListener('beforeunload', () => {
  saveWeek();
});
