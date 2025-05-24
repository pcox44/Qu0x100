// Qu0x 100 Weekly Game Script

const diceContainer = document.getElementById('diceContainer');
const inputBox = document.getElementById('inputBox');
const outputBox = document.getElementById('outputBox');
const buttonRow1Div = document.getElementById('buttonRow1');
const buttonRow2Div = document.getElementById('buttonRow2');
const numberGrid = document.getElementById('numberGrid');
const completedCountSpan = document.getElementById('completedCountSpan');
const weekSelect = document.getElementById('weekSelect');
const gameNumberDiv = document.getElementById('gameNumber');

let expression = '';
let usedDiceIndices = new Set();
let completedNumbers = new Set();
let currentWeekIndex = 0;

const firstWeekDate = new Date('2025-05-11');
const msPerWeek = 7 * 24 * 60 * 60 * 1000;

let weeks = [];

// Initialize weeks from firstWeekDate to current week
function generateWeeks() {
  weeks = [];
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let current = new Date(firstWeekDate);

  while (current <= todayMidnight) {
    const startStr = current.toISOString().slice(0, 10);
    weeks.push({start: startStr});
    current = new Date(current.getTime() + msPerWeek);
  }
}

// Mulberry32 PRNG for seeding
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Dice colors mapping by value
const diceColors = {
  1: {color: 'white', background: 'red'},
  2: {color: 'black', background: 'white'},
  3: {color: 'white', background: 'blue'},
  4: {color: 'black', background: 'yellow'},
  5: {color: 'white', background: 'green'},
  6: {color: 'yellow', background: 'black'}
};

function createDice() {
  diceContainer.innerHTML = '';
  usedDiceIndices.clear();

  // Seed from week start date string
  const seedString = weeks[currentWeekIndex].start;
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed = seed * 31 + seedString.charCodeAt(i);
    seed = seed & 0xffffffff;
  }
  const rand = mulberry32(seed);

  for (let i = 0; i < 5; i++) {
    const val = Math.floor(rand() * 6) + 1;
    const die = document.createElement('div');
    die.classList.add('die');
    die.dataset.index = i;
    die.dataset.value = val.toString();
    die.textContent = val;
    die.style.color = diceColors[val].color;
    die.style.backgroundColor = diceColors[val].background;
    die.style.border = '1px solid black';
    diceContainer.appendChild(die);
  }
}

function updateNumberGrid() {
  numberGrid.innerHTML = '';
  for (let n = 1; n <= 100; n++) {
    const cell = document.createElement('div');
    cell.classList.add('numberCell');
    cell.textContent = n;
    if (completedNumbers.has(n)) {
      cell.classList.add('completed');
    }
    numberGrid.appendChild(cell);
  }
}

function saveProgress() {
  const key = `qu0x100_week_${weeks[currentWeekIndex].start}`;
  localStorage.setItem(key, JSON.stringify(Array.from(completedNumbers)));
}

function loadProgress() {
  const key = `qu0x100_week_${weeks[currentWeekIndex].start}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    const arr = JSON.parse(stored);
    completedNumbers = new Set(arr);
  } else {
    completedNumbers = new Set();
  }
  completedCountSpan.textContent = completedNumbers.size;
}

function onExpressionChange() {
  inputBox.textContent = expression;
  updateOutput();
  trackDiceUsage();
}

function updateOutput() {
  const val = evaluateExpression(expression);
  if (val === null || isNaN(val) || !Number.isInteger(val) || val < 1 || val > 100) {
    outputBox.textContent = '?';
  } else {
    outputBox.textContent = val;
  }
}

function evaluateExpression(expr) {
  if (!expr) return null;

  // Replace ^ with ** for exponentiation
  const safeExpr = expr.replace(/\^/g, '**');

  try {
    // Check for invalid characters first
    if (/[^0-9+\-*/().! ]/.test(safeExpr)) return null;

    // Evaluate factorial and double/triple factorials
    const factorialRe = /(\d+|\([^()]+\))(!{1,3})/g;

    function factorial(n) {
      if (n < 0 || !Number.isInteger(n)) return null;
      let res = 1;
      for (let i = 2; i <= n; i++) res *= i;
      return res;
    }

    let exprToEval = safeExpr;

    exprToEval = exprToEval.replace(factorialRe, (match, base, factMarks) => {
      let val;
      // Evaluate base if it is a parenthesized expression
      if (base.startsWith('(')) {
        val = evaluateExpression(base.slice(1, -1));
      } else {
        val = parseInt(base, 10);
      }
      if (val === null) return 'NaN';

      // Calculate factorial or multiple factorials:
      let res = val;
      for (let i = 0; i < factMarks.length; i++) {
        if (res === null || res < 0 || !Number.isInteger(res)) return 'NaN';
        if (res === 0) {
          res = 1;
          continue;
        }
        if (factMarks[i] === '!') {
          res = singleFactorial(res);
        }
      }
      return res.toString();
    });

    function singleFactorial(x) {
      if (x < 0 || !Number.isInteger(x)) return null;
      if (x === 0) return 1;
      let result = 1;
      for (let i = x; i > 1; i -= 1) {
        result *= i;
      }
      return result;
    }

    // Evaluate the final expression with Function constructor
    // Prevent usage of disallowed characters by regexp above
    const func = new Function(`return (${exprToEval});`);
    const result = func();

    if (typeof result === 'number' && Number.isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

function trackDiceUsage() {
  usedDiceIndices.clear();

  // Extract all numbers from expression (including inside parentheses)
  // Match numbers only (not partial numbers or decimals)
  const numbers = expression.match(/\d+/g);
  if (!numbers) {
    updateDiceAvailability();
    return;
  }

  // Count each number's digit usage against dice values
  // For Qu0x 100, dice values are 1-6 only, numbers can be > 9,
  // but only dice values 1-6 exist.

  // We will check if all dice values appear exactly once as numbers or parts of expression.
  // Since dice values are single digits 1-6, and expression numbers can be multi-digit,
  // this means each dice must appear exactly once as a single digit number in the expression.

  // But for this game, each dice value must be used once. The user inputs the expression
  // with dice digits only once each (no repeats allowed).

  // So, check expression digits against dice values:
  const diceValues = Array.from(diceContainer.children).map(d => Number(d.dataset.value));

  // Count usage of each dice value in expression digits
  let usageCounts = {};
  diceValues.forEach(v => usageCounts[v] = 0);

  for (const ch of expression) {
    const digit = Number(ch);
    if (digit >= 1 && digit <= 6) {
      if (usageCounts.hasOwnProperty(digit)) {
        usageCounts[digit]++;
      }
    }
  }

  // Mark dice as used if usageCounts >=1
  diceValues.forEach((val, i) => {
    const die = diceContainer.children[i];
    if (usageCounts[val] === 1) {
      die.style.opacity = '0.3';
      usedDiceIndices.add(i);
    } else {
      die.style.opacity = '1';
    }
  });
}

function updateDiceAvailability() {
  const diceValues = Array.from(diceContainer.children).map(d => Number(d.dataset.value));
  diceValues.forEach((val, i) => {
    const die = diceContainer.children[i];
    die.style.opacity = '1';
  });
}

function addButtonListeners() {
  // Clear existing buttons
  buttonRow1Div.innerHTML = '';
  buttonRow2Div.innerHTML = '';

  // Row 1: digits 1-6 (dice values only)
  // For Qu0x100, allow digits 1-6 buttons so user can click digits to build expression.
  for (let i = 1; i <= 6; i++) {
    const btn = document.createElement('button');
    btn.textContent = i.toString();
    btn.addEventListener('click', () => {
      // Only allow digit if that dice value is not already used once in expression
      const countInExpr = (expression.match(new RegExp(i.toString(), 'g')) || []).length;
      const diceValues = Array.from(diceContainer.children).map(d => Number(d.dataset.value));
      const maxCount = diceValues.filter(v => v === i).length; // Should be 0 or 1
      if (countInExpr < maxCount) {
        expression += i.toString();
        onExpressionChange();
      }
    });
    buttonRow1Div.appendChild(btn);
  }

  // Row 2: operations and controls
  const ops = ['+', '-', '*', '/', '^', '(', ')', '!', 'Backspace', 'Clear', 'Submit'];
  ops.forEach(op => {
    const btn = document.createElement('button');
    btn.textContent = op;
    btn.addEventListener('click', () => {
      if (op === 'Backspace') {
        if (expression.length > 0) {
          expression = expression.slice(0, -1);
          onExpressionChange();
        }
      } else if (op === 'Clear') {
        expression = '';
        onExpressionChange();
      } else if (op === 'Submit') {
        handleSubmit();
      } else {
        // Add operation symbol
        expression += op;
        onExpressionChange();
      }
    });
    buttonRow2Div.appendChild(btn);
  });
}

function handleSubmit() {
  const val = evaluateExpression(expression);
  if (val === null || !Number.isInteger(val) || val < 1 || val > 100) {
    alert('Invalid submission. Expression must evaluate to an integer between 1 and 100.');
    return;
  }

  // Check if all dice used exactly once (all dice digits must appear once)
  const diceValues = Array.from(diceContainer.children).map(d => Number(d.dataset.value));
  let usageCounts = {};
  diceValues.forEach(v => usageCounts[v] = 0);

  for (const ch of expression) {
    const digit = Number(ch);
    if (digit >= 1 && digit <= 6 && usageCounts.hasOwnProperty(digit)) {
      usageCounts[digit]++;
    }
  }

  // Verify dice usage matches exactly once for each dice value
  for (let i = 0; i < diceValues.length; i++) {
    if (usageCounts[diceValues[i]] !== 1) {
      alert('You must use each dice value exactly once in the expression.');
      return;
    }
  }

  // Check if number already completed
  if (completedNumbers.has(val)) {
    alert(`Number ${val} already completed! Try a different number.`);
    return;
  }

  completedNumbers.add(val);
  saveProgress();
  completedCountSpan.textContent = completedNumbers.size;
  updateNumberGrid();
  expression = '';
  onExpressionChange();

  // Update Game # display as week start date + completed count
  gameNumberDiv.textContent = `Game #${weeks[currentWeekIndex].start} - Completed ${completedNumbers.size}/100`;

  if (completedNumbers.size === 100) {
    alert('Congratulations! You completed all numbers 1 to 100 for this week: Qu0x 100!');
  }
}

function setupWeekSelect() {
  weekSelect.innerHTML = '';
  weeks.forEach((week, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Week starting ${week.start}`;
    weekSelect.appendChild(opt);
  });
  // Default select last week (current)
  currentWeekIndex = weeks.length - 1;
  weekSelect.value = currentWeekIndex;
  loadWeek(currentWeekIndex);
}

function loadWeek(index) {
  currentWeekIndex = index;
  createDice();
  loadProgress();
  updateNumberGrid();
  expression = '';
  onExpressionChange();
  gameNumberDiv.textContent = `Game #${weeks[currentWeekIndex].start} - Completed ${completedNumbers.size}/100`;
}

weekSelect.addEventListener('change', e => {
  loadWeek(Number(e.target.value));
});

function init() {
  generateWeeks();
  setupWeekSelect();
  addButtonListeners();
  updateOutput();
  updateNumberGrid();
}

init();
