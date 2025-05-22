const colors = {
  1: { background: 'red', color: 'white' },
  2: { background: 'white', color: 'black' },
  3: { background: 'blue', color: 'white' },
  4: { background: 'yellow', color: 'black' },
  5: { background: 'green', color: 'white' },
  6: { background: 'black', color: 'yellow' },
};

let dice = [], target = 0, expression = '', usedDice = [];
let gameNumber = 1;
let todayGameNumber = calculateGameNumber(new Date());
let totalQu0x = JSON.parse(localStorage.getItem('totalQu0x') || '0');
let completed = JSON.parse(localStorage.getItem('qu0xCompleted') || '{}');
let bestScores = JSON.parse(localStorage.getItem('qu0xBestScores') || '{}');

let isBlitz = false; // Tracks mode

function calculateGameNumber(date) {
  return Math.floor((date - new Date('2025-05-15')) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateFromGameNumber(n) {
  let d = new Date('2025-05-15');
  d.setDate(d.getDate() + (n - 1));
  return d.toISOString().split('T')[0];
}

function seedRandom(seed) {
  return Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000);
}

// Generate 5 dice from seed, no dice concatenation allowed
function seededRandomDice(seed) {
  let dice = [];
  for (let i = 0; i < 5; i++) {
    seed += i + 1;
    dice.push(Math.floor(seedRandom(seed) * 6) + 1);
  }
  return dice;
}

function seededTarget(seed) {
  return Math.floor(seedRandom(seed + 100) * 100) + 1;
}

function randomSeed() {
  return Math.floor(Math.random() * 1000000);
}

// Load game by number or Blitz
function loadGame(n) {
  gameNumber = n || 1;
  usedDice = [];
  expression = '';

  if (isBlitz) {
    // Blitz mode: random dice and target each time
    let seed = randomSeed();
    dice = seededRandomDice(seed);
    target = seededTarget(seed);
  } else {
    // Daily mode
    const date = getDateFromGameNumber(n);
    const seed = parseInt(date.replace(/-/g, ''));
    dice = seededRandomDice(seed);
    target = seededTarget(seed);
    // Load saved expression for day if any
    if (completed[n]) {
      expression = completed[n].expression;
      usedDice = []; // We'll reconstruct usedDice from expression digits
      // UsedDice reconstruct: for each digit in expression, mark corresponding dice used (matching by value, careful)
      usedDice = reconstructUsedDice(expression, dice);
    }
  }

  updateDisplay();
  updateExpressionDisplay();
  updateScoresDisplay();
  updateModeButtons();
}

// Reconstruct used dice indices from expression digits (no concatenation so digit-by-digit)
function reconstructUsedDice(expr, diceArr) {
  let used = [];
  // Extract digits and factorial/exponent parts from expression carefully:
  // Since no concatenation allowed, each digit corresponds to one die.
  // We will only consider digits 1-6 that correspond to dice values.
  // So ignore operators and multi-digit numbers.
  // Strategy: find all digits in expression and map to dice not yet used.
  const digits = expr.match(/[1-6]/g) || [];
  let diceUsedFlags = new Array(diceArr.length).fill(false);
  let usedIndices = [];

  digits.forEach(d => {
    let val = parseInt(d);
    for (let i = 0; i < diceArr.length; i++) {
      if (!diceUsedFlags[i] && diceArr[i] === val) {
        diceUsedFlags[i] = true;
        usedIndices.push(i);
        break;
      }
    }
  });
  return usedIndices;
}

// Check if concatenation would occur by trying to add new digit
function canAddDigit(digit) {
  // No concatenation means each digit corresponds to one die and must not create multi-digit numbers.
  // expression currently is string of digits and operators. We allow multi-digit numbers if they were typed by user (not allowed, buttons only, so no multi-digit numbers possible)
  // Since user can only add digits via dice buttons, each digit must be separate.
  // So we prevent adding digit if last token is a digit => concatenation
  // We'll check last character: if it's digit, then concatenation is attempted.

  if (expression.length === 0) return true; // can start with digit
  const lastChar = expression[expression.length - 1];
  if (/[0-9]/.test(lastChar)) {
    // Last char digit, concatenation attempt
    return false;
  }
  return true;
}

function updateDisplay() {
  const diceBox = document.getElementById('dice-buttons');
  diceBox.innerHTML = '';
  dice.forEach((val, i) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.innerText = val;
    die.style.backgroundColor = colors[val].background;
    die.style.color = colors[val].color;
    die.style.opacity = usedDice.includes(i) ? 0.3 : 1;
    if (!completed[gameNumber] && !isBlitz) {
      // Only disable clicks if completed daily game and not Blitz
      die.onclick = () => {
        if (!usedDice.includes(i)) {
          if (!canAddDigit(val)) {
            alert('Concatenation of dice numbers is not allowed.');
            return;
          }
          usedDice.push(i);
          expression += val;
          updateDisplay();
          updateExpressionDisplay();
        }
      };
    } else if (isBlitz) {
      // In Blitz mode, can reuse dice unlimited times and no usage tracking
      die.onclick = () => {
        if (!canAddDigit(val)) {
          alert('Concatenation of dice numbers is not allowed.');
          return;
        }
        expression += val;
        updateExpressionDisplay();
      };
    }
    diceBox.appendChild(die);
  });

  document.getElementById('target-box').innerText = `Target: ${target}`;
  document.getElementById('expression-box').value = expression;
  document.getElementById('game-number').innerText = isBlitz ? `Blitz Mode` : `Game #${gameNumber}`;
  document.getElementById('date-display').innerText = isBlitz ? '' : getDateFromGameNumber(gameNumber);
}

function updateExpressionDisplay() {
  try {
    // Replace factorial (including cases like (2+1)!) correctly
    // Use regex to replace all factorials: we must evaluate inside parenthesis first
    let expr = expression;

    // Validate no fractional exponents
    // We only allow integer exponents, so find all exponents and check
    const expMatches = [...expr.matchAll(/(\d+)\^(\d+)/g)];
    for (const m of expMatches) {
      const base = m[1];
      const exp = m[2];
      if (!Number.isInteger(+exp)) {
        throw new Error('Fractional exponents not allowed');
      }
    }

    // Replace all factorials
    // Approach: repeatedly replace factorial pattern until none left
    // Factorials can be on numbers or parenthetical expressions e.g. (2+1)!
    while (true) {
      let match = expr.match(/(\([^\(\)]+\)|\d+)!/);
      if (!match) break;
      let inner = match[1];
      let val;
      if (inner.startsWith('(')) {
        // Evaluate inner expression without factorial
        val = eval(inner.slice(1, -1));
      } else {
        val = +inner;
      }
      if (!Number.isInteger(val) || val < 0) {
        throw new Error('Invalid factorial');
      }
      let fact = 1;
      for (let i = 1; i <= val; i++) fact *= i;
      expr = expr.replace(match[0], fact);
    }

    // Replace exponents (a^b) with Math.pow(a,b)
    expr = expr.replace(/(\d+)\^(\d+)/g, (_, a, b) => `Math.pow(${a},${b})`);

    const val = eval(expr);
    document.getElementById('expression-output').innerText = isNaN(val) ? '' : val;
  } catch (e) {
    document.getElementById('expression-output').innerText = '';
  }
}

function clearExpression() {
  if (!isBlitz && completed[gameNumber]) return;
  expression = '';
  usedDice = [];
  updateDisplay();
  updateExpressionDisplay();
}

function backspace() {
  if (!isBlitz && completed[gameNumber]) return;
  if (expression.length > 0) {
    const last = expression[expression.length - 1];
    expression = expression.slice(0, -1);
    if (!isBlitz && !isNaN(last)) {
      for (let i = usedDice.length - 1; i >= 0; i--) {
        if (dice[usedDice[i]] == last) {
          usedDice.splice(i, 1);
          break;
        }
      }
    }
    updateDisplay();
    updateExpressionDisplay();
  }
}

function submit() {
  if (!isBlitz && completed[gameNumber]) return;
  // In daily mode require all dice used exactly once
  if (!isBlitz && usedDice.length !== 5) return alert('Use all 5 dice exactly once!');
  try {
    // Validate fractional exponents again before eval
    const expMatches = [...expression.matchAll(/(\d+)\^(\d+)/g)];
    for (const m of expMatches) {
      const exp = m[2];
      if (!Number.isInteger(+exp)) {
        alert('Fractional exponents are not allowed.');
        return;
      }
    }

    let expr = expression;

    // Replace factorials (including (2+1)! etc)
    while (true) {
      let match = expr.match(/(\([^\(\)]+\)|\d+)!/);
      if (!match) break;
      let inner = match[1];
      let val;
      if (inner.startsWith('(')) {
        val = eval(inner.slice(1, -1));
      } else {
        val = +inner;
      }
      if (!Number.isInteger(val) || val < 0) {
        alert('Invalid factorial');
        return;
      }
      let fact = 1;
      for (let i = 1; i <= val; i++) fact *= i;
      expr = expr.replace(match[0], fact);
    }

    // Replace exponents
    expr = expr.replace(/(\d+)\^(\d+)/g, (_, a, b) => `Math.pow(${a},${b})`);

    const result = eval(expr);
    if (isNaN(result)) {
      alert('Invalid expression result');
      return;
    }

    const score = Math.abs(target - result);

    if (!isBlitz) {
      // Save best score per day
      let prevBest = bestScores[gameNumber];
      if (prevBest === undefined || score < prevBest) {
        bestScores[gameNumber] = score;
        localStorage.setItem('qu0xBestScores', JSON.stringify(bestScores));
      }
    }

    if (score === 0) {
      // Perfect Qu0x
      if (!isBlitz && !completed[gameNumber]) {
        totalQu0x++;
        completed[gameNumber] = { expression };
        localStorage.setItem('totalQu0x', JSON.stringify(totalQu0x));
        localStorage.setItem('qu0xCompleted', JSON.stringify(completed));
        showQu0x();
      }
    }

    updateScoresDisplay();
    updateDisplay();
  } catch {
    alert('Invalid expression');
  }
}

function showQu0x() {
  const el = document.createElement('div');
  el.className = 'qu0x-popup';
  el.innerText = 'Qu0x!';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function nextGame() {
  if (!isBlitz && gameNumber < todayGameNumber) loadGame(gameNumber + 1);
}

function prevGame() {
  if (!isBlitz && gameNumber > 1) loadGame(gameNumber - 1);
}

// --- New functions for mode switching and UI updates ---

function switchToBlitz() {
  isBlitz = true;
  expression = '';
  usedDice = [];
  loadGame(); // No argument loads Blitz mode
}

function switchToDaily() {
  isBlitz = false;
  expression = '';
  usedDice = [];
  loadGame(todayGameNumber);
}

// Update Qu0x-Master Score & Total Qu0x display at bottom
function updateScoresDisplay() {
  // Total Qu0x only counts daily perfect completions
  document.getElementById('total-qu0x').innerText = `Total Qu0x: ${totalQu0x}`;

  // Qu0x-Master Score sums best scores of all daily games up to today
  let allCompleted = true;
  let sumBest = 0;
  for (let i = 1; i <= todayGameNumber; i++) {
    if (bestScores[i] === undefined) {
      allCompleted = false;
      break;
    }
    sumBest += bestScores[i];
  }
  const masterScoreEl = document.getElementById('qu0x-master-score');
  if (allCompleted) {
    masterScoreEl.innerText = `Qu0x-Master Score: ${sumBest.toFixed(2)}`;
  } else {
    masterScoreEl.innerText = '';
  }

  // Show best score for current day
  const bestScoreToday = bestScores[gameNumber];
  const bestScoreEl = document.getElementById('best-score-display');
  if (!isBlitz && bestScoreToday !== undefined) {
    bestScoreEl.innerText = `Best Score: ${bestScoreToday.toFixed(2)}`;
  } else {
    bestScoreEl.innerText = '';
  }
}

function updateModeButtons() {
  // Show Blitz button if not in Blitz
  const blitzBtn = document.getElementById('blitz-btn');
  const dailyBtn = document.getElementById('daily-btn');
  if (isBlitz) {
    blitzBtn.style.display = 'none';
    dailyBtn.style.display = 'inline-block';
  } else {
    blitzBtn.style.display = 'inline-block';
    dailyBtn.style.display = 'none';
  }
}

// Set up buttons event listeners
document.getElementById('clear-btn').onclick = clearExpression;
document.getElementById('backspace-btn').onclick = backspace;
document.getElementById('submit-btn').onclick = submit;
document.getElementById('next-btn').onclick = nextGame;
document.getElementById('prev-btn').onclick = prevGame;
document.getElementById('blitz-btn').onclick = switchToBlitz;
document.getElementById('daily-btn').onclick = switchToDaily;

// Disable typing on expression box
const exprBox = document.getElementById('expression-box');
exprBox.readOnly = true;
exprBox.onkeydown = e => e.preventDefault();

// Instructions at top
document.getElementById('instructions').innerText = 
`Welcome to Qu0x!
- Use the colored dice buttons to build your expression.
- You cannot concatenate dice values (e.g., no "45" from dice 4 and 5).
- Use math operations +, -, *, /, ^ (exponent), and ! (factorial).
- Expressions like (2+1)! are allowed.
- Fractional exponents are not allowed.
- Submit your expression to get close to the target number.
- In Daily Mode, use all dice exactly once. Perfect score locks the day.
- In Blitz Mode, infinite random games, no locking.
- Expression input is click-only.`;

// Initialize on page load
switchToDaily();
