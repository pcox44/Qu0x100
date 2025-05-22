const startDate = new Date("2025-05-15");
const today = new Date();
today.setHours(0, 0, 0, 0);
const totalGames = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

let currentGame = totalGames;
let gameMode = 'daily'; // or 'blitz'
let usedDice = [];
let expression = '';
let target = 0;
let dice = [];
let bestScores = JSON.parse(localStorage.getItem('bestScores') || '{}');
let qu0xCount = parseInt(localStorage.getItem('qu0xCount') || 0);

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDiceForGame(n) {
  let seed = n + 12345;
  return Array.from({ length: 5 }, (_, i) => 1 + Math.floor(getSeededRandom(seed + i) * 6));
}

function getTargetForGame(n) {
  let seed = n * 23 + 999;
  return 10 + Math.floor(getSeededRandom(seed) * 90);
}

function updateGame(n) {
  currentGame = n;
  gameMode = 'daily';
  expression = '';
  dice = getDiceForGame(n);
  target = getTargetForGame(n);
  usedDice = [];
  document.getElementById('target-number').textContent = target;
  document.getElementById('expression-box').textContent = '';
  document.getElementById('expression-output-box').textContent = '';
  renderDice();
  renderGameHeader();
  renderScore();
  renderGameSelector();
}

function renderGameHeader() {
  const date = new Date(startDate);
  date.setDate(date.getDate() + currentGame - 1);
  const dateStr = date.toISOString().split('T')[0];
  document.getElementById('game-number').textContent = currentGame;
  document.getElementById('game-date').textContent = dateStr;
}

function renderGameSelector() {
  const sel = document.getElementById('game-selector');
  sel.innerHTML = '';
  for (let i = 1; i <= totalGames; i++) {
    const option = document.createElement('option');
    const d = new Date(startDate);
    d.setDate(d.getDate() + i - 1);
    const dateStr = d.toISOString().split('T')[0];
    const score = bestScores[i];
    option.value = i;
    option.textContent = `#${i} - ${dateStr}${score === 0 ? ' ✅' : score ? '' : ' 🔒'}`;
    if (i === currentGame) option.selected = true;
    sel.appendChild(option);
  }
}

function renderDice() {
  const diceRow = document.getElementById('dice-row');
  diceRow.innerHTML = '';
  dice.forEach((val, i) => {
    const btn = document.createElement('div');
    btn.className = 'die';
    btn.dataset.value = val;
    btn.textContent = val;
    btn.onclick = () => {
      if (!usedDice.includes(i)) {
        usedDice.push(i);
        expression += val;
        updateExpression();
      }
    };
    diceRow.appendChild(btn);
  });
}

function updateExpression() {
  document.getElementById('expression-box').textContent = expression;
  try {
    const evaluated = evaluateExpression(expression);
    if (!isNaN(evaluated)) {
      document.getElementById('expression-output-box').textContent = evaluated;
    } else {
      document.getElementById('expression-output-box').textContent = '';
    }
  } catch {
    document.getElementById('expression-output-box').textContent = '';
  }
}

function evaluateExpression(expr) {
  const factorial = n => {
    if (n < 0 || n % 1 !== 0) throw new Error();
    return n === 0 ? 1 : n * factorial(n - 1);
  };
  return Function('"use strict"; return (' + expr.replace(/(\d+)!/g, 'factorial($1)').replace(/\^/g, '**') + ')')();
}

function submitExpression() {
  const usedVals = expression.match(/\d+/g) || [];
  const usedSet = new Set(usedVals.map(Number));
  const diceSet = new Set(dice);
  const sortedDice = [...dice].sort().join(',');
  const sortedUsed = usedVals.map(Number).sort().join(',');
  if (sortedDice !== sortedUsed) {
    alert('You must use each die exactly once.');
    return;
  }

  let result;
  try {
    result = evaluateExpression(expression);
  } catch {
    alert('Invalid expression');
    return;
  }

  if (typeof result !== 'number' || isNaN(result)) {
    alert('Invalid expression');
    return;
  }

  const score = Math.abs(result - target);
  if (gameMode === 'daily') {
    if (!(currentGame in bestScores) || score < bestScores[currentGame]) {
      bestScores[currentGame] = score;
      localStorage.setItem('bestScores', JSON.stringify(bestScores));
    }
    if (score === 0 && !(currentGame in bestScores && bestScores[currentGame] === 0)) {
      qu0xCount += 1;
      localStorage.setItem('qu0xCount', qu0xCount);
      showQu0xPopup();
    }
    renderScore();
    renderGameSelector();
  }

  updateExpression();
}

function renderScore() {
  document.getElementById('best-score').textContent =
    bestScores[currentGame] !== undefined ? bestScores[currentGame] : 'N/A';
  document.getElementById('qu0x-count').textContent = qu0xCount;
  const masterScore = Object.values(bestScores).reduce((sum, x) => sum + (x || 0), 0);
  document.getElementById('master-score').textContent = masterScore;
}

function showQu0xPopup() {
  const popup = document.getElementById('qu0x-popup');
  popup.style.display = 'block';
  popup.style.opacity = '1';
  setTimeout(() => {
    popup.style.display = 'none';
  }, 3000);
}

function clearExpression() {
  expression = '';
  usedDice = [];
  updateExpression();
}

document.getElementById('submit-button').onclick = submitExpression;
document.getElementById('clear').onclick = clearExpression;
document.getElementById('backspace').onclick = () => {
  if (expression.length > 0) {
    expression = expression.slice(0, -1);
    updateExpression();
  }
};

document.querySelectorAll('.btn.op').forEach(btn => {
  btn.onclick = () => {
    expression += btn.textContent;
    updateExpression();
  };
});

document.getElementById('mode-toggle').onclick = () => {
  if (gameMode === 'daily') {
    gameMode = 'blitz';
    document.getElementById('mode-toggle').textContent = 'Daily Mode';
    expression = '';
    dice = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6));
    target = 10 + Math.floor(Math.random() * 90);
    usedDice = [];
    document.getElementById('expression-box').textContent = '';
    document.getElementById('expression-output-box').textContent = '';
    document.getElementById('target-number').textContent = target;
    renderDice();
    document.getElementById('game-number').textContent = 'Blitz';
    document.getElementById('game-date').textContent = '';
    document.getElementById('best-score').textContent = 'N/A';
  } else {
    document.getElementById('mode-toggle').textContent = 'Blitz Mode';
    updateGame(currentGame);
  }
};

document.getElementById('prev-button').onclick = () => {
  if (currentGame > 1) updateGame(currentGame - 1);
};

document.getElementById('next-button').onclick = () => {
  if (currentGame < totalGames) updateGame(currentGame + 1);
};

document.getElementById('game-selector').onchange = e => {
  updateGame(parseInt(e.target.value));
};

// Initialize
updateGame(currentGame);
