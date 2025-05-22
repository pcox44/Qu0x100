const allowedOperators = ['+', '-', '*', '/', '^', '!', '(', ')'];
let currentExpression = '';
let diceUsed = [];
let currentDate = new Date();
let blitzMode = false;
const startDate = new Date('2025-05-15');
const today = new Date();
today.setHours(0, 0, 0, 0);
let currentGameIndex = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
const maxGameIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDailyDice(date) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const dice = [];
  for (let i = 0; i < 5; i++) {
    const rand = getSeededRandom(seed + i);
    dice.push(Math.floor(rand * 6) + 1);
  }
  return dice;
}

function getDailyTarget(date) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return Math.floor(getSeededRandom(seed + 100) * 100) + 1;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateDateDisplay() {
  const gameDate = new Date(startDate);
  gameDate.setDate(startDate.getDate() + currentGameIndex);
  document.getElementById('game-title').textContent = blitzMode ? 'Blitz Mode' : `Game #${currentGameIndex + 1}`;
  document.getElementById('target-number').textContent = getDailyTarget(gameDate);
  document.getElementById('score-box').textContent = '';
  document.getElementById('expression-output-box').textContent = '';
  renderDice();
  currentExpression = '';
  updateExpressionDisplay();
}

function renderDice() {
  const diceRow = document.getElementById('dice-row');
  diceRow.innerHTML = '';
  const gameDate = new Date(startDate);
  gameDate.setDate(startDate.getDate() + currentGameIndex);
  const dice = blitzMode ? Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1) : getDailyDice(gameDate);
  dice.forEach(value => {
    const die = document.createElement('div');
    die.className = 'die';
    die.dataset.value = value;
    die.textContent = value;
    die.onclick = () => {
      currentExpression += value;
      updateExpressionDisplay();
    };
    diceRow.appendChild(die);
  });
}

function updateExpressionDisplay() {
  document.getElementById('expression-box').textContent = currentExpression;
  try {
    const value = evaluateExpression(currentExpression);
    if (!isNaN(value)) {
      document.getElementById('expression-output-box').textContent = value;
    }
  } catch {
    document.getElementById('expression-output-box').textContent = '';
  }
}

function evaluateExpression(expr) {
  if (expr.includes('.')) throw new Error("Fractional values not allowed");
  expr = expr.replace(/(\d+)!/g, (_, num) => factorial(parseInt(num)));
  const val = Function('"use strict"; return (' + expr + ')')();
  if (!Number.isFinite(val)) throw new Error("Invalid expression");
  return val;
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error("Invalid factorial");
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function submitExpression() {
  try {
    const gameDate = new Date(startDate);
    gameDate.setDate(startDate.getDate() + currentGameIndex);
    const target = getDailyTarget(gameDate);
    const value = evaluateExpression(currentExpression);
    const dice = blitzMode ? [] : getDailyDice(gameDate);
    const used = currentExpression.match(/\d+/g)?.map(Number) || [];

    if (!blitzMode && (used.length !== 5 || used.sort().join() !== dice.sort().join())) {
      alert('Use all 5 dice values exactly once!');
      return;
    }

    const score = Math.abs(value - target);
    document.getElementById('score-box').textContent = `Score: ${score}`;

    if (!blitzMode) {
      const gameKey = `game-${currentGameIndex}`;
      const prev = localStorage.getItem(gameKey);
      if (prev === null || score < parseInt(prev)) {
        localStorage.setItem(gameKey, score);
      }
      updateMasterScores();
      if (score === 0) {
        document.getElementById('qu0x-popup').style.display = 'block';
        setTimeout(() => {
          document.getElementById('qu0x-popup').style.display = 'none';
        }, 3000);
      }
    }

  } catch (err) {
    alert('Invalid expression');
  }
}

function updateMasterScores() {
  let count = 0;
  let total = 0;
  for (let i = 0; i <= maxGameIndex; i++) {
    const val = localStorage.getItem(`game-${i}`);
    if (val !== null) {
      total += parseInt(val);
      if (parseInt(val) === 0) count++;
    }
  }
  document.getElementById('qu0x-count').textContent = count;
  document.getElementById('master-score').textContent = total;
}

document.getElementById('submit-btn').onclick = submitExpression;
document.getElementById('blitz-btn').onclick = () => {
  blitzMode = true;
  document.getElementById('score-box').textContent = '';
  updateDateDisplay();
};
document.getElementById('prev-btn').onclick = () => {
  if (!blitzMode && currentGameIndex > 0) {
    currentGameIndex--;
    updateDateDisplay();
  }
};
document.getElementById('next-btn').onclick = () => {
  if (!blitzMode && currentGameIndex < maxGameIndex) {
    currentGameIndex++;
    updateDateDisplay();
  }
};
document.getElementById('select-btn').onclick = () => {
  const choice = prompt(`Select game number (1 to ${maxGameIndex + 1}):`);
  const num = parseInt(choice);
  if (!isNaN(num) && num >= 1 && num <= maxGameIndex + 1) {
    blitzMode = false;
    currentGameIndex = num - 1;
    updateDateDisplay();
  }
};

document.querySelectorAll('.btn[data-value]').forEach(btn => {
  btn.onclick = () => {
    currentExpression += btn.dataset.value;
    updateExpressionDisplay();
  };
});

document.getElementById('clear-btn').onclick = () => {
  currentExpression = '';
  updateExpressionDisplay();
};

document.getElementById('backspace-btn').onclick = () => {
  currentExpression = currentExpression.slice(0, -1);
  updateExpressionDisplay();
};

updateDateDisplay();
updateMasterScores();
