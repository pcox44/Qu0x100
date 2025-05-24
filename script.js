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
  // Find the most recent Saturday (day 6)
  const diff = now.getDate() - day + (day >= 6 ? 0 : - (7 - 6));
  const saturday = new Date(now.getFullYear(), now.getMonth(), diff);
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
    if (usedDice.includes(idx)) die.classList.add('used');
    die.onclick = () => {
  if (!usedDice.includes(idx)) {
    const lastChar = expression.slice(-1);
    if (lastChar && !isNaN(lastChar)) {
      // last char is digit, prevent concatenation of dice values
      return;
    }
    expression += val;
    usedDice.push(idx);
    updateDisplay();
  }
};

      }
    };
    diceContainer.appendChild(die);
  });
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let result = 1;
  for (let i = n; i > 1; i -= 2) result *= i;
  return result;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let result = 1;
  for (let i = n; i > 1; i -= 3) result *= i;
  return result;
}

function updateDisplay() {
  expressionBox.textContent = expression;
  try {
    if (usedDice.length < 5) {
      resultValue.textContent = '?';
    } else {
      // Evaluate safely with allowed characters only
      // Replace ^ with ** for exponentiation since eval does not support ^
      const safeExpression = expression
  .replace(/\^/g, '**')
  .replace(/(\d+|\))!!!/g, 'tripleFactorial($1)')
  .replace(/(\d+|\))!!/g, 'doubleFactorial($1)')
  .replace(/(\d+|\))!/g, 'factorial($1)')
  .replace(/[^-()\d/*+.!^a-zA-Z]/g, '');

      const val = eval(safeExpression);
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
  try {
    // Evaluate expression
    const safeExpression = expression
  .replace(/\^/g, '**')
  .replace(/(\d+|\))!!!/g, 'tripleFactorial($1)')
  .replace(/(\d+|\))!!/g, 'doubleFactorial($1)')
  .replace(/(\d+|\))!/g, 'factorial($1)')
  .replace(/[^-()\d/*+.!^a-zA-Z]/g, '');

    let val = eval(safeExpression);
    val = Math.round(val);
    if (val >= 1 && val <= 100) {
      solvedNumbers[val] = true;
      saveSolved();
      updateGrid();
      expression = '';
      usedDice = [];
      updateDiceDisplay();
      updateDisplay();
    } else {
      alert('Result is out of range 1 to 100.');
    }
  } catch {
    alert('Invalid expression.');
  }
}

function backspace() {
  if (expression.length === 0) return;
  // Remove last character and if it matches a dice value, restore that die usage
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Try to convert lastChar to a number and remove from usedDice if found
  const lastNum = parseInt(lastChar);
  if (!isNaN(lastNum)) {
    // Find index of last used die with that value
    for (let i = usedDice.length - 1; i >= 0; i--) {
      if (diceValues[usedDice[i]] === lastNum) {
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
  // Weeks starting from 5/11/2025 (Sunday)
  const start = new Date(2025, 4, 11); // May is month 4 zero-based
  const today = new Date();
  const weeks = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 7)) {
    const label = `${formatDate(d)} (Week #${weeks.length + 1})`;
    weeks.push({ date: formatDate(new Date(d)), label });
  }

  weeks.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.date;
    opt.textContent = w.label;
    weekSelector.appendChild(opt);
  });
}

weekSelector.addEventListener('change', () => {
  loadWeek(weekSelector.value);
});

document.getElementById('submitBtn').addEventListener('click', submitExpression);
document.getElementById('backspaceBtn').addEventListener('click', backspace);
document.getElementById('clearBtn').addEventListener('click', clearExpression);

document.querySelectorAll('.op-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Only add operator buttons if allowed and if dice are all used or operators
    const val = btn.textContent;
    if (val.match(/^\d+$/)) return; // ignore number buttons (none here)
    if (val === 'Back' || val === 'Clear') return; // ignore back/clear here
    expression += val;
    updateDisplay();
  });
});

fillWeekDropdown();

const currentWeekDate = getCurrentWeekDate();
const currentWeekStr = formatDate(currentWeekDate);

// Set dropdown to current week and load game
weekSelector.value = currentWeekStr;
loadWeek(currentWeekStr);
