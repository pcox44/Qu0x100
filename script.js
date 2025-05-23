// === Qu0x Daily Dice Game Script ===

// Date range for puzzles: 2025-05-15 to today (local)
const PUZZLE_START = new Date(2025, 4, 15); // May is month 4 in JS Date (0-indexed)
const today = new Date();
const PUZZLE_END = new Date(today.getFullYear(), today.getMonth(), today.getDate());

// Number of days/puzzles available
const MS_PER_DAY = 86400000;
const totalDays = Math.floor((PUZZLE_END - PUZZLE_START) / MS_PER_DAY) + 1;

// Store game state
let currentDayIndex = totalDays - 1; // default to today puzzle
let diceValues = [];
let targetNumber = 0;
let expression = "";
let usedDiceIndices = new Set();
let dailyBestScores = {};  // key: dayIndex, value: best score (0 means Qu0x)
let dailyQu0x = {};       // key: dayIndex, value: boolean (true if Qu0x achieved)

const diceColors = {
  1: {bg: 'red', fg: 'white'},
  2: {bg: 'white', fg: 'black'},
  3: {bg: 'blue', fg: 'white'},
  4: {bg: 'yellow', fg: 'black'},
  5: {bg: 'green', fg: 'white'},
  6: {bg: 'black', fg: 'yellow'},
};

const diceContainer = document.getElementById('dice-container');
const operatorRow = document.getElementById('operator-row');
const expressionBox = document.getElementById('expression-box');
const outputBox = document.getElementById('output-box');
const submitBtn = document.getElementById('submit-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const dateDisplay = document.getElementById('date-display');
const daySelect = document.getElementById('day-select');
const targetBox = document.getElementById('target-box');
const qu0xFraction = document.getElementById('qu0x-fraction');
const qu0xMaster = document.getElementById('qu0x-master');
const dailyBestScoreDiv = document.getElementById('daily-best-score');
const qu0xPopup = document.getElementById('qu0x-popup');
const topControls = document.getElementById('top-controls');
const navControls = document.getElementById('nav-controls');

let fadeDuration = 400; // ms

// Storage keys
const STORAGE_KEY = 'qu0x_daily_scores';

function seedRandom(seed) {
  // Simple deterministic PRNG based on seed
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate puzzle dice and target for a given day index (0-based)
function generatePuzzle(dayIndex) {
  // Use dayIndex + start date as seed to get consistent daily puzzle
  const seed = PUZZLE_START.getTime() / MS_PER_DAY + dayIndex;

  // Generate 5 dice: random ints 1-6
  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(seedRandom(seed + i) * 6));
  }

  // Generate target between 1 and 100, biased a bit by seed
  let target = 1 + Math.floor(seedRandom(seed + 10) * 100);

  return {dice, target};
}

// Initialize day selector dropdown
function initDaySelector() {
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(PUZZLE_START.getTime() + i * MS_PER_DAY);
    const option = document.createElement('option');
    option.value = i;
    option.textContent = date.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
    daySelect.appendChild(option);
  }
  daySelect.value = currentDayIndex;
}

// Format date for display
function formatDate(date) {
  return date.toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'});
}

// Save scores to localStorage
function saveScores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({dailyBestScores, dailyQu0x}));
}

// Load scores from localStorage
function loadScores() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.dailyBestScores) dailyBestScores = parsed.dailyBestScores;
      if (parsed.dailyQu0x) dailyQu0x = parsed.dailyQu0x;
    } catch {}
  }
}

// Update Qu0x completion fraction and Master Score
function updateQu0xStats() {
  let qu0xCount = 0;
  let solvedCount = 0;
  let totalScoreSum = 0;
  let totalSolved = 0;

  for (let i = 0; i < totalDays; i++) {
    if (dailyQu0x[i]) {
      qu0xCount++;
      solvedCount++;
      totalSolved++;
    } else if (dailyBestScores[i] !== undefined) {
      solvedCount++;
      totalSolved++;
      totalScoreSum += dailyBestScores[i];
    }
  }

  qu0xFraction.textContent = `${qu0xCount}/${totalDays}`;

  if (totalSolved === totalDays) {
    qu0xMaster.textContent = `Qu0x Master Score: ${totalScoreSum}`;
  } else {
    qu0xMaster.textContent = `Qu0x Master Score: N/A`;
  }
}

// Build dice elements
function buildDice() {
  diceContainer.innerHTML = '';
  usedDiceIndices.clear();

  diceValues.forEach((val, i) => {
    const die = document.createElement('div');
    die.classList.add('die');
    die.textContent = val;
    die.dataset.index = i;
    die.dataset.value = val;

    const c = diceColors[val];
    die.style.backgroundColor = c.bg;
    die.style.color = c.fg;
    die.style.borderColor = 'black';

    die.addEventListener('click', () => {
      if (dailyQu0x[currentDayIndex]) return; // locked after Qu0x
      if (usedDiceIndices.has(i)) return; // can't reuse dice
      addToExpression(val, i);
    });

    diceContainer.appendChild(die);
  });
}

// Build operator buttons with handlers
function buildOperators() {
  const ops = ['(', ')', '+', '-', '*', '/', '^'];
  operatorRow.innerHTML = '';
  ops.forEach(op => {
    const btn = document.createElement('button');
    btn.classList.add('operator-btn');
    btn.textContent = op;
    btn.addEventListener('click', () => {
      if (dailyQu0x[currentDayIndex]) return; // locked after Qu0x
      addToExpression(op, null);
    });
    operatorRow.appendChild(btn);
  });
}

// Add character or dice to expression
function addToExpression(charOrNum, diceIndex) {
  expression += charOrNum.toString();
  expressionBox.textContent = expression;

  if (diceIndex !== null) {
    usedDiceIndices.add(diceIndex);
    fadeDice(diceIndex);
  }
}

// Fade a die after use
function fadeDice(index) {
  const die = diceContainer.querySelector(`.die[data-index="${index}"]`);
  if (die) die.classList.add('faded');
}

// Undo fade dice (reset all)
function resetDiceFade() {
  diceContainer.querySelectorAll('.die.faded').forEach(die => die.classList.remove('faded'));
  usedDiceIndices.clear();
}

// Clear expression and reset dice fade
function clearExpression() {
  expression = "";
  expressionBox.textContent = "";
  outputBox.textContent = "?";
  resetDiceFade();
}

// Evaluate expression safely with factorial support
function evaluateExpression(expr) {
  try {
    // Replace factorial: find patterns like (expr)! or number!
    const factorialPattern = /(\d+|\([^\)]+\))!/g;

    function factorial(n) {
      n = Number(n);
      if (!Number.isInteger(n) || n < 0) throw "Factorial only for whole non-negative integers";
      if (n > 170) throw "Factorial too large";
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }

    let replaced = expr.replace(factorialPattern, (match, p1) => {
      // Evaluate the inner expression if parentheses
      let val;
      if (p1.startsWith('(')) {
        val = evaluateExpression(p1.slice(1, -1));
      } else {
        val = Number(p1);
      }
      let factVal = factorial(val);
      return factVal.toString();
    });

    // Now evaluate replaced expression safely using Function constructor
    // Only allow numbers, parentheses, and operators + - * / ^
    if (/[^0-9+\-*/^(). ]/.test(replaced)) throw "Invalid characters";

    // Replace ^ with ** for exponentiation in JS
    let jsExpr = replaced.replace(/\^/g, '**');

    // Evaluate expression
    // eslint-disable-next-line no-new-func
    let result = new Function(`return (${jsExpr});`)();
    if (typeof result !== 'number' || !isFinite(result)) throw "Invalid result";

    return result;
  } catch (e) {
    return null;
  }
}

// Calculate score = abs(target - result)
function calculateScore(result) {
  if (result === null) return null;
  return Math.abs(targetNumber - result);
}

// On Submit click
function onSubmit() {
  if (!expression) return;
  const result = evaluateExpression(expression);
  if (result === null) {
    outputBox.textContent = "ERR";
    return;
  }

  // Round result to 5 decimals for display and scoring
  const rounded = Math.round(result * 1e5) / 1e5;
  outputBox.textContent = rounded;

  const score = calculateScore(rounded);
  if (score === null) return;

  updateBestScore(score);

  // Show message below expression
  dailyBestScoreDiv.textContent = `Your score: ${score}`;

  if (score === 0) {
    // Qu0x achieved
    dailyQu0x[currentDayIndex] = true;
    dailyBestScores[currentDayIndex] = 0;
    saveScores();
    updateQu0xStats();
    showQu0xPopup();
    lockCurrentDay();
    submitBtn.disabled = true;
  }
}

// Update best score for current day
function updateBestScore(score) {
  if (dailyBestScores[currentDayIndex] === undefined || score < dailyBestScores[currentDayIndex]) {
    dailyBestScores[currentDayIndex] = score;
    saveScores();
    updateQu0xStats();
  }
}

// Show big Qu0x popup for 3 seconds
function showQu0xPopup() {
  qu0xPopup.innerHTML = `<span class="party-hat">🎉</span> Qu0x! <span class="party-hat">🎉</span>`;
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

// Lock day if Qu0x achieved: disable inputs and submit
function lockCurrentDay() {
  if (dailyQu0x[currentDayIndex]) {
    // Disable dice and operators
    diceContainer.querySelectorAll('.die').forEach(die => die.style.pointerEvents = 'none');
    operatorRow.querySelectorAll('button').forEach(btn => btn.disabled = true);
    submitBtn.disabled = true;
  } else {
    diceContainer.querySelectorAll('.die').forEach(die => die.style.pointerEvents = '');
    operatorRow.querySelectorAll('button').forEach(btn => btn.disabled = false);
    submitBtn.disabled = false;
  }
}

// Update UI for current day puzzle
function updateUI() {
  clearExpression();
  const date = new Date(PUZZLE_START.getTime() + currentDayIndex * MS_PER_DAY);
  dateDisplay.textContent = formatDate(date);
  daySelect.value = currentDayIndex;

  const puzzle = generatePuzzle(currentDayIndex);
  diceValues = puzzle.dice;
  targetNumber = puzzle.target;
  targetBox.textContent = `Target: ${targetNumber}`;

  buildDice();
  buildOperators();
  lockCurrentDay();

  // Show daily best score if any
  if (dailyBestScores[currentDayIndex] !== undefined) {
    dailyBestScoreDiv.textContent = `Your best score: ${dailyBestScores[currentDayIndex]}`;
  } else {
    dailyBestScoreDiv.textContent = "";
  }

  // Clear output
  outputBox.textContent = "?";
}

// Handle day navigation buttons
function onPrev() {
  if (currentDayIndex > 0) {
    currentDayIndex--;
    updateUI();
  }
}

function onNext() {
  if (currentDayIndex < totalDays - 1) {
    currentDayIndex++;
    updateUI();
  }
}

// Handle day select dropdown change
function onDaySelect() {
  const val = Number(daySelect.value);
  if (!isNaN(val)) {
    currentDayIndex = val;
    updateUI();
  }
}

// Initialize everything
function init() {
  loadScores();
  initDaySelector();
  updateQu0xStats();
  updateUI();

  submitBtn.addEventListener('click', onSubmit);
  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  daySelect.addEventListener('change', onDaySelect);
  clearBtn.addEventListener('click', clearExpression);
}

init();
