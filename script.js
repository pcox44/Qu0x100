// --- Constants and selectors ---
const diceValues = [1, 2, 3, 4, 5, 6];
const diceColors = {
  1: { bg: 'red', fg: 'white', class: 'd1' },
  2: { bg: 'white', fg: 'black', class: 'd2' },
  3: { bg: 'blue', fg: 'white', class: 'd3' },
  4: { bg: 'yellow', fg: 'black', class: 'd4' },
  5: { bg: 'green', fg: 'white', class: 'd5' },
  6: { bg: 'black', fg: 'yellow', class: 'd6' },
};

const buttonRow1 = ['+', '-', '*', '/', '^', '!'];
const buttonRow2 = ['(', ')', 'Back', 'Clear'];

const diceContainer = document.getElementById('diceContainer');
const expressionBox = document.getElementById('expressionBox');
const evaluationBox = document.getElementById('evaluationBox');
const equalsSign = document.getElementById('equalsSign');
const numberGrid = document.getElementById('numberGrid');
const weekSelect = document.getElementById('weekSelect');
const completedCountSpan = document.getElementById('completedCount');
const gameNumberSpan = document.getElementById('gameNumber');
const buttonRow1Div = document.getElementById('buttonRow1');
const buttonRow2Div = document.getElementById('buttonRow2');

let expression = '';
let usedDiceIndices = new Set();

let completedNumbers = new Set();

let currentWeekIndex = 0;  // Index into weeks array
let weeks = []; // will hold {label: "5/11/2025", date: Date object}

// --- Initialization ---

function generateWeeks(startDate, endDate) {
  // Generate weeks from startDate (Monday assumed) to endDate (today)
  const weeksArr = [];
  let cur = new Date(startDate);
  let i = 1;
  while (cur <= endDate) {
    const label = `${cur.getMonth()+1}/${cur.getDate()}/${cur.getFullYear()}`;
    weeksArr.push({ label, date: new Date(cur), number: i });
    cur.setDate(cur.getDate() + 7);
    i++;
  }
  return weeksArr;
}

// Set start date to May 11, 2025 (Sunday)
const startDate = new Date(2025, 4, 11);
const today = new Date();
weeks = generateWeeks(startDate, today);

// Populate dropdown
function populateWeekSelect() {
  weekSelect.innerHTML = '';
  weeks.forEach(({label, number}, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `#${number} (${label})`;
    weekSelect.appendChild(opt);
  });
}

// Get current week index based on today's date
function findCurrentWeekIndex() {
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].date <= today) return i;
  }
  return 0;
}

// --- Dice Setup ---

function createDice() {
  diceContainer.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const val = diceValues[Math.floor(Math.random() * diceValues.length)];
    const die = document.createElement('div');
    die.className = `die ${diceColors[val].class}`;
    die.textContent = val;
    die.dataset.value = val;
    die.dataset.index = i;
    die.addEventListener('click', onDieClick);
    diceContainer.appendChild(die);
  }
}

// --- Button Setup ---

function createButtons() {
  buttonRow1Div.innerHTML = '';
  buttonRow2Div.innerHTML = '';

  buttonRow1.forEach(sym => {
    const btn = document.createElement('button');
    btn.textContent = sym;
    btn.dataset.value = sym;
    btn.addEventListener('click', () => onButtonClick(sym));
    buttonRow1Div.appendChild(btn);
  });

  buttonRow2.forEach(sym => {
    const btn = document.createElement('button');
    btn.textContent = sym;
    btn.dataset.value = sym;
    btn.addEventListener('click', () => onButtonClick(sym));
    buttonRow2Div.appendChild(btn);
  });
}

// --- Expression & Dice Handling ---

function onDieClick(e) {
  const die = e.currentTarget;
  if (die.classList.contains('faded')) return; // Already used

  const idx = parseInt(die.dataset.index);
  const val = die.dataset.value;

  // Append value to expression
  expression += val;
  usedDiceIndices.add(idx);
  die.classList.add('faded');
  updateExpression();
  updateEvaluation();
}

function onButtonClick(value) {
  if (value === 'Back') {
    backspace();
  } else if (value === 'Clear') {
    clearExpression();
  } else {
    expression += value;
    updateExpression();
    updateEvaluation();
  }
}

function backspace() {
  if (expression.length === 0) return;
  // Remove last char
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // If lastChar was a dice number, restore dice
  if (/[1-6]/.test(lastChar)) {
    // Find last used dice with that number to restore
    // Dice indices stored, but expression can have multiple same digits - only restore one die per backspace
    // So we find the rightmost dice used with that number
    for (let i = 4; i >= 0; i--) {
      if (usedDiceIndices.has(i)) {
        const die = diceContainer.children[i];
        if (die && die.textContent === lastChar) {
          usedDiceIndices.delete(i);
          die.classList.remove('faded');
          break;
        }
      }
    }
  }
  updateExpression();
  updateEvaluation();
}

function clearExpression() {
  expression = '';
  usedDiceIndices.clear();
  Array.from(diceContainer.children).forEach(die => die.classList.remove('faded'));
  updateExpression();
  updateEvaluation();
}

function updateExpression() {
  expressionBox.textContent = expression;
}

function updateEvaluation() {
  if (expression.length === 0) {
    evaluationBox.textContent = '?';
    return;
  }
  try {
    // Only allow safe characters in eval
    if (!/^[0-9+\-*/^().!]+$/.test(expression)) {
      evaluationBox.textContent = 'Invalid';
      return;
    }
    // Evaluate with factorial and ^ support
    let val = evaluateExpression(expression);
    if (val === null || isNaN(val) || !isFinite(val)) {
      evaluationBox.textContent = 'Invalid';
      return;
    }
    // Must be integer >= 1 and <= 100 to consider completing number
    if (!Number.isInteger(val)) {
      evaluationBox.textContent = val.toFixed(2);
    } else {
      evaluationBox.textContent = val;
    }
  } catch (e) {
    evaluationBox.textContent = 'Invalid';
  }
}

// Evaluate expression with factorial support
function evaluateExpression(expr) {
  // Replace ^ with **
  let modExpr = expr.replace(/\^/g, '**');

  // Handle factorial: replace n! with fact(n)
  // We'll do a recursive replacement for factorials, including double/triple factorial
  // Note: double factorials (!!) and triple factorials (!!!) supported

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = n; i > 1; i--) {
      res *= i;
    }
    return res;
  }

  function doubleFactorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === -1) return 1;
    let res = 1;
    for (let i = n; i > 0; i -= 2) {
      res *= i;
    }
    return res;
  }

  // Parse and replace factorials and double/triple factorials with function calls

  // Regex to match (expression)! or (expression)!! or (expression)!!!
  // or number factorials like 5!, 5!!, 5!!!
  // We parse inside parentheses recursively
  // Approach: repeatedly replace from right to left all factorials

  while (true) {
    // Match factorial pattern: capture number or parenthesis expression with factorial(s)
    // We'll match the rightmost factorial first to replace
    const factRegex = /(\([^\(\)]+\)|\d+)(!{1,3})/g;
    let replaced = false;

    modExpr = modExpr.replace(factRegex, (match, numExpr, facts) => {
      replaced = true;
      let val;
      try {
        val = eval(numExpr);
      } catch {
        return match; // fail silently
      }
      if (isNaN(val) || !isFinite(val) || val < 0 || !Number.isInteger(val)) {
        return match; // invalid factorial base, leave as is
      }
      // Apply factorials
      if (facts.length === 1) {
        return factorial(val);
      } else if (facts.length === 2) {
        return doubleFactorial(val);
      } else if (facts.length === 3) {
        // triple factorial = double factorial applied once more on double factorial result?
        // Triple factorial is n!!! = product of every third number down to 1 or 2
        // Implement it similarly:
        if (val === 0 || val === -1) return 1;
        let res = 1;
        for (let i = val; i > 0; i -= 3) {
          res *= i;
        }
        return res;
      } else {
        return match; // unsupported
      }
    });
    if (!replaced) break;
  }

  // Evaluate final expression safely (only digits and operators)
  // eslint-disable-next-line no-new-func
  const finalVal = Function(`"use strict"; return (${modExpr})`)();

  return finalVal;
}

// --- Number Grid Setup ---

function createNumberGrid() {
  numberGrid.innerHTML = '';
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement('div');
    cell.classList.add('number-cell');
    cell.textContent = i;
    if (completedNumbers.has(i)) {
      cell.classList.add('completed');
    }
    numberGrid.appendChild(cell);
  }
}

function updateNumberGrid() {
  Array.from(numberGrid.children).forEach(cell => {
    const num = parseInt(cell.textContent);
    if (completedNumbers.has(num)) {
      cell.classList.add('completed');
    } else {
      cell.classList.remove('completed');
    }
  });
  completedCountSpan.textContent = completedNumbers.size;
}

// --- Storage ---

function loadProgress() {
  const key = `qu0x100_week_${currentWeekIndex}`;
  const saved = localStorage.getItem(key);
  completedNumbers = saved ? new Set(JSON.parse(saved)) : new Set();
}

function saveProgress() {
  const key = `qu0x100_week_${currentWeekIndex}`;
  localStorage.setItem(key, JSON.stringify(Array.from(completedNumbers)));
}

// --- Handle week changes ---

function setCurrentWeek(index) {
  currentWeekIndex = index;
  gameNumberSpan.textContent = weeks[index].number;
  loadProgress();
  createDice();
  clearExpression();
  createNumberGrid();
  updateNumberGrid();
}

// --- Check if current expression matches a number 1-100 ---

function checkExpression() {
  const val = evaluateExpression(expression);
  if (val === null || isNaN(val) || !isFinite(val)) return;

  if (Number.isInteger(val) && val >= 1 && val <= 100 && usedDiceIndices.size === 5) {
    if (!completedNumbers.has(val)) {
      completedNumbers.add(val);
      saveProgress();
      updateNumberGrid();
      completedCountSpan.textContent = completedNumbers.size;
      alert(`Congrats! You completed number ${val}`);
      clearExpression();
      createDice();
    }
  }
}

// --- Event Listeners ---

weekSelect.addEventListener('change', () => {
  setCurrentWeek(parseInt(weekSelect.value));
});

// After expression changes (via dice or buttons), update and check
function onExpressionChange() {
  updateExpression();
  updateEvaluation();
  checkExpression();
}

// Override previous updateExpression and updateEvaluation usage to call onExpressionChange

// Replace calls to updateExpression and updateEvaluation inside onDieClick, onButtonClick, backspace, clearExpression

// Modify onDieClick:
function onDieClickUpdated(e) {
  const die = e.currentTarget;
  if (die.classList.contains('faded')) return;

  const idx = parseInt(die.dataset.index);
  const val = die.dataset.value;

  expression += val;
  usedDiceIndices.add(idx);
  die.classList.add('faded');
  onExpressionChange();
}

function onButtonClickUpdated(value) {
  if (value === 'Back') {
    backspaceUpdated();
  } else if (value === 'Clear') {
    clearExpressionUpdated();
  } else {
    expression += value;
    onExpressionChange();
  }
}

function backspaceUpdated() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  if (/[1-6]/.test(lastChar)) {
    for (let i = 4; i >= 0; i--) {
      if (usedDiceIndices.has(i)) {
        const die = diceContainer.children[i];
        if (die && die.textContent === lastChar) {
          usedDiceIndices.delete(i);
          die.classList.remove('faded');
          break;
        }
      }
    }
  }
  onExpressionChange();
}

function clearExpressionUpdated() {
  expression = '';
  usedDiceIndices.clear();
  Array.from(diceContainer.children).forEach(die => die.classList.remove('faded'));
  onExpressionChange();
}

// Reassign these updated versions
diceContainer.removeEventListener('click', onDieClick);
diceContainer.removeEventListener('click', onDieClickUpdated);
diceContainer.childNodes.forEach(node => node.removeEventListener('click', onDieClick));
buttonRow1Div.childNodes.forEach(node => node.removeEventListener('click', onButtonClick));
buttonRow2Div.childNodes.forEach(node => node.removeEventListener('click', onButtonClick));


// After creating dice and buttons, add event listeners with updated functions
function init() {
  populateWeekSelect();
  const currentIndex = findCurrentWeekIndex();
  weekSelect.value = currentIndex;
  setCurrentWeek(currentIndex);
  createButtons();

  // After buttons created, update event listeners for buttons to updated versions
  Array.from(buttonRow1Div.children).forEach(btn => {
    btn.removeEventListener('click', onButtonClick);
    btn.addEventListener('click', () => onButtonClickUpdated(btn.dataset.value));
  });
  Array.from(buttonRow2Div.children).forEach(btn => {
    btn.removeEventListener('click', onButtonClick);
    btn.addEventListener('click', () => onButtonClickUpdated(btn.dataset.value));
  });

  // Dice listeners are attached on dice creation in createDice()
}

init();
