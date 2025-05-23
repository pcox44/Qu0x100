// script.js

const operatorSymbols = ['+', '-', '*', '/', '^', '!', '(', ')'];
const startDate = new Date('2025-05-15');
const today = new Date();
today.setHours(0, 0, 0, 0);

let currentDate = new Date(today);
let usedDice = [];
let expression = '';
let dailyScores = {};

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seedFromDate(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function generatePuzzle(date) {
  let seed = seedFromDate(date);
  let values = [];
  for (let i = 0; i < 5; i++) {
    values.push(Math.floor(getSeededRandom(seed + i) * 6) + 1);
  }
  let target = Math.floor(getSeededRandom(seed + 99) * 100) + 1;
  return { dice: values, target };
}

function renderDice(dice) {
  const container = document.getElementById('dice-container');
  container.innerHTML = '';
  usedDice = [];
  dice.forEach((val, idx) => {
    const die = document.createElement('div');
    die.className = `die die-${val}`;
    die.textContent = val;
    die.onclick = () => addDie(val, idx);
    container.appendChild(die);
  });
}

function addDie(val, index) {
  if (usedDice.includes(index)) return;
  expression += val;
  usedDice.push(index);
  document.getElementById('expression-box').textContent = expression;
  document.querySelectorAll('.die')[index].classList.add('used');
}

function renderOperators() {
  const container = document.getElementById('operator-row');
  container.innerHTML = '';
  operatorSymbols.forEach(op => {
    const btn = document.createElement('button');
    btn.className = 'operator';
    btn.textContent = op;
    btn.onclick = () => {
      if (op === '!') {
        try {
          const match = expression.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1]);
            if (num < 0 || !Number.isInteger(num)) return;
            expression += '!';
            document.getElementById('expression-box').textContent = expression;
          }
        } catch {}
      } else {
        expression += op;
        document.getElementById('expression-box').textContent = expression;
      }
    };
    container.appendChild(btn);
  });

  const back = document.createElement('button');
  back.textContent = '⌫';
  back.onclick = () => {
    if (expression.length > 0) {
      const removed = expression.slice(-1);
      expression = expression.slice(0, -1);
      if (!isNaN(removed)) {
        const idx = usedDice.pop();
        document.querySelectorAll('.die')[idx].classList.remove('used');
      }
      document.getElementById('expression-box').textContent = expression;
    }
  };
  container.appendChild(back);

  const clear = document.createElement('button');
  clear.textContent = 'Clear';
  clear.onclick = () => resetExpression();
  container.appendChild(clear);
}

function resetExpression() {
  expression = '';
  usedDice = [];
  document.getElementById('expression-box').textContent = '';
  document.getElementById('output-box').textContent = '?';
  document.querySelectorAll('.die').forEach(d => d.classList.remove('used'));
}

function evaluateExpression() {
  if (usedDice.length !== 5) return;
  try {
    const replaced = expression.replace(/(\d+)!/g, (_, n) => {
      const num = parseInt(n);
      if (num < 0 || !Number.isInteger(num)) throw new Error();
      let f = 1;
      for (let i = 2; i <= num; i++) f *= i;
      return f;
    });
    const result = eval(replaced);
    document.getElementById('output-box').textContent = result;
    const target = parseInt(document.getElementById('target-box').textContent);
    const score = Math.abs(result - target);

    if (!(currentDate.toDateString() in dailyScores) || score < dailyScores[currentDate.toDateString()]) {
      dailyScores[currentDate.toDateString()] = score;
    }

    if (score === 0) {
      if (!localStorage.getItem(`qu0x-${currentDate.toDateString()}`)) {
        localStorage.setItem(`qu0x-${currentDate.toDateString()}`, '1');
        showQu0xPopup();
      }
    }

    updateScores();
  } catch {
    document.getElementById('output-box').textContent = '?';
  }
}

function showQu0xPopup() {
  const popup = document.getElementById('qu0x-popup');
  popup.textContent = 'Qu0x!';
  popup.style.display = 'block';
  setTimeout(() => popup.style.display = 'none', 3000);
}

function updateScores() {
  const solvedDates = Object.keys(dailyScores);
  const total = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  let qu0xCount = 0;
  solvedDates.forEach(d => {
    if (dailyScores[d] === 0) qu0xCount++;
  });
  document.getElementById('qu0x-fraction').textContent = `${qu0xCount}/${total}`;

  const allSolved = solvedDates.length >= total;
  document.getElementById('qu0x-master').textContent = `Qu0x Master Score: ${allSolved ? solvedDates.reduce((acc, d) => acc + dailyScores[d], 0) : 'N/A'}`;
  document.getElementById('daily-best-score').textContent = `Daily Best Score: ${dailyScores[currentDate.toDateString()] ?? 'N/A'}`;
}

function renderDaySelector() {
  const selector = document.getElementById('day-selector');
  selector.innerHTML = '';
  const total = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  for (let i = 0; i < total; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const opt = document.createElement('option');
    const key = d.toDateString();
    const score = dailyScores[key];
    opt.value = i;
    if (score === 0) opt.textContent = `⭐ ${d.toLocaleDateString()}`;
    else if (score != null) opt.textContent = `✔ ${d.toLocaleDateString()} (${score})`;
    else opt.textContent = `  ${d.toLocaleDateString()}`;
    selector.appendChild(opt);
  }
  selector.selectedIndex = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  selector.onchange = () => {
    currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + parseInt(selector.value));
    loadPuzzle();
  };
}

function loadPuzzle() {
  document.getElementById('date-display').textContent = currentDate.toDateString();
  const puzzle = generatePuzzle(currentDate);
  document.getElementById('target-box').textContent = puzzle.target;
  renderDice(puzzle.dice);
  resetExpression();
  updateScores();
  renderDaySelector();
}

document.getElementById('submit-btn').onclick = evaluateExpression;
document.getElementById('prev-btn').onclick = () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadPuzzle();
};
document.getElementById('next-btn').onclick = () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadPuzzle();
};

renderOperators();
loadPuzzle();
