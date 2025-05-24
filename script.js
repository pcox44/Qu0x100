const buttonValues = ['+', '-', '*', '/', '^', '(', ')', '!', '!!', '!!!'];
const diceColors = {
  1: ['red', 'white'],
  2: ['white', 'black'],
  3: ['blue', 'white'],
  4: ['yellow', 'black'],
  5: ['green', 'white'],
  6: ['black', 'yellow']
};

const expressionBox = document.getElementById('expressionBox');
const evaluationBox = document.getElementById('evaluationBox');
const diceContainer = document.getElementById('diceContainer');
const numberGrid = document.getElementById('numberGrid');
const progressCount = document.getElementById('progressCount');
const weekSelector = document.getElementById('weekSelector');

let currentWeekStart = getWeekStart(new Date());
let dice = [];
let usedDice = [];
let foundNumbers = new Set();

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return new Date(d);
}

function seedRandom(seed) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getDiceForWeek(date) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const rand = seedRandom(seed);
  return Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
}

function drawDice() {
  diceContainer.innerHTML = '';
  usedDice = [];
  dice.forEach((val, i) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.dataset.value = val;
    die.textContent = val;
    die.style.backgroundColor = diceColors[val][0];
    die.style.color = diceColors[val][1];
    die.addEventListener('click', () => {
      expressionBox.textContent += val;
      usedDice.push(i);
      die.classList.add('faded');
    });
    diceContainer.appendChild(die);
  });
}

function drawButtons() {
  const grid = document.getElementById('buttonGrid');
  grid.innerHTML = '';
  buttonValues.forEach(val => {
    const btn = document.createElement('button');
    btn.textContent = val;
    btn.onclick = () => expressionBox.textContent += val;
    grid.appendChild(btn);
  });
}

function drawGrid() {
  numberGrid.innerHTML = '';
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement('div');
    cell.textContent = i;
    if (foundNumbers.has(i)) cell.classList.add('found');
    numberGrid.appendChild(cell);
  }
  progressCount.textContent = foundNumbers.size;
}

function parseFactorial(expr) {
  return expr.replace(/(\d+|\))(!{1,3})/g, (_, base, bangs) => {
    let count = bangs.length;
    return `factorial(${base},${count})`;
  });
}

function factorial(n, level) {
  n = parseInt(n);
  if (!Number.isInteger(n) || n < 0) return NaN;
  if (level === 1) return n <= 1 ? 1 : n * factorial(n - 1, 1);
  if (level === 2) return n <= 0 ? 1 : n * factorial(n - 2, 2);
  if (level === 3) return n <= 0 ? 1 : n * factorial(n - 3, 3);
  return NaN;
}

document.getElementById('submitBtn').onclick = () => {
  const expr = expressionBox.textContent;
  if (usedDice.length !== 5) return alert('Use all 5 dice!');
  try {
    const transformed = parseFactorial(expr);
    const result = eval(transformed);
    evaluationBox.textContent = isFinite(result) ? result : '?';
    if (Number.isInteger(result) && result >= 1 && result <= 100) {
      foundNumbers.add(result);
      drawGrid();
      if (foundNumbers.size === 100) {
        document.getElementById('qu0xAnimation').classList.remove('hidden');
        document.getElementById('shareBtn').classList.remove('hidden');
        document.getElementById('qu0xMessage').classList.remove('hidden');
      }
    }
  } catch {
    evaluationBox.textContent = '?';
  }
};

document.getElementById('clearBtn').onclick = () => {
  expressionBox.textContent = '';
  evaluationBox.textContent = '?';
  drawDice();
};

document.getElementById('backspaceBtn').onclick = () => {
  expressionBox.textContent = expressionBox.textContent.slice(0, -1);
};

document.getElementById('shareBtn').onclick = () => {
  alert('Sharing feature coming soon!');
};

function populateWeeks() {
  const first = new Date(2025, 4, 11);
  const now = new Date();
  let week = new Date(first);
  let count = 1;
  while (week <= now) {
    const opt = document.createElement('option');
    opt.value = week.toISOString();
    opt.textContent = `#${count} – ${week.toLocaleDateString()}`;
    weekSelector.appendChild(opt);
    week.setDate(week.getDate() + 7);
    count++;
  }
  weekSelector.value = getWeekStart(new Date()).toISOString();
}

weekSelector.onchange = () => {
  currentWeekStart = new Date(weekSelector.value);
  dice = getDiceForWeek(currentWeekStart);
  drawDice();
  expressionBox.textContent = '';
  evaluationBox.textContent = '?';
};

populateWeeks();
dice = getDiceForWeek(currentWeekStart);
drawDice();
drawButtons();
drawGrid();

