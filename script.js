// --- Global Variables ---
const startDate = new Date(2025, 4, 15); // May 15, 2025 (0-based month)
const totalDays = 30; // Number of daily games available (adjust as needed)

let currentDayIndex = 0; // 0-based index for day navigation
let blitzMode = false;

const diceColors = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'yellow',
  5: 'green',
  6: 'black',
};

const diceValues = [1, 2, 3, 4, 5, 6];

// Storage keys
const STORAGE_KEY_BEST_SCORES = 'qu0x-best-scores'; // {dayIndex: bestScore}
const STORAGE_KEY_BEST_EXPRESSIONS = 'qu0x-best-expressions'; // {dayIndex: expression string}
const STORAGE_KEY_TOTAL_QU0X_COUNT = 'qu0x-total-qu0x-count'; // number

// DOM Elements
const targetNumberSpan = document.getElementById('target-number');
const diceRow = document.getElementById('dice-row');
const operatorRow = document.getElementById('operator-row');
const expressionBox = document.getElementById('expression-box');
const expressionOutputBox = document.getElementById('expression-output-box');
const submitBtn = document.getElementById('submit-btn');
const clearBtn = document.getElementById('clear-btn');
const backspaceBtn = document.getElementById('backspace-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const blitzModeBtn = document.getElementById('blitz-mode-btn');
const modeButtonsDiv = document.getElementById('mode-buttons');
const bestScoreDisplay = document.getElementById('best-score-display');
const qu0xPopup = document.getElementById('qu0x-popup');
const totalQu0xCountDisplay = document.getElementById('total-qu0x-count');
const qu0xMasterScoreDisplay = document.getElementById('qu0x-master-score');
const rulesDiv = document.getElementById('rules');

let currentDice = [];
let usedDiceIndices = new Set();

let bestScores = JSON.parse(localStorage.getItem(STORAGE_KEY_BEST_SCORES) || '{}');
let bestExpressions = JSON.parse(localStorage.getItem(STORAGE_KEY_BEST_EXPRESSIONS) || '{}');
let totalQu0xCount = parseInt(localStorage.getItem(STORAGE_KEY_TOTAL_QU0X_COUNT) || '0', 10);

// --- Helper Functions ---

function formatDate(dayIndex) {
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + dayIndex);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function generateTargetForDay(dayIndex) {
  // Simple target generator: pseudo-random but consistent per day
  // Target range 1-100
  const seed = dayIndex + 123456;
  return (Math.abs(Math.sin(seed) * 10000) % 100 + 1) | 0;
}

function generateDiceForDay(dayIndex) {
  // For simplicity: fixed dice values [1,2,3,4,5,6]
  // Could be randomized based on dayIndex seed for variation
  return [1, 2, 3, 4, 5, 6];
}

function renderDice() {
  diceRow.innerHTML = '';
  currentDice.forEach((val, i) => {
    const dieBtn = document.createElement('button');
    dieBtn.className = 'die btn';
    dieBtn.textContent = val;
    dieBtn.style.color = diceColors[val];
    dieBtn.style.backgroundColor = val === 6 ? 'black' : 'white';
    dieBtn.style.borderColor = 'black';
    dieBtn.disabled = usedDiceIndices.has(i);
    dieBtn.title = usedDiceIndices.has(i) ? 'Dice already used' : 'Click to add to expression';
    dieBtn.addEventListener('click', () => {
      if (usedDiceIndices.has(i)) return;
      appendToExpression(val.toString());
      usedDiceIndices.add(i);
      dieBtn.disabled = true;
      dieBtn.title = 'Dice already used';
    });
    diceRow.appendChild(dieBtn);
  });
}

function renderOperators() {
  operatorRow.querySelectorAll('.btn').forEach(button => {
    button.onclick = () => {
      appendToExpression(button.getAttribute('data-val'));
    };
  });
}

function appendToExpression(char) {
  // Prevent dice concatenation naturally because dice buttons disable on use
  // Just append the char
  expressionBox.textContent += char;
  updateExpressionResult();
}

function updateExpressionResult() {
  const expr = expressionBox.textContent;
  try {
    const val = evaluateExpression(expr);
    if (val === null || Number.isNaN(val)) {
      expressionOutputBox.textContent = 'Result: --';
    } else {
      expressionOutputBox.textContent = 'Result: ' + val;
    }
  } catch {
    expressionOutputBox.textContent = 'Result: --';
  }
}

function evaluateExpression(expr) {
  // Disallow fractional exponents
  if (/\^\s*[\d]*\.\d+/.test(expr)) {
    return null;
  }

  // Replace factorials of numbers or parenthesis expressions, e.g. (2+1)! or 3!
  const replacedExpr = expr.replace(/(\([^()]+\)|\d+)!/g, match => {
    const inner = match.slice(0, -1);
    const val = evaluateExpression(inner);
    if (val === null || val < 0 || !Number.isInteger(val)) throw new Error('Invalid factorial');
    return factorial(val).toString();
  });

  // Replace ^ with ** for JS exponentiation
  const jsExpr = replacedExpr.replace(/\^/g, '**');

  // Disallow suspicious characters
  if (/[^0-9+\-*/().!^ ]/.test(jsExpr)) return null;

  try {
    // eslint-disable-next-line no-eval
    const result = eval(jsExpr);
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 1000000) / 1000000; // round to 6 decimals
  } catch {
    return null;
  }
}

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function resetExpression() {
  expressionBox.textContent = '';
  expressionOutputBox.textContent = 'Result: --';
  usedDiceIndices.clear();
  renderDice();
}

function saveBestScore(dayIndex, score, expression) {
  if (!(dayIndex in bestScores) || score < bestScores[dayIndex]) {
    bestScores[dayIndex] = score;
    bestExpressions[dayIndex] = expression;
    localStorage.setItem(STORAGE_KEY_BEST_SCORES, JSON.stringify(bestScores));
    localStorage.setItem(STORAGE_KEY_BEST_EXPRESSIONS, JSON.stringify(bestExpressions));
  }
}

function getBestScore(dayIndex) {
  return bestScores[dayIndex] ?? null;
}

function getBestExpression(dayIndex) {
  return bestExpressions[dayIndex] ?? null;
}

function countTotalQu0x() {
  // Count perfect scores only in daily mode
  let count = 0;
  for (let i = 0; i < totalDays; i++) {
    if (bestScores[i] === 0) count++;
  }
  return count;
}

function calculateMasterScore() {
  // Sum all best scores, only if every day has a submission (not null)
  for (let i = 0; i < totalDays; i++) {
    if (bestScores[i] === undefined) return null;
  }
  let sum = 0;
  for (let i = 0; i < totalDays; i++) {
    sum += bestScores[i];
  }
  return sum;
}

function updateScoreDisplays() {
  const bestScore = getBestScore(currentDayIndex);
  if (bestScore === null) {
    bestScoreDisplay.textContent = 'Best Score: --';
  } else {
    bestScoreDisplay.textContent = `Best Score: ${bestScore}`;
  }

  // Update total Qu0x count and Master Score only in daily mode
  if (!blitzMode) {
    const totalCount = countTotalQu0x();
    totalQu0xCountDisplay.textContent = `Total Qu0x Count: ${totalCount}`;

    const masterScore = calculateMasterScore();
    qu0xMasterScoreDisplay.textContent = masterScore === null ? 'Qu0x-Master Score: --' : `Qu0x-Master Score: ${masterScore}`;
  } else {
    totalQu0xCountDisplay.textContent = `Total Qu0x Count: -- (Blitz Mode)`;
    qu0xMasterScoreDisplay.textContent = `Qu0x-Master Score: -- (Blitz Mode)`;
  }
}

function updateNavigationButtons() {
  prevBtn.disabled = !blitzMode && currentDayIndex <= 0;
  nextBtn.disabled = !blitzMode && currentDayIndex >= totalDays - 1;
}

function isDayLocked(dayIndex) {
  // Locked only if perfect score (0) achieved
  return bestScores[dayIndex] === 0 && !blitzMode;
}

function renderForDay(dayIndex) {
  currentDayIndex = dayIndex;
  usedDiceIndices.clear();

  const target = generateTargetForDay(dayIndex);
  targetNumberSpan.textContent = target;
  currentDice = generateDiceForDay(dayIndex);

  resetExpression();

  renderDice();
  renderOperators();
  updateScoreDisplays();
  updateNavigationButtons();

  // Lock UI if day locked
  if (isDayLocked(dayIndex)) {
    submitBtn.disabled = true;
    clearBtn.disabled = true;
    backspaceBtn.disabled = true;
    expressionBox.contentEditable = false;
    diceRow.querySelectorAll('button').forEach(b => b.disabled = true);
    operatorRow.querySelectorAll('button').forEach(b => b.disabled = true);
    showMessage('Day locked after perfect score! No more submissions allowed.');
  } else {
    submitBtn.disabled = false;
    clearBtn.disabled = false;
    backspaceBtn.disabled = false;
    expressionBox.contentEditable = true;
    diceRow.querySelectorAll('button').forEach(b => b.disabled = false);
    operatorRow.querySelectorAll('button').forEach(b => b.disabled = false);
    hideMessage();
  }
}

function showMessage(msg) {
  expressionOutputBox.textContent = msg;
}

function hideMessage() {
  updateExpressionResult();
}

function playQu0xSound() {
  try {
    const utterance = new SpeechSynthesisUtterance('Qu0x!');
    speechSynthesis.speak(utterance);
  } catch {}
}

function showQu0xPopup() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

function validateExpressionUse(expr) {
  // Check if used dice match dice and no concatenation of dice values
  // Strategy:
  // Extract all numbers used (including those inside parentheses and factorials)
  // Dice used must be exactly the dice given, each once.
  // No concatenation allowed: numbers used must be single digits 1-6 only, matching dice.
  // The expression might contain parenthesis, factorials, etc.

  // Extract all digits from expression ignoring operators and parenthesis
  // But watch out for factorials and multi-digit numbers which are invalid here.

  // Remove spaces
  expr = expr.replace(/\s+/g, '');

  // Validate allowed chars: digits, operators, parentheses, factorials only
  if (/[^0-9+\-*/().!^]/.test(expr)) return false;

  // Tokenize digits and numbers
  // Disallow multi-digit numbers (i.e. no "12", "45", etc)
  const numbers = expr.match(/\d+/g) || [];

  // If any number length > 1 => concatenation disallowed
  if (numbers.some(n => n.length > 1)) return false;

  // Check if all digits used are in dice and each only once
  const digitsUsed = numbers.map(Number);

  // Check counts
  const diceCopy = [...currentDice];
  for (const d of digitsUsed) {
    const idx = diceCopy.indexOf(d);
    if (idx === -1) return false; // digit not in dice or used more than once
    diceCopy.splice(idx, 1);
  }

  // If any dice left unused? It's allowed to not use all dice? Yes, allowed.
  return true;
}

function submitExpression() {
  if (isDayLocked(currentDayIndex)) {
    showMessage('Day locked. No more submissions.');
    return;
  }

  const expr = expressionBox.textContent.trim();
  if (!expr) {
    showMessage('Please enter an expression.');
    return;
  }

  // Validate dice usage
  if (!validateExpressionUse(expr)) {
    showMessage('Invalid expression: Dice usage incorrect or concatenation detected.');
    return;
  }

  const result = evaluateExpression(expr);
  if (result === null) {
    showMessage('Invalid expression.');
    return;
  }

  const target = generateTargetForDay(currentDayIndex);
  const score = Math.abs(target - result);

  saveBestScore(currentDayIndex, score, expr);
  updateScoreDisplays();

  if (score === 0) {
    totalQu0xCount++;
    localStorage.setItem(STORAGE_KEY_TOTAL_QU0X_COUNT, totalQu0xCount.toString());
    totalQu0xCountDisplay.textContent = `Total Qu0x Count: ${totalQu0xCount}`;
    showQu0xPopup();
    playQu0xSound();

    // Lock day
    renderForDay(currentDayIndex);
  } else {
    showMessage(`Score: ${score} (Target: ${target}, Result: ${result})`);
  }
}

function clearExpression() {
  resetExpression();
  hideMessage();
}

function backspaceExpression() {
  let expr = expressionBox.textContent;
  if (!expr) return;

  // Remove last character
  expr = expr.slice(0, -1);
  expressionBox.textContent = expr;

  // Recalculate used dice indices from expression
  usedDiceIndices.clear();
  // Re-enable all dice
  diceRow.querySelectorAll('button').forEach(b => b.disabled = false);

  // Re-mark used dice from current expression digits
  const digitsInExpr = expr.match(/\d/g) || [];
  digitsInExpr.forEach(digit => {
    const dVal = parseInt(digit, 10);
    // Find first dice with that value not used yet
    for (let i = 0; i < currentDice.length; i++) {
      if (currentDice[i] === dVal && !usedDiceIndices.has(i)) {
        usedDiceIndices.add(i);
        diceRow.querySelectorAll('button')[i].disabled = true;
        break;
      }
    }
  });

  updateExpressionResult();
}

function toggleBlitzMode() {
  blitzMode = !blitzMode;
  blitzModeBtn.textContent = blitzMode ? 'Exit Blitz Mode' : 'Enter Blitz Mode';

  if (blitzMode) {
    // In blitz mode, unlock all days
    currentDayIndex = 0;
    submitBtn.disabled = false;
    clearBtn.disabled = false;
    backspaceBtn.disabled = false;
    expressionBox.contentEditable = true;
    renderForDay(currentDayIndex);
  } else {
    // Exit blitz mode: reload current day with lock logic
    renderForDay(currentDayIndex);
  }
}

// --- Event Listeners ---

submitBtn.addEventListener('click', submitExpression);
clearBtn.addEventListener('click', clearExpression);
backspaceBtn.addEventListener('click', backspaceExpression);

prevBtn.addEventListener('click', () => {
  if (currentDayIndex > 0) {
    renderForDay(currentDayIndex - 1);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentDayIndex < totalDays - 1) {
    renderForDay(currentDayIndex + 1);
  }
});

blitzModeBtn.addEventListener('click', toggleBlitzMode);

expressionBox.addEventListener('input', () => {
  // Validate typing input: allow only digits, operators, parentheses, factorial, caret
  const allowedChars = /[0-9+\-*/().!^ ]/;
  let text = expressionBox.textContent;

  // Remove disallowed characters
  if (![...text].every(ch => allowedChars.test(ch))) {
    text = [...text].filter(ch => allowedChars.test(ch)).join('');
    expressionBox.textContent = text;
    placeCaretAtEnd(expressionBox);
  }

  // Validate dice usage on typing:
  if (!validateExpressionUse(text)) {
    showMessage('Invalid dice usage or concatenation.');
  } else {
    hideMessage();
  }

  updateExpressionResult();
});

function placeCaretAtEnd(el) {
  el.focus();
  if (typeof window.getSelection != 'undefined' && typeof document.createRange != 'undefined') {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// --- Initialization ---

function init() {
  // Show instructions
  rulesDiv.innerHTML = `
    <strong>How to play Qu0x:</strong> Use the dice values exactly once each (no concatenation like "45"). 
    Build an expression using the dice and operations by clicking buttons or typing. 
    Allowed operations: +, -, *, /, ^ (exponent), and factorial (!). 
    Fractional exponents are not allowed. Submit to see your score (difference from target). 
    Achieve a perfect score to Qu0x and lock the day! 
    Use Prev/Next to navigate days. Blitz Mode allows unlimited practice without locking.
  `;

  renderForDay(currentDayIndex);
}

init();
