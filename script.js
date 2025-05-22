// Constants
const START_DATE = new Date('2025-05-15');
const TODAY = new Date();
const TOTAL_DAYS = Math.floor((TODAY - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

let currentDayIndex = TOTAL_DAYS - 1;
let blitzMode = false;
let usedDiceIndices = new Set();
let currentDice = [];
let bestScores = JSON.parse(localStorage.getItem('bestScores')) || {};
let totalQu0xCount = parseInt(localStorage.getItem('totalQu0xCount')) || 0;

// DOM Elements
const targetNumberEl = document.getElementById('target-number');
const diceRow = document.getElementById('dice-row');
const operatorRow = document.getElementById('operator-row');
const expressionBox = document.getElementById('expression-box');
const outputBox = document.getElementById('expression-output-box');
const submitBtn = document.getElementById('submit-btn');
const clearBtn = document.getElementById('clear-btn');
const backspaceBtn = document.getElementById('backspace-btn');
const blitzBtn = document.getElementById('blitz-mode-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const dateDisplay = document.getElementById('current-date');
const bestScoreEl = document.getElementById('daily-best-score');
const masterScoreEl = document.getElementById('qu0x-master-score');
const qu0xCountEl = document.getElementById('total-qu0x-count');
const qu0xPopup = document.getElementById('qu0x-popup');

function getSeededRandom(dayIndex) {
  const seed = 123456 + dayIndex;
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function getDiceForDay(dayIndex) {
  const rand = getSeededRandom(dayIndex);
  return Array.from({ length: 5 }, () => 1 + Math.floor(rand() * 6));
}

function getTargetForDay(dayIndex) {
  const rand = getSeededRandom(dayIndex);
  for (let i = 0; i < 5; i++) rand(); // advance past dice
  return 1 + Math.floor(rand() * 100);
}

function renderDice() {
  diceRow.innerHTML = '';
  usedDiceIndices.clear();
  currentDice.forEach((num, index) => {
    const btn = document.createElement('div');
    btn.textContent = num;
    btn.className = 'die';
    btn.onclick = () => {
      if (!usedDiceIndices.has(index)) {
        expressionBox.textContent += num;
        usedDiceIndices.add(index);
      }
    };
    diceRow.appendChild(btn);
  });
}

function renderOperators() {
  const operators = ['+', '-', '*', '/', '^', '(', ')', '!'];
  operatorRow.innerHTML = '';
  operators.forEach(op => {
    const btn = document.createElement('button');
    btn.textContent = op;
    btn.className = 'btn';
    btn.onclick = () => {
      expressionBox.textContent += op;
    };
    operatorRow.appendChild(btn);
  });
}

function evaluateExpression(expr) {
  try {
    if ((expr.match(/!/g) || []).some(f => expr.includes('!!'))) return null;
    const factorialSafe = expr.replace(/(\d+|\))!/g, 'fact($1)');
    if (factorialSafe.includes('^') && /\d+\.\d+/.test(factorialSafe)) return null;
    const fact = n => {
      if (typeof n === 'number') n = Math.floor(n);
      if (n < 0 || n > 100) return NaN;
      return n <= 1 ? 1 : n * fact(n - 1);
    };
    const fn = new Function('fact', 'return ' + factorialSafe);
    return fn(fact);
  } catch {
    return null;
  }
}

function checkAllDiceUsed(expr) {
  const numbersUsed = expr.match(/\d+/g) || [];
  const used = numbersUsed.map(Number).sort((a, b) => a - b);
  const required = [...currentDice].sort((a, b) => a - b);
  return JSON.stringify(used) === JSON.stringify(required);
}

function updateScoreboard() {
  const scores = Object.values(bestScores);
  const master = scores.length === TOTAL_DAYS ? scores.reduce((a, b) => a + b, 0) : '---';
  masterScoreEl.textContent = `Qu0x-Master Score: ${master}`;
  qu0xCountEl.textContent = `Total Qu0x Count: ${totalQu0xCount}`;
}

function showPopup() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => qu0xPopup.style.display = 'none', 3000);
}

function handleSubmit() {
  const expr = expressionBox.textContent;
  if (!checkAllDiceUsed(expr)) return alert("Use each die exactly once.");
  const result = evaluateExpression(expr);
  if (result === null || isNaN(result)) return alert("Invalid expression.");

  const target = getTargetForDay(currentDayIndex);
  const score = Math.abs(target - result);
  outputBox.textContent = `= ${result}`;

  if (!blitzMode) {
    const key = `day${currentDayIndex}`;
    if (!(key in bestScores) || score < bestScores[key]) {
      bestScores[key] = score;
      localStorage.setItem('bestScores', JSON.stringify(bestScores));
    }
    if (score === 0 && !(key in bestScores && bestScores[key] === 0)) {
      totalQu0xCount++;
      localStorage.setItem('totalQu0xCount', totalQu0xCount);
      showPopup();
    }
  } else {
    outputBox.textContent += ' (Blitz Mode)';
  }

  if (!blitzMode) bestScoreEl.textContent = `Best Score Today: ${bestScores[`day${currentDayIndex}`]}`;
  updateScoreboard();
}

function loadGameDay(dayIndex) {
  currentDayIndex = dayIndex;
  currentDice = getDiceForDay(currentDayIndex);
  targetNumberEl.textContent = getTargetForDay(currentDayIndex);
  renderDice();
  renderOperators();
  expressionBox.textContent = '';
  outputBox.textContent = '';
  usedDiceIndices.clear();
  const date = new Date(START_DATE.getTime() + dayIndex * 86400000);
  dateDisplay.textContent = date.toDateString();
  bestScoreEl.textContent = bestScores[`day${dayIndex}`] !== undefined ? `Best Score Today: ${bestScores[`day${dayIndex}`]}` : '';
}

submitBtn.onclick = handleSubmit;
clearBtn.onclick = () => expressionBox.textContent = '';
backspaceBtn.onclick = () => expressionBox.textContent = expressionBox.textContent.slice(0, -1);
blitzBtn.onclick = () => {
  blitzMode = !blitzMode;
  blitzBtn.textContent = blitzMode ? 'Return to Daily Mode' : 'Enter Blitz Mode';
  if (!blitzMode) loadGameDay(currentDayIndex);
  else {
    targetNumberEl.textContent = Math.floor(Math.random() * 100 + 1);
    currentDice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6 + 1));
    renderDice();
    renderOperators();
    expressionBox.textContent = '';
    outputBox.textContent = '';
    usedDiceIndices.clear();
    dateDisplay.textContent = 'Blitz Mode';
    bestScoreEl.textContent = '';
  }
};
prevBtn.onclick = () => {
  if (currentDayIndex > 0) loadGameDay(currentDayIndex - 1);
};
nextBtn.onclick = () => {
  if (currentDayIndex < TOTAL_DAYS - 1) loadGameDay(currentDayIndex + 1);
};

loadGameDay(currentDayIndex);
updateScoreboard();
