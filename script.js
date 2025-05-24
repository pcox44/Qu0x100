// Utility to generate weeks from 5/11/2025 weekly on Sundays
function generateWeeks() {
  const weeks = [];
  const startDate = new Date(2025, 4, 11); // May is 4 in JS Date (0-indexed)
  const now = new Date();
  // Get last Sunday before today or today if Sunday
  let current = new Date(now);
  current.setHours(0,0,0,0);
  while (current.getDay() !== 0) {
    current.setDate(current.getDate() - 1);
  }
  // Generate weeks from startDate to current Sunday
  for (let d = new Date(startDate); d <= current; d.setDate(d.getDate() + 7)) {
    weeks.push(new Date(d));
  }
  return weeks;
}

const weeks = generateWeeks();
const weekSelect = document.getElementById('weekSelect');
const diceContainer = document.getElementById('diceContainer');
const expressionBox = document.getElementById('expressionBox');
const evaluationBox = document.getElementById('evaluationBox');
const equalsSign = document.getElementById('equalsSign');
const submitBtn = document.getElementById('submitBtn');
const scoreboard = document.getElementById('scoreboard');
const counter = document.getElementById('counter');
const qu0xAnimation = document.getElementById('qu0xAnimation');
const gameNumberDisplay = document.getElementById('gameNumber');

let currentWeekIndex = 0;
let diceValues = [];
let diceUsed = [false, false, false, false, false];
let expression = '';
let completedNumbers = {}; // Store numbers completed per week, keyed by week string
let currentCompletedSet = new Set();

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function saveProgress() {
  localStorage.setItem('qu0x100Progress', JSON.stringify(completedNumbers));
}

function loadProgress() {
  const data = localStorage.getItem('qu0x100Progress');
  if (data) {
    completedNumbers = JSON.parse(data);
  }
}

function setGameNumber(index) {
  gameNumberDisplay.textContent = `Game #${index + 1}`;
}

function seedDice(weekDate) {
  // Use the weekDate string (YYYY-MM-DD) as seed source for dice
  // Simple deterministic pseudo-random: sum char codes mod 6 + 1 for each die
  const seedStr = formatDate(weekDate);
  const chars = [...seedStr];
  const vals = [];
  for (let i = 0; i < 5; i++) {
    const charCodeSum = chars.reduce((a,c) => a + c.charCodeAt(0) + i*7, 0);
    // Simple: modulo 6 + 1
    vals.push((charCodeSum % 6) + 1);
  }
  return vals;
}

function renderDice() {
  diceContainer.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const die = document.createElement('div');
    die.classList.add('die', `die${diceValues[i]}`);
    die.textContent = diceValues[i];
    die.dataset.index = i;
    if (diceUsed[i]) {
      die.classList.add('faded');
    }
    die.addEventListener('click', () => {
      if (diceUsed[i]) return;
      expression += diceValues[i];
      diceUsed[i] = true;
      updateExpression();
    });
    diceContainer.appendChild(die);
  }
}

function updateExpression() {
  expressionBox.textContent = expression;
  try {
    const val = evaluateExpression(expression);
    evaluationBox.textContent = val === null ? '?' : val;
  } catch {
    evaluationBox.textContent = '?';
  }
}

function clearExpression() {
  expression = '';
  diceUsed = [false, false, false, false, false];
  updateExpression();
  renderDice();
}

function backspace() {
  if (expression.length === 0) return;
  // Remove last char
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // If lastChar is a digit and dice was used, restore that die
  // But must only restore if that number matches one of the dice that are currently used
  // We'll try to find a used die with that number to restore
  for (let i = diceUsed.length -1; i >= 0; i--) {
    if (diceUsed[i] && diceValues[i].toString() === lastChar) {
      diceUsed[i] = false;
      break;
    }
  }

  updateExpression();
  renderDice();
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return null;
  if (n === 0) return 1;
  let res = 1;
  for (let i = 1; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Evaluate expression string with factorial and exponent support
function evaluateExpression(expr) {
  if (!expr) return null;

  // Replace factorial expressions with function calls
  // Support only single factorial: number or parenthesis expression followed by !
  // Replace n! with factorial(n) in the code string
  // Use regex to find all occurrences of (expression)!
  // We need to parse carefully; use a loop to replace from right to left

  // A simple approach: repeatedly find the last factorial and replace it
  let exprCopy = expr;

  const factorialRegex = /(\d+|\([^()]+\))!/;

  while (factorialRegex.test(exprCopy)) {
    exprCopy = exprCopy.replace(factorialRegex, (match, group1) => {
      let val = null;
      if (group1.startsWith('(')) {
        val = evaluateExpression(group1.slice(1, -1));
      } else {
        val = Number(group1);
      }
      if (val === null || val === undefined) return 'null';
      const f = factorial(val);
      if (f === null) return 'null';
      return f.toString();
    });
  }

  // Replace ^ with ** for JS eval
  exprCopy = exprCopy.replace(/\^/g, '**');

  // Only allow safe characters: digits, operators, parentheses
  if (/[^0-9+\-*/().^ ]/.test(exprCopy)) {
    return null;
  }

  try {
    // Evaluate with eval safely by restricting input
    // eslint-disable-next-line no-eval
    const result = eval(exprCopy);
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100000) / 100000; // Round to 5 decimals
    }
    return null;
  } catch {
    return null;
  }
}

function isValidExpression(expr) {
  // Check if parentheses match and expression is not empty
  if (!expr) return false;

  let parenCount = 0;
  for (let ch of expr) {
    if (ch === '(') parenCount++;
    if (ch === ')') parenCount--;
    if (parenCount < 0) return false;
  }
  if (parenCount !== 0) return false;

  // Check dice usage count
  const diceCountMap = {};
  for (let d of diceValues) diceCountMap[d] = (diceCountMap[d] || 0) + 1;

  // Count digits in expr (only digits 1-6 allowed)
  // We will ignore digits part of multi-digit numbers for now because dice are 1-6 only
  // The expression might have numbers > 9 if user typed manually, but we only allow dice once each.
  // So we must check digits individually and dice count
  // So best is to split into tokens carefully
  // Because expressionBox built by clicking, no manual input, digits appear individually.

  // Count how many dice digits used
  const usedDigits = expr.match(/\d/g) || [];

  // Count each digit usage
  const usageMap = {};
  for (const d of usedDigits) {
    usageMap[d] = (usageMap[d] || 0) + 1;
  }

  // Check usage vs diceCountMap
  for (const d in usageMap) {
    if (usageMap[d] > (diceCountMap[d] || 0)) return false;
  }

  // Check that all dice are used exactly once (strict)
  // Since we require all 5 dice used per rules
  const totalUsed = usedDigits.length;
  if (totalUsed !== 5) return false;

  // If all checks passed
  return true;
}

function updateScoreboard() {
  scoreboard.innerHTML = '';
  const completedArr = Array.from(currentCompletedSet).sort((a,b) => a - b);
  if (completedArr.length === 0) {
    scoreboard.textContent = 'No numbers completed yet.';
    return;
  }
  const p = document.createElement('p');
  p.textContent = `Completed numbers this week: ${completedArr.join(', ')}`;
  scoreboard.appendChild(p);
}

function updateCounter() {
  counter.textContent = `Completed: ${currentCompletedSet.size} / 100`;
}

function showQu0xAnimation() {
  qu0xAnimation.classList.remove('hidden');
  setTimeout(() => {
    qu0xAnimation.classList.add('hidden');
  }, 3000);
}

function onSubmit() {
  if (!isValidExpression(expression)) {
    alert('Invalid Submission: Expression is invalid or does not use all dice exactly once.');
    return;
  }
  const val = evaluateExpression(expression);
  if (val === null) {
    alert('Invalid Submission: Could not evaluate expression.');
    return;
  }
  const roundedVal = Math.round(val);
  if (roundedVal < 1 || roundedVal > 100) {
    alert('Result out of range (1 to 100).');
    return;
  }
  if (currentCompletedSet.has(roundedVal)) {
    alert(`Number ${roundedVal} already completed this week.`);
    return;
  }

  currentCompletedSet.add(roundedVal);
  completedNumbers[getWeekKey()] = Array.from(currentCompletedSet);
  saveProgress();
  updateScoreboard();
  updateCounter();
  clearExpression();

  if (currentCompletedSet.size === 100) {
    showQu0xAnimation();
    alert('Congratulations! You have completed all 100 numbers for this week: Qu0x 100!');
  }
}

function getWeekKey() {
  return formatDate(weeks[currentWeekIndex]);
}

function loadWeek(index) {
  currentWeekIndex = index;
  setGameNumber(index);
  diceValues = seedDice(weeks[index]);
  clearExpression();
  renderDice();
  currentCompletedSet = new Set(completedNumbers[getWeekKey()] || []);
  updateScoreboard();
  updateCounter();
}

function setupWeekSelector() {
  weeks.forEach((weekDate, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${formatDate(weekDate)}`;
    weekSelect.appendChild(option);
  });
  weekSelect.value = weeks.length - 1;
  loadWeek(weeks.length - 1);

  weekSelect.addEventListener('change', e => {
    const val = Number(e.target.value);
    loadWeek(val);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  setupWeekSelector();

  document.getElementById('backspaceBtn').addEventListener('click', () => {
    backspace();
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    clearExpression();
  });

  document.querySelectorAll('#buttonGrid .op-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      expression += btn.dataset.value;
      updateExpression();
    });
  });

  submitBtn.addEventListener('click', () => {
    onSubmit();
  });
});
