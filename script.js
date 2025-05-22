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
  // Prevent dice concatenation:
  // Only allow dice digits separated by operators or parentheses or factorial
  // We only add dice by clicking dice buttons that get disabled after use, so concatenation is prevented naturally.
  // Just append the char.
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
  // Validate expression:
  // Disallow fractional exponents:
  if (/\^\s*[\d]*\.\d+/.test(expr)) {
    return null;
  }

  // Replace factorial expressions with calls to factorial function
  // Implement factorial for expressions like (2+1)!:
  const replacedExpr = expr.replace(/(\([^()]+\)|\d+)!/g, match => {
    const inner = match.slice(0, -1);
    const val = evaluateExpression(inner);
    if (val === null || val < 0 || !Number.isInteger(val)) throw new Error('Invalid factorial');
    return factorial(val).toString();
  });

  // Replace ^ with ** for JS evaluation
  const jsExpr = replacedExpr.replace(/\^/g, '**');

  // Evaluate safely:
  // Disallow letters or suspicious characters
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
  // Sum of all best scores, only if every day has a submission (not null)
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

function loadDay(dayIndex) {
  currentDayIndex = dayIndex;
  const target = generateTargetForDay(dayIndex);
  targetNumberSpan.textContent = target;

  // Generate dice for the day:
  currentDice = generateDiceForDay(dayIndex);
  usedDiceIndices.clear();

  resetExpression();
  updateScoreDisplays();

  updateNavigationButtons();

  // Update rules visibility or mode buttons text
  if (blitzMode) {
    blitzModeBtn.textContent = 'Daily Mode';
    if (!document.getElementById('daily-mode-btn')) {
      const dailyBtn = document.createElement('button');
      dailyBtn.id = 'daily-mode-btn';
      dailyBtn.className = 'btn';
      dailyBtn.textContent = 'Daily Mode';
      dailyBtn.onclick = () => {
        blitzMode = false;
        modeButtonsDiv.removeChild(dailyBtn);
        blitzModeBtn.textContent = 'Blitz Mode';
        loadDay(currentDayIndex);
      };
      modeButtonsDiv.appendChild(dailyBtn);
    }
    blitzModeBtn.style.display = 'none';
  } else {
    blitzModeBtn.textContent = 'Blitz Mode';
    blitzModeBtn.style.display = 'inline-block';
    const dailyBtn = document.getElementById('daily-mode-btn');
    if (dailyBtn) dailyBtn.remove();
  }

  // Show best score if any
  updateScoreDisplays();
}

function generateDiceForDay(dayIndex) {
  // Pseudo random but fixed dice values per day (6 dice)
  const dice = [];
  let seed = dayIndex + 78910;
  for (let i = 0; i < 6; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    let val = (seed % 6) + 1;
    dice.push(val);
  }
  return dice;
}

function updateNavigationButtons() {
  prevBtn.disabled = currentDayIndex === 0;
  nextBtn.disabled = currentDayIndex === totalDays - 1;
}

function validateExpression(expr) {
  if (expr.length === 0) return false;
  // Check if all dice used exactly once
  if (usedDiceIndices.size !== currentDice.length) return false;

  // Disallow concatenation: already enforced by disabling dice buttons once clicked.

  // Disallow fractional exponents (done in evaluateExpression)
  if (/\^\s*[\d]*\.\d+/.test(expr)) return false;

  // Additional syntax checks can be here, but rely on evaluateExpression.

  return true;
}

function showQu0xPopup() {
  qu0xPopup.style.display = 'block';
  // Restart animation
  qu0xPopup.style.animation = 'none';
  void qu0xPopup.offsetWidth; // trigger reflow
  qu0xPopup
