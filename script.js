// script.js

const startDate = new Date('2025-05-15T00:00:00');
const today = new Date();
const oneDayMs = 24 * 60 * 60 * 1000;

function dateToYMD(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Number of puzzles = days between startDate and today inclusive
const totalPuzzles = Math.floor((today - startDate) / oneDayMs) + 1;

const diceColors = {
  1: {bg: 'red', fg: 'white'},
  2: {bg: 'white', fg: 'black'},
  3: {bg: 'blue', fg: 'white'},
  4: {bg: 'yellow', fg: 'black'},
  5: {bg: 'green', fg: 'white'},
  6: {bg: 'black', fg: 'yellow'},
};

const operators = ['+', '-', '*', '/', '^', '!'];

let currentIndex = totalPuzzles - 1; // default today
let expression = '';
let usedDice = new Set();
let diceValues = [];
let targetNumber = 0;
let qu0xData = {}; // key=date string, value={bestScore:int, expression:str, isQu0x:boolean}
let qu0xCompletionCount = 0;

const dateDisplay = document.getElementById('date-display');
const diceContainer = document.getElementById('dice-container');
const operatorRow = document.getElementById('operator-row');
const expressionBox = document.getElementById('expression-box');
const outputBox = document.getElementById('output-box');
const submitBtn = document.getElementById('submit-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const dayDropdown = document.getElementById('day-dropdown');
const targetNumberDiv = document.getElementById('target-number');
const dailyBestScoreDiv = document.getElementById('daily-best-score');
const qu0xMasterDiv = document.getElementById('qu0x-master');
const qu0xFractionSpan = document.getElementById('qu0x-fraction');
const qu0xPopup = document.getElementById('qu0x-popup');

function seedRandom(seed) {
  // Simple seed RNG (mulberry32)
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function generatePuzzleForIndex(idx) {
  // Generate dice and target for given day index deterministically
  // Use index as seed
  const seed = idx + 20250515; 
  const rand = seedRandom(seed);
  const dice = [];
  for(let i=0; i<5; i++) {
    dice.push(Math.floor(rand() * 6) + 1);
  }
  // Target: use sum of dice + a small random +/- offset - can be changed
  const sumDice = dice.reduce((a,b) => a+b, 0);
  // Offset between -10 and 10 but avoid negative or zero target
  let offset = Math.floor(rand()*21) - 10;
  let target = sumDice + offset;
  if(target < 1) target = sumDice;
  return {dice, target};
}

function loadQu0xData() {
  const data = localStorage.getItem('qu0xData');
  if(data) {
    qu0xData = JSON.parse(data);
  } else {
    qu0xData = {};
  }
}

function saveQu0xData() {
  localStorage.setItem('qu0xData', JSON.stringify(qu0xData));
}

function updateQu0xCompletionCount() {
  qu0xCompletionCount = Object.values(qu0xData).filter(d => d.isQu0x).length;
}

function updateQu0xMaster() {
  if(qu0xCompletionCount === totalPuzzles) {
    // Sum of best scores for all days
    let sum = 0;
    for(let i=0; i<totalPuzzles; i++) {
      const dayKey = getDateKey(i);
      if(qu0xData[dayKey] && qu0xData[dayKey].bestScore !== undefined) {
        sum += qu0xData[dayKey].bestScore;
      }
    }
    qu0xMasterDiv.textContent = `Qu0x Master Score: ${sum}`;
  } else {
    qu0xMasterDiv.textContent = 'Qu0x Master Score: N/A';
  }
}

function getDateKey(index) {
  const d = new Date(startDate.getTime() + index * oneDayMs);
  return dateToYMD(d);
}

function updateDropdown() {
  dayDropdown.innerHTML = '';
  for(let i=0; i<totalPuzzles; i++) {
    const dayKey = getDateKey(i);
    const option = document.createElement('option');
    option.value = i;
    const dayDate = new Date(startDate.getTime() + i * oneDayMs);
    const labelDate = dayDate.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
    let prefix = '';
    if(qu0xData[dayKey]) {
      if(qu0xData[dayKey].isQu0x) {
        prefix = '⭐ ';
      } else if(qu0xData[dayKey].bestScore !== undefined) {
        prefix = `✔ (${qu0xData[dayKey].bestScore}) `;
      }
    }
    option.textContent = `${prefix}${labelDate}`;
    dayDropdown.appendChild(option);
  }
  dayDropdown.value = currentIndex;
}

function createDiceElement(value, idx) {
  const die = document.createElement('div');
  die.classList.add('die');
  die.classList.add(`die-${value}`);
  die.textContent = value;
  die.style.borderColor = 'black';
  die.style.borderWidth = '2px';
  die.style.borderStyle = 'solid';

  if(usedDice.has(idx)) {
    die.classList.add('fade-out');
  } else {
    die.classList.remove('fade-out');
  }

  die.addEventListener('click', () => {
    if(usedDice.has(idx)) return; // already used
    // Append dice value to expression only if no concat violation
    if(canAddToExpression('' + value)) {
      expression += value;
      usedDice.add(idx);
      updateExpressionDisplay();
    }
  });

  return die;
}

function createOperatorButton(op) {
  const btn = document.createElement('button');
  btn.classList.add('operator-btn');
  btn.textContent = op === '*' ? '×' : op === '/' ? '÷' : op;
  btn.title = op;
  btn.addEventListener('click', () => {
    if(canAddToExpression(op)) {
      expression += op;
      updateExpressionDisplay();
    }
  });
  return btn;
}

function canAddToExpression(char) {
  // Prevent concat (e.g. two dice numbers directly side by side without operator)
  // Allowed rules:
  // - Dice values can be added only if previous char is operator or empty
  // - Operator can be added only if previous char is digit or '!' (except factorial which is postfix)
  // - Factorial only after whole number, no two factorials in a row
  const last = expression.slice(-1);
  if('0123456'.includes(char)) {
    // char is dice value (only 1-6 actually)
    if(last === '' || operators.includes(last) || last === '(' || last === ')') return true;
    return false; // prevent concat number directly
  }
  if(operators.includes(char)) {
    // factorial '!' only after digit or ')'
    if(char === '!') {
      if(last.match(/[0-9)]/)) return true;
      return false;
    } else {
      // other operators require last char to be digit or '!' or ')'
      if(last.match(/[0-9!)]/)) return true;
      return false;
    }
  }
  // parentheses can be added as needed, but we are not supporting parentheses in dice input currently
  return true;
}

function updateExpressionDisplay() {
  expressionBox.textContent = expression;
  evaluateExpression();
}

function evaluateExpression() {
  if(expression === '') {
    outputBox.textContent = '';
    return;
  }
  try {
    // Replace ^ with ** for JS eval
    // Handle factorial: replace n! with factorial(n)
    let expr = expression.replace(/\^/g, '**');
    expr = expr.replace(/(\d+)!/g, (match, p1) => {
      const num = Number(p1);
      if(!Number.isInteger(num) || num < 0) throw new Error('Invalid factorial');
      return factorial(num);
    });
    // Check for invalid chars (only digits, operators, and factorial allowed)
    if(/[^0-9+\-*/().!]/.test(expr)) throw new Error('Invalid chars');
    // Evaluate safely
    const result = eval(expr);
    if(typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      outputBox.textContent = `= ${result}`;
    } else {
      outputBox.textContent = '= ?';
    }
  } catch(e) {
    outputBox.textContent = '= ?';
  }
}

function factorial(n) {
  if(n === 0 || n === 1) return 1;
  let f = 1;
  for(let i=2; i<=n; i++) f *= i;
  return f;
}

function updateDiceContainer() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const die = createDiceElement(val, idx);
    diceContainer.appendChild(die);
  });
}

function updateOperatorRow() {
  operatorRow.innerHTML = '';
  operators.forEach(op => {
    operatorRow.appendChild(createOperatorButton(op));
  });
  // Clear and Backspace buttons
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.classList.add('operator-btn');
  clearBtn.title = 'Clear Expression';
  clearBtn.addEventListener('click', () => {
    expression = '';
    usedDice.clear();
    updateExpressionDisplay();
    updateDiceContainer();
  });
  operatorRow.appendChild(clearBtn);

  const backspaceBtn = document.createElement('button');
  backspaceBtn.textContent = '←';
  backspaceBtn.classList.add('operator-btn');
  backspaceBtn.title = 'Backspace';
  backspaceBtn.addEventListener('click', () => {
    if(expression.length === 0) return;
    const lastChar = expression.slice(-1);
    expression = expression.slice(0, -1);
    // If lastChar was a digit, remove that dice from usedDice by index
    if(/[1-6]/.test(lastChar)) {
      // Find the dice index of that value used in expression to free it
      // This is tricky, so let's rebuild usedDice from expression
      rebuildUsedDiceFromExpression();
    }
    updateExpressionDisplay();
    updateDiceContainer();
  });
  operatorRow.appendChild(backspaceBtn);
}

function rebuildUsedDiceFromExpression() {
  usedDice.clear();
  // For each dice value in current puzzle, mark those used in expression as used
  for(let i=0; i<diceValues.length; i++) {
    if(expression.includes(diceValues[i].toString())) {
      // But we must check usage count carefully because multiple dice same number
      // For simplicity, we check occurrences of that digit in expression and compare to dice count
      // We'll do a simple approach: for each dice value, find count in expression, 
      // and mark first that many dice of that value as used
    }
  }
  // For full correctness, let's do:
  // Count of each digit in expression (excluding operators)
  const digitCount = {};
  for(let c of expression) {
    if(/[1-6]/.test(c)) {
      digitCount[c] = (digitCount[c] || 0) + 1;
    }
  }
  // Mark dice used in order, up to count
  const usedCount = {};
  usedDice.clear();
  for(let i=0; i<diceValues.length; i++) {
    const val = diceValues[i];
    const strVal = val.toString();
    usedCount[strVal] = usedCount[strVal] || 0;
    if(digitCount[strVal] && usedCount[strVal] < digitCount[strVal]) {
      usedDice.add(i);
      usedCount[strVal]++;
    }
  }
}

function updateDateDisplay() {
  const currentDate = new Date(startDate.getTime() + currentIndex * oneDayMs);
  dateDisplay.textContent = currentDate.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
}

function loadPuzzle() {
  // Clear expression and used dice
  expression = '';
  usedDice.clear();

  const puzzle = generatePuzzleForIndex(currentIndex);
  diceValues = puzzle.dice;
  targetNumber = puzzle.target;

  updateDateDisplay();
  updateDiceContainer();
  updateOperatorRow();
  updateExpressionDisplay();
  updateDropdown();

  targetNumberDiv.textContent = `Target: ${targetNumber}`;

  const dayKey = getDateKey(currentIndex);
  if(qu0xData[dayKey]) {
    dailyBestScoreDiv.textContent = `Daily Best Score: ${qu0xData[dayKey].bestScore} (${qu0xData[dayKey].expression || ''})`;
    // Lock if perfect
    if(qu0xData[dayKey].isQu0x) {
      submitBtn.disabled = true;
      expressionBox.textContent += ' (Locked - Qu0x!)';
    } else {
      submitBtn.disabled = false;
    }
  } else {
    dailyBestScoreDiv.textContent = 'Daily Best Score: None';
    submitBtn.disabled = false;
  }
  updateQu0xMaster();
}

function calculateScore(exprResult) {
  return Math.abs(exprResult - targetNumber);
}

submitBtn.addEventListener('click', () => {
  // Evaluate expression result safely
  let exprResult;
  try {
    let expr = expression.replace(/\^/g, '**');
    expr = expr.replace(/(\d+)!/g, (match, p1) => {
      const num = Number(p1);
      if(!Number.isInteger(num) || num < 0) throw new Error('Invalid factorial');
      return factorial(num);
    });
    if(/[^0-9+\-*/().!]/.test(expr)) throw new Error('Invalid chars');
    exprResult = eval(expr);
    if(typeof exprResult !== 'number' || isNaN(exprResult) || !isFinite(exprResult)) throw new Error('Invalid result');
  } catch(e) {
    alert('Invalid expression');
    return;
  }
  const score = calculateScore(exprResult);
  const dayKey = getDateKey(currentIndex);

  if(!qu0xData[dayKey] || (qu0xData[dayKey].bestScore === undefined) || (score < qu0xData[dayKey].bestScore)) {
    qu0xData[dayKey] = {
      bestScore: score,
      expression: expression,
      isQu0x: score === 0
    };
    saveQu0xData();
    updateQu0xCompletionCount();
    updateQu0xMaster();
    updateDropdown();
    dailyBestScoreDiv.textContent = `Daily Best Score: ${score} (${expression})`;
  }

  if(score === 0) {
    // Qu0x! show animation and lock day
    showQu0xPopup();
    submitBtn.disabled = true;
  }
});

function showQu0xPopup() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

prevBtn.addEventListener('click', () => {
  if(currentIndex > 0) {
    currentIndex--;
    loadPuzzle();
  }
});
nextBtn.addEventListener('click', () => {
  if(currentIndex < totalPuzzles - 1) {
    currentIndex++;
    loadPuzzle();
  }
});

dayDropdown.addEventListener('change', (e) => {
  currentIndex = Number(e.target.value);
  loadPuzzle();
});

loadQu0xData();
updateQu0xCompletionCount();
loadPuzzle();
