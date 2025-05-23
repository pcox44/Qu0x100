// Daily Dice Game - Qu0x Edition - script.js

const puzzles = [
  // Example puzzles (date-indexed); replace with your real puzzles
  { dice: [1, 2, 3, 4, 5], target: 42 },
  { dice: [6, 2, 1, 5, 3], target: 17 },
  { dice: [4, 4, 6, 1, 2], target: 33 },
  // Add as many as you want...
];

const daySelect = document.getElementById('day-select');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const diceButtons = [...document.querySelectorAll('.dice-btn')];
const targetBox = document.getElementById('target-number');
const expressionBox = document.getElementById('expression-box');
const outputBox = document.getElementById('output-box');
const submitBtn = document.getElementById('submit-btn');
const dailyBestScoreDiv = document.getElementById('daily-best-score');
const qu0xPopup = document.getElementById('qu0x-popup');
const qu0xFractionSpan = document.getElementById('qu0x-fraction');
const qu0xMasterDiv = document.getElementById('qu0x-master');
const operatorRow = document.getElementById('operator-row');

let currentDayIndex = 0;
let diceValues = [];
let target = 0;
let expression = '';
let usedDice = new Set();

let bestScores = JSON.parse(localStorage.getItem('qu0x_best_scores') || '{}');
let solutions = JSON.parse(localStorage.getItem('qu0x_solutions') || '{}');
let qu0xDays = new Set(Object.entries(solutions)
  .filter(([k, v]) => v.score === 0)
  .map(([k]) => k));

const operators = ['+', '-', '*', '/', '^', '!', 'Clear', 'Backspace'];

function init() {
  // Populate day select
  puzzles.forEach((_, i) => {
    const option = document.createElement('option');
    option.value = i.toString();
    option.textContent = `Game #${i + 1}`;
    daySelect.appendChild(option);
  });

  // Setup operator buttons
  operators.forEach(op => {
    const btn = document.createElement('button');
    btn.textContent = op;
    btn.classList.add('operator-btn');
    btn.disabled = false;
    btn.addEventListener('click', () => onOperatorClick(op));
    operatorRow.appendChild(btn);
  });

  daySelect.addEventListener('change', () => {
    const day = parseInt(daySelect.value);
    loadDay(day);
  });

  prevBtn.addEventListener('click', () => {
    if (currentDayIndex > 0) loadDay(currentDayIndex - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (currentDayIndex < puzzles.length - 1) loadDay(currentDayIndex + 1);
  });

  diceButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => onDiceClick(i));
  });

  submitBtn.addEventListener('click', onSubmit);

  loadDay(0);
  updateQu0xFraction();
  updateQu0xMaster();
  updateDropdownDayLabels();
}

function loadDay(dayIndex) {
  if (dayIndex < 0 || dayIndex >= puzzles.length) return;

  currentDayIndex = dayIndex;
  daySelect.value = dayIndex.toString();

  const puzzle = puzzles[dayIndex];
  diceValues = puzzle.dice;
  target = puzzle.target;

  expression = '';
  usedDice.clear();

  updateDiceStates();
  updateExpression();

  targetBox.textContent = target;
  dailyBestScoreDiv.textContent = bestScores[dayIndex] !== undefined ? bestScores[dayIndex].toFixed(2) : '-';
  outputBox.textContent = '?';

  // If day is locked (perfect score), show solution and disable input
  if (isLocked(dayIndex)) {
    expression = solutions[dayIndex].expression;
    updateExpression();
    const val = evaluateWithFactorial(transformExpressionForEval(expression));
    outputBox.textContent = val.toFixed(2);
  }

  updateSubmitButton();
  updateDropdownDayLabels();
}

function updateDiceStates() {
  diceValues.forEach((val, i) => {
    const btn = diceButtons[i];
    btn.textContent = val.toString();
    btn.disabled = false;
    btn.classList.remove('used');

    // Color dice according to value:
    // 1: white on red background,
    // 2: black on white background,
    // 3: white on blue background,
    // 4: black on yellow background,
    // 5: white on green background,
    // 6: yellow on black background.

    // (Colors are set by CSS nth-child selectors.)

    // Disable used dice buttons
    if (usedDice.has(i)) {
      btn.disabled = true;
      btn.classList.add('used');
    }
  });
}

function onDiceClick(i) {
  if (isLocked(currentDayIndex)) return;
  if (usedDice.has(i)) return;

  expression += diceValues[i].toString();
  usedDice.add(i);

  updateExpression();
  updateDiceStates();
}

function onOperatorClick(op) {
  if (isLocked(currentDayIndex)) return;

  if (op === 'Clear') {
    expression = '';
    usedDice.clear();
    updateDiceStates();
    updateExpression();
    outputBox.textContent = '?';
  } else if (op === 'Backspace') {
    // Remove last character or last dice usage accordingly
    if (expression.length === 0) return;

    // To correctly handle dice removal, find last digit from diceValues in expression from right
    let lastChar = expression[expression.length - 1];
    expression = expression.slice(0, -1);

    // If lastChar is a digit corresponding to dice, remove its usage from usedDice
    for (let i = diceValues.length - 1; i >= 0; i--) {
      if (usedDice.has(i) && diceValues[i].toString() === lastChar) {
        usedDice.delete(i);
        break;
      }
    }

    updateDiceStates();
    updateExpression();
    outputBox.textContent = '?';
  } else if (op === '!') {
    // Factorial only after whole numbers, so allow '!' to be appended
    expression += '!';
    updateExpression();
  } else {
    // Append operator if expression not empty and last char not operator
    if (expression.length === 0) return;
    const lastChar = expression[expression.length - 1];
    if ('+-*/^!'.includes(lastChar)) return; // avoid consecutive operators
    expression += op;
    updateExpression();
  }
}

function updateExpression() {
  expressionBox.textContent = expression;
  updateSubmitButton();
  updateOutputBox();
}

function transformExpressionForEval(expr) {
  // Replace factorials with calls to factorial function
  // We'll replace occurrences like 3! or (2+1)! with factorial calls

  // Simple approach:
  // Replace all instances of X! with factorial(X)
  // Using regex: (\d+|\([^()]+\))!

  return expr.replace(/(\d+|\([^()]+\))!/g, 'factorial($1)');
}

function factorial(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 0) throw new Error('Factorial only for non-negative integers');
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function evaluateWithFactorial(expr) {
  // Evaluate safely allowing factorial and Math functions
  // Using Function constructor with factorial defined

  const fn = new Function('factorial', 'return ' + expr);
  return fn(factorial);
}

function onSubmit() {
  if (isLocked(currentDayIndex)) return;

  try {
    const exprForEval = transformExpressionForEval(expression);
    const val = evaluateWithFactorial(exprForEval);

    if (!isFinite(val)) throw new Error('Invalid value');

    const score = Math.abs(val - target);

    // Save best score
    if (bestScores[currentDayIndex] === undefined || score < bestScores[currentDayIndex]) {
      bestScores[currentDayIndex] = score;
      solutions[currentDayIndex] = { expression, score };
      localStorage.setItem('qu0x_best_scores', JSON.stringify(bestScores));
      localStorage.setItem('qu0x_solutions', JSON.stringify(solutions));

      // Update qu0xDays if perfect score
      if (score === 0) {
        qu0xDays.add(currentDayIndex.toString());
      }
    }

    dailyBestScoreDiv.textContent = bestScores[currentDayIndex].toFixed(2);
    outputBox.textContent = val.toFixed(2);

    if (score === 0) {
      qu0xPopup.style.display = 'block';
      setTimeout(() => {
        qu0xPopup.style.display = 'none';
      }, 3000);
      updateSubmitButton();
    }

    updateQu0xFraction();
    updateQu0xMaster();
    updateDropdownDayLabels();

  } catch (e) {
    alert('Invalid expression: ' + e.message);
  }
}

function isLocked(dayIndex) {
  return solutions[dayIndex] && solutions[dayIndex].score === 0;
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

function updateOutputBox() {
  try {
    const exprForEval = transformExpressionForEval(expression);
    const val = evaluateWithFactorial(exprForEval);
    outputBox.textContent = val.toFixed(2);
  } catch {
    outputBox.textContent = '?';
  }
}

function updateQu0xFraction() {
  const totalQu0x = qu0xDays.size;
  const totalPuzzles = puzzles.length;
  qu0xFractionSpan.textContent = `${totalQu0x} / ${totalPuzzles}`;
}

function updateQu0xMaster() {
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
  [...daySelect.options].forEach(option => {
    const idx = parseInt(option.value);
    if (qu0xDays.has(option.value)) {
      option.textContent = `⭐ Game #${idx + 1}`;
    } else if (solutions[idx]) {
      option.textContent = `✓ Game #${idx + 1}`;
    } else {
      option.textContent = `Game #${idx + 1}`;
    }
  });
}

init();
