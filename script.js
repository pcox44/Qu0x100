let dice = [];
let usedDice = [];
let expression = '';
let completed = new Set();

function getWeekSeed() {
  const now = new Date();
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  return start.toISOString().slice(0, 10);
}

function seedRandom(seed) {
  let x = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

function rollDice() {
  const rand = seedRandom(getWeekSeed());
  dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(1 + Math.floor(rand() * 6));
  }
}

function renderDice() {
  const container = document.getElementById('diceContainer');
  container.innerHTML = '';
  dice.forEach((val, idx) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.innerText = val;
    die.onclick = () => {
      expression += val;
      usedDice.push(idx);
      die.classList.add('faded');
      updateExpression();
    };
    if (usedDice.includes(idx)) die.classList.add('faded');
    container.appendChild(die);
  });
}

function updateExpression() {
  document.getElementById('expressionBox').innerText = expression;
  try {
    const value = evalExpression(expression);
    document.getElementById('evaluationBox').innerText = isFinite(value) ? value : '?';
  } catch {
    document.getElementById('evaluationBox').innerText = '?';
  }
}

function addChar(c) {
  expression += c;
  updateExpression();
}

function backspace() {
  if (expression.length > 0) {
    expression = expression.slice(0, -1);
    usedDice = [];
    renderDice();
    updateExpression();
  }
}

function clearExpression() {
  expression = '';
  usedDice = [];
  renderDice();
  updateExpression();
}

function evalExpression(expr) {
  if (/[^0-9+\-*/^!().]/.test(expr)) throw 'Invalid char';
  const safeExpr = expr.replace(/(\d+)!/g, (_, n) => factorial(Number(n)))
                       .replace(/\^/g, '**');
  return Function('"use strict"; return (' + safeExpr + ')')();
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw 'Invalid factorial';
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function submitExpression() {
  try {
    const val = Math.round(evalExpression(expression));
    if (val >= 1 && val <= 100 && !completed.has(val)) {
      completed.add(val);
      updateGrid();
      clearExpression();
      if (completed.size === 100) {
        document.getElementById('qu0xAnimation').classList.remove('hidden');
      }
    }
  } catch {
    alert('Invalid expression');
  }
}

function buildGrid() {
  const grid = document.getElementById('numberGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement('div');
    cell.innerText = i;
    if (completed.has(i)) cell.classList.add('complete');
    grid.appendChild(cell);
  }
}

function updateGrid() {
  buildGrid();
}

function resetGrid() {
  completed.clear();
  updateGrid();
  clearExpression();
  document.getElementById('qu0xAnimation').classList.add('hidden');
}

window.onload = () => {
  rollDice();
  renderDice();
  buildGrid();
};
