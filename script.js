// Qu0x 100 Weekly Game

const diceCount = 5;

const startDate = new Date(2025, 4, 11); // May 11, 2025 (0-based month)
const msPerWeek = 7 * 24 * 60 * 60 * 1000;

const diceContainer = document.getElementById('diceContainer');
const expressionBox = document.getElementById('expressionBox');
const evaluationBox = document.getElementById('evaluationBox');
const buttonGrid = document.getElementById('buttonGrid');
const submitBtn = document.getElementById('submitBtn');
const backspaceBtn = document.getElementById('backspaceBtn');
const clearBtn = document.getElementById('clearBtn');
const weekSelect = document.getElementById('weekSelect');
const completedCountSpan = document.getElementById('completedCount');
const gameNumberSpan = document.getElementById('gameNumber');

let currentWeekIndex = 0;
let diceValues = [];
let usedDice = Array(diceCount).fill(false);
let expression = '';
let completedNumbers = new Set();

function getWeekIndex(date) {
  const diff = date - startDate;
  return Math.floor(diff / msPerWeek);
}

function getDateFromWeekIndex(weekIndex) {
  return new Date(startDate.getTime() + weekIndex * msPerWeek);
}

function formatDate(d) {
  return (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
}

function populateWeekSelect() {
  const today = new Date();
  const lastWeekIndex = getWeekIndex(today);
  weekSelect.innerHTML = '';
  for(let i = 0; i <= lastWeekIndex; i++) {
    const option = document.createElement('option');
    option.value = i;
    const weekDate = getDateFromWeekIndex(i);
    option.textContent = `Game #${i+1} - ${formatDate(weekDate)}`;
    weekSelect.appendChild(option);
  }
  weekSelect.value = lastWeekIndex;
  currentWeekIndex = lastWeekIndex;
  gameNumberSpan.textContent = currentWeekIndex + 1;
  loadGameData();
}

function rollDice() {
  diceValues = [];
  for (let i = 0; i < diceCount; i++) {
    diceValues.push(Math.floor(Math.random() * 6) + 1);
  }
  usedDice = Array(diceCount).fill(false);
}

function renderDice() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, idx) => {
    const die = document.createElement('div');
    die.classList.add('die');
    die.dataset.value = val;
    die.textContent = val;
    if (usedDice[idx]) {
      die.classList.add('faded');
    }
    die.addEventListener('click', () => {
      if (!usedDice[idx]) {
        expression += val;
        usedDice[idx] = true;
        renderDice();
        updateExpression();
      }
    });
    diceContainer.appendChild(die);
  });
}

function updateExpression() {
  expressionBox.textContent = expression;
  evaluateExpression();
}

function evaluateExpression() {
  if (!expression) {
    evaluationBox.textContent = '?';
    return;
  }

  // Validate that all dice used once in expression
  const numbersInExpr = expression.match(/\d+/g) || [];
  let tempUsed = Array(diceCount).fill(false);
  let allUsed = true;

  // Make sure expression uses all dice exactly once (order doesn't matter here)
  // So check counts of numbers in expression against diceValues counts
  let diceCountMap = {};
  diceValues.forEach(d => diceCountMap[d] = (diceCountMap[d] || 0) + 1);
  let exprCountMap = {};
  numbersInExpr.forEach(n => {
    const num = parseInt(n, 10);
    exprCountMap[num] = (exprCountMap[num] || 0) + 1;
  });
  allUsed = Object.keys(diceCountMap).every(key => exprCountMap[key] === diceCountMap[key]) &&
            Object.keys(exprCountMap).every(key => diceCountMap[key] === exprCountMap[key]);

  if (!allUsed) {
    evaluationBox.textContent = '?';
    return;
  }

  // Evaluate with support for factorials and double/triple factorials
  try {
    const val = evaluateAdvancedExpression(expression);
    if (val === null || val === undefined || isNaN(val)) {
      evaluationBox.textContent = '?';
    } else {
      evaluationBox.textContent = val;
    }
  } catch {
    evaluationBox.textContent = '?';
  }
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return null;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function doubleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return null;
  let res = 1;
  for (let i = n; i > 0; i -= 2) res *= i;
  return res;
}

function tripleFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return null;
  let res = 1;
  for (let i = n; i > 0; i -= 3) res *= i;
  return res;
}

function evaluateAdvancedExpression(expr) {
  // Replace factorials with function calls
  // Support !, !!, !!!
  // Regex to find expressions like (2+1)!, 4!, 5!!, 7!!! etc.
  // We replace them stepwise with a unique token, evaluate inside, then replace.

  let replacedExpr = expr;
  const factorialPattern = /(\([^\(\)]+\)|\d+)(!{1,3})/g;

  // Replace factorial groups with placeholders and compute values
  let match;
  while ((match = factorialPattern.exec(replacedExpr)) !== null) {
    const wholeMatch = match[0];
    const baseExpr = match[1];
    const factMarks = match[2];

    let baseValue;
    try {
      baseValue = eval(baseExpr);
    } catch {
      return null;
    }
    if (!Number.isInteger(baseValue) || baseValue < 0) return null;

    let factValue = null;
    if (factMarks === '!') {
      factValue = factorial(baseValue);
    } else if (factMarks === '!!') {
      factValue = doubleFactorial(baseValue);
    } else if (factMarks === '!!!') {
      factValue = tripleFactorial(baseValue);
    }

    if (factValue === null) return null;

    replacedExpr = replacedExpr.replace(wholeMatch, factValue);
    factorialPattern.lastIndex = 0; // Reset regex index after replace
  }

  // Now replace ^ with Math.pow
  // We'll convert expr with ^ to calls of Math.pow(a,b)
  // For simplicity, replace all a^b with Math.pow(a,b) - careful with operator precedence.

  function replacePowers(str) {
    // Replace simple powers like 2^3, or (1+1)^2 etc.
    // Use regex for a simple pattern: ([^()\s]+|\([^()]+\))\^([^()\s]+|\([^()]+\))
    // We will iteratively replace powers from right to left (to handle multiple powers correctly)

    // The regex used is simple and may not handle nested powers well.
    // For this project, assume expressions are simple.

    let powerRegex = /(\([^()]+\)|\d+(\.\d+)?|\w+)\^(\([^()]+\)|\d+(\.\d+)?|\w+)/g;
    while(powerRegex.test(str)) {
      str = str.replace(powerRegex, (match, base, _, exp) => `Math.pow(${base},${exp})`);
    }
    return str;
  }

  replacedExpr = replacePowers(replacedExpr);

  // Finally, evaluate safely with Math
  // Block any letters except Math and digits/operators
  if (/[^0-9+\-*/(). Mathpow]/.test(replacedExpr)) return null;

  let val = eval(replacedExpr);
  if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
    return val;
  }
  return null;
}

function renderButtons() {
  // Nothing dynamic here, buttons exist in HTML
  // Add event listeners
  buttonGrid.querySelectorAll('button').forEach(btn => {
    const val = btn.dataset.val;
    if (val) {
      btn.onclick = () => {
        if (val === '!' || val === '!!' || val === '!!!') {
          // Factorial requires something before it
          if (expression.length === 0) return;
          expression += val;
          updateExpression();
          return;
        }
        expression += val;
        updateExpression();
      };
    }
  });

  backspaceBtn.onclick = () => {
    if (expression.length === 0) return;

    // Remove last token (number or operator or factorial marks)
    // If last char is digit, remove digit(s) at end, and restore used dice
    // If last char is factorial mark !, remove them all (!!! or !! or !)
    // If last char is operator or parenthesis, remove one char

    // Handle factorials
    if (expression.endsWith('!!!')) {
      expression = expression.slice(0, -3);
      updateExpression();
      return;
    } else if (expression.endsWith('!!')) {
      expression = expression.slice(0, -2);
      updateExpression();
      return;
    } else if (expression.endsWith('!')) {
      expression = expression.slice(0, -1);
      updateExpression();
      return;
    }

    // Remove last character
    const lastChar = expression.slice(-1);
    expression = expression.slice(0, -1);

    // If last char was digit, remove full last number and restore dice
    if (/\d/.test(lastChar)) {
      // Remove full last number
      let i = expression.length - 1;
      while (i >= 0 && /\d/.test(expression[i])) i--;
      const removedNumber = expression.slice(i + 1);
      expression = expression.slice(0, i + 1);

      // Find dice that matches removedNumber and restore one usage
      const num = parseInt(removedNumber, 10);
      for (let d = 0; d < diceCount; d++) {
        if (diceValues[d] === num && usedDice[d]) {
          usedDice[d] = false;
          break;
        }
      }
    }

    updateExpression();
    renderDice();
  };

  clearBtn.onclick = () => {
    expression = '';
    usedDice = Array(diceCount).fill(false);
    updateExpression();
    renderDice();
  };

  submitBtn.onclick = () => {
    if (!expression) return alert('Enter an expression.');

    // Evaluate expression and check if uses all dice exactly once
    const numbersInExpr = expression.match(/\d+/g) || [];
    // Validate dice usage again
    let diceCountMap = {};
    diceValues.forEach(d => diceCountMap[d] = (diceCountMap[d] || 0) + 1);
    let exprCountMap = {};
    numbersInExpr.forEach(n => {
      const num = parseInt(n, 10);
      exprCountMap[num] = (exprCountMap[num] || 0) + 1;
    });
    let allUsed = Object.keys(diceCountMap).every(key => exprCountMap[key] === diceCountMap[key]) &&
                  Object.keys(exprCountMap).every(key => diceCountMap[key] === exprCountMap[key]);

    if (!allUsed) {
      alert('Expression must use all dice values exactly once.');
      return;
    }

    let val = evaluateAdvancedExpression(expression);
    if (val === null || isNaN(val)) {
      alert('Invalid expression.');
      return;
    }

    val = Math.round(val);

    if (val < 1 || val > 100) {
      alert('Result must be between 1 and 100.');
      return;
    }

    if (completedNumbers.has(val)) {
      alert(`Number ${val} is already completed this week.`);
      return;
    }

    completedNumbers.add(val);
    saveGameData();
    updateCompletedCount();
    showQu0xIfComplete();

    // Reset for next
    expression = '';
    usedDice = Array(diceCount).fill(false);
    updateExpression();
    renderDice();
  };
}

function saveGameData() {
  const key = `qu0x100_week_${currentWeekIndex}`;
  const data = {
    diceValues,
    completed: Array.from(completedNumbers)
  };
  localStorage.setItem(key, JSON.stringify(data));
}

function loadGameData() {
  const key = `qu0x100_week_${currentWeekIndex}`;
  const dataStr = localStorage.getItem(key);
  completedNumbers.clear();
  if (dataStr) {
    try {
      const data = JSON.parse(dataStr);
      if (data.diceValues && data.diceValues.length === diceCount) {
        diceValues = data.diceValues;
      } else {
        rollDice();
      }
      if (data.completed && Array.isArray(data.completed)) {
        data.completed.forEach(n => completedNumbers.add(n));
      }
    } catch {
      rollDice();
    }
  } else {
    rollDice();
  }
  usedDice = Array(diceCount).fill(false);
  expression = '';
  updateExpression();
  renderDice();
  updateCompletedCount();
  showQu0xIfComplete();
}

function updateCompletedCount() {
  completedCountSpan.textContent = completedNumbers.size;
  document.getElementById('weeklyCompleted').textContent = completedNumbers.size;
}

function showQu0xIfComplete() {
  const anim = document.getElementById('qu0xAnimation');
  if (completedNumbers.size === 100) {
    anim.classList.remove('hidden');
    setTimeout(() => anim.classList.add('hidden'), 3000);
  } else {
    anim.classList.add('hidden');
  }
}

weekSelect.addEventListener('change', () => {
  currentWeekIndex = parseInt(weekSelect.value, 10);
  gameNumberSpan.textContent = currentWeekIndex + 1;
  loadGameData();
});

window.onload = () => {
  populateWeekSelect();
  renderButtons();
};
