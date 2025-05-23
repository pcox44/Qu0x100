// Qu0x Daily Dice Game

const startDate = new Date(2025, 4, 15); // May 15, 2025 (month is 0-based)
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const diceColors = {
  1: { bg: 'red-bg', fg: 'white' },   // 1: white on red
  2: { bg: 'white-bg', fg: 'black' }, // 2: black on white
  3: { bg: 'blue-bg', fg: 'white' },  // 3: white on blue
  4: { bg: 'yellow-bg', fg: 'black' },// 4: black on yellow
  5: { bg: 'green-bg', fg: 'white' }, // 5: white on green
  6: { bg: 'black-bg', fg: 'yellow' } // 6: yellow on black
};

const operators = ['+', '-', '*', '/', '^', '(', ')', '!', 'Clear', 'Backspace'];

let totalDays;
let currentDayIndex;
let puzzles = [];
let solutions = {};
let bestScores = {};
let qu0xDays = new Set();

let diceValues = [];
let usedDice = new Set();
let expression = '';
let evaluating = false;

const daySelect = document.getElementById('day-select');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const diceContainer = document.getElementById('dice-container');
const operatorRow = document.getElementById('operator-row');
const expressionBox = document.getElementById('expression-box');
const outputBox = document.getElementById('output-box');
const submitBtn = document.getElementById('submit-btn');
const targetBox = document.getElementById('target-box');
const dailyBestScoreDiv = document.getElementById('daily-best-score');
const qu0xFractionSpan = document.getElementById('qu0x-fraction');
const qu0xMasterDiv = document.getElementById('qu0x-master');
const qu0xPopup = document.getElementById('qu0x-popup');
const equalsSign = document.getElementById('equals');

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / MS_PER_DAY);
}

function getDateForIndex(i) {
  let dt = new Date(startDate.getTime() + i * MS_PER_DAY);
  return dt;
}

function formatDate(dt) {
  return dt.toISOString().slice(0, 10);
}

function randomSeeded(seed) {
  // Simple deterministic seeded RNG (Mulberry32)
  let t = seed + 0x6D2B79F5;
  return function() {
    t += 0x6D2B79F5;
    var x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePuzzleForDay(dayIndex) {
  // Seed based on date string
  let dt = getDateForIndex(dayIndex);
  let seedStr = formatDate(dt).replace(/-/g, '');
  let seed = parseInt(seedStr, 10);
  let rng = randomSeeded(seed);

  // Generate 5 dice 1-6
  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(rng() * 6));
  }

  // Target between 1 and 100
  let target = 1 + Math.floor(rng() * 100);

  return { dice, target };
}

function init() {
  totalDays = daysBetween(startDate, new Date());
  if (totalDays < 0) totalDays = 0;

  // Generate all puzzles for all days
  puzzles = [];
  for (let i = 0; i <= totalDays; i++) {
    puzzles.push(generatePuzzleForDay(i));
  }

  // Load saved state
  let saved = localStorage.getItem('qu0x_solutions');
  if (saved) {
    try {
      solutions = JSON.parse(saved);
    } catch {
      solutions = {};
    }
  } else {
    solutions = {};
  }

  // Extract best scores and qu0x days
  bestScores = {};
  qu0xDays = new Set();
  for (const key in solutions) {
    let score = solutions[key].score;
    if (score === 0) qu0xDays.add(key);
    bestScores[key] = score;
  }

  setupDaySelect();
  currentDayIndex = totalDays;
  daySelect.value = currentDayIndex.toString();

  setupOperatorButtons();
  loadDay(currentDayIndex);

  prevBtn.addEventListener('click', () => {
    if (currentDayIndex > 0) {
      loadDay(currentDayIndex - 1);
    }
  });
  nextBtn.addEventListener('click', () => {
    if (currentDayIndex < totalDays) {
      loadDay(currentDayIndex + 1);
    }
  });

  daySelect.addEventListener('change', () => {
    const val = parseInt(daySelect.value);
    if (!isNaN(val)) loadDay(val);
  });

  submitBtn.addEventListener('click', onSubmit);
}

function setupDaySelect() {
  daySelect.innerHTML = '';
  for (let i = 0; i <= totalDays; i++) {
    const dt = getDateForIndex(i);
    const label = formatDate(dt);
    const option = document.createElement('option');
    option.value = i.toString();
    option.textContent = label;
    // Add emoji for status
    if (qu0xDays.has(i.toString())) {
      option.textContent = `⭐ ${label}`;
    } else if (bestScores[i.toString()] !== undefined) {
      option.textContent = `✅ ${label}`;
    } // else blank

    daySelect.appendChild(option);
  }
}

function setupOperatorButtons() {
  operatorRow.innerHTML = '';
  operators.forEach(op => {
    const btn = document.createElement('button');
    btn.textContent = op;
    btn.classList.add('operator-btn');
    btn.title = (op === 'Clear' || op === 'Backspace') ? op : `Operator: ${op}`;
    btn.addEventListener('click', () => onOperatorClick(op));
    operatorRow.appendChild(btn);
  });
}

function onOperatorClick(op) {
  if (isLocked(currentDayIndex)) return;

  if (op === 'Clear') {
    resetExpression();
    return;
  }
  if (op === 'Backspace') {
    backspaceExpression();
    return;
  }
  // For factorial ! only append if expression is not empty and last char is digit or )
  if (op === '!') {
    if (expression.length === 0) return;
    const lastChar = expression.slice(-1);
    if (!(/[0-9)]/.test(lastChar))) return;
  }

  // Append operator
  expression += op;
  updateExpression();
}

function backspaceExpression() {
  if (expression.length === 0) return;

  // Remove last char and possibly restore dice if last char was a dice number removed
  let lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  updateExpression();

  // If last char removed was dice value and dice was faded out, restore dice
  if (lastChar >= '1' && lastChar <= '6') {
    usedDice.delete(lastChar);
    updateDiceStates();
  }
}

function resetExpression() {
  expression = '';
  usedDice.clear();
  updateExpression();
  updateDiceStates();
}

function updateExpression() {
  expressionBox.textContent = expression;
  evaluateExpression();
}

function evaluateExpression() {
  if (expression.length === 0) {
    outputBox.textContent = '?';
    return;
  }

  // Replace ^ with ** for JS eval, convert factorial properly
  try {
    const exprForEval = transformExpressionForEval(expression);
    let val = evaluateWithFactorial(exprForEval);
    if (typeof val === 'number' && isFinite(val)) {
      outputBox.textContent = val.toFixed(2);
    } else {
      outputBox.textContent = '?';
    }
  } catch {
    outputBox.textContent = '?';
  }
}

function transformExpressionForEval(expr) {
  // Replace ^ with ** for exponentiation
  // Also transform factorial (!)
  // This function does not fully parse factorial but replaces 'n!' by 'fact(n)' calls
  // Use a regex to convert all occurrences of n! where n is integer or parens group

  // Replace ^ with **
  let e = expr.replace(/\^/g, '**');

  // Convert factorials n! to fact(n)
  // Support numbers or expressions inside parentheses immediately before !
  // e.g. 3! or (2+1)!
  // We'll parse from right to left

  // Helper: find the operand to factorial to wrap with fact()
  // We'll do iterative regex replacement until no ! left

  while (e.includes('!')) {
    // Find the last factorial !
    let i = e.lastIndexOf('!');

    // Find the operand before i
    // If the char before ! is a digit, get full number
    // If the char before ! is ')', find matching '('
    // Else error: remove ! to avoid infinite loop

    let operandStart = -1;
    let operandEnd = i - 1;

    if (/\d/.test(e[operandEnd])) {
      // Number operand
      let start = operandEnd;
      while (start - 1 >= 0 && /\d/.test(e[start - 1])) start--;
      operandStart = start;
    } else if (e[operandEnd] === ')') {
      // Find matching '('
      let count = 1;
      let pos = operandEnd - 1;
      while (pos >= 0 && count > 0) {
        if (e[pos] === ')') count++;
        else if (e[pos] === '(') count--;
        pos--;
      }
      if (count === 0) {
        operandStart = pos + 1;
      } else {
        // Unmatched parens: remove !
        e = e.slice(0, i) + e.slice(i + 1);
        continue;
      }
    } else {
      // Invalid operand, remove !
      e = e.slice(0, i) + e.slice(i + 1);
      continue;
    }

    const operand = e.slice(operandStart, operandEnd + 1);
    // Replace operand! with fact(operand)
    e = e.slice(0, operandStart) + `fact(${operand})` + e.slice(i + 1);
  }

  return e;
}

function evaluateWithFactorial(expr) {
  function fact(n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
      throw new Error('Factorial only for non-negative integers');
    }
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
  // Use Function constructor for safer eval (no scope pollution)
  // eslint-disable-next-line no-new-func
  const f = new Function('fact', `return ${expr};`);
  return f(fact);
}

function loadDay(dayIndex) {
  if (dayIndex < 0 || dayIndex > totalDays) return;
  currentDayIndex = dayIndex;
  daySelect.value = dayIndex.toString();

  const puzzle = puzzles[dayIndex];
  diceValues = puzzle.dice;
  target = puzzle.target;

  // Reset expression and used dice
  expression = '';
  usedDice.clear();

  updateDiceStates();
  updateExpression();

  targetBox.textContent = target;
  dailyBestScoreDiv.textContent = bestScores[dayIndex] !== undefined ? bestScores[dayIndex] : '-';
  outputBox.textContent = '?';

  // Lock if solved perfectly
  if (isLocked(dayIndex)) {
    expression = solutions[dayIndex].expression;
    updateExpression();
    outputBox.textContent = evaluateWithFactorial(transformExpressionForEval(expression)).toFixed(2);
  }

  updateSubmitButton();
  updateQu0xFraction();
  updateQu0xMaster();
  updateDropdownDayLabels();
}

function updateDiceStates() {
  diceValues.forEach((val, i) => {
    const btn = diceButtons[i];
    if (usedDice.has(val)) {
      btn.disabled = true;
      btn.classList.add('used');
    } else {
      btn.disabled = false;
      btn.classList.remove('used');
    }
    btn.textContent = val.toString();
  });
}

function onDiceClick(i) {
  if (isLocked(currentDayIndex)) return;

  const val = diceValues[i];
  if (usedDice.has(val)) return;

  expression += val.toString();
  usedDice.add(val);
  updateExpression();
  updateDiceStates();
}

function isLocked(dayIndex) {
  return solutions[dayIndex] && solutions[dayIndex].score === 0;
}

function onSubmit() {
  if (isLocked(currentDayIndex)) return;

  // Evaluate expression
  let score;
  try {
    const exprForEval = transformExpressionForEval(expression);
    const val = evaluateWithFactorial(exprForEval);

    score = Math.abs(val - target);
    if (!isFinite(score)) score = Infinity;
  } catch {
    score = Infinity;
  }

  if (score === Infinity) {
    alert('Invalid expression.');
    return;
  }

  // Save solution if better
  const prevScore = bestScores[currentDayIndex];
  if (prevScore === undefined || score < prevScore) {
    bestScores[currentDayIndex] = score;
    solutions[currentDayIndex] = { expression, score };
    localStorage.setItem('qu0x_solutions', JSON.stringify(solutions));
  }

  dailyBestScoreDiv.textContent = score.toFixed(2);

  // If perfect score, show popup and lock day
  if (score === 0) {
    qu0xPopup.style.display = 'block';
    setTimeout(() => {
      qu0xPopup.style.display = 'none';
    }, 3000);
  }

  updateSubmitButton();
  updateQu0xFraction();
  updateQu0xMaster();
  updateDropdownDayLabels();
}

function updateSubmitButton() {
  if (isLocked(currentDayIndex)) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Locked (Qu0x!)';
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

function updateQu0xFraction() {
  const totalQu0x = qu0xDays.size;
  const totalPuzzles = puzzles.length;
  qu0xFractionSpan.textContent = `${totalQu0x} / ${totalPuzzles}`;
}

function updateQu0xMaster() {
  // Qu0x Master score = sum of all daily best scores (only when all days solved)
  if (Object.keys(bestScores).length === puzzles.length) {
    let sum = 0;
    for (const k in bestScores) {
      sum += bestScores[k];
    }
    qu0xMasterDiv.textContent = `Qu0x Master Score: ${sum.toFixed(2)}`;
  } else {
    qu0xMasterDiv.textContent = 'Qu0x Master Score: N/A';
  }
}

function updateDropdownDayLabels() {
  // Update the dropdown labels with emoji for status
  [...daySelect.options].forEach(option => {
    const val = option.value;
    const label = option.textContent.replace(/^[⭐✅] /, '');
    if (qu0xDays.has(val)) {
      option.textContent = `⭐ ${label}`;
    } else if (bestScores[val] !== undefined) {
      option.textContent = `✅ ${label}`;
    } else {
      option.textContent = label;
    }
  });
}

init();
</script>
</body>
</html>
