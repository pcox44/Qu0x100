// script.js

// Your existing variables and setup here
let diceValues = [1, 2, 3, 4, 5];  // Example dice values, update as needed
let usedDice = [];
let expression = "";

// Factorial function
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Process factorials in expression (supports multiple factorials like !!)
function processFactorials(expr) {
  return expr.replace(/(\d+|\([^()]+\))(!+)/g, (match, base, bangs) => {
    let result = base;
    for (let i = 0; i < bangs.length; i++) {
      result = `factorial(${result})`;
    }
    return result;
  });
}

// Update the dice display, fading used dice
function updateDiceDisplay() {
  const diceContainer = document.getElementById('dice-container');
  diceContainer.innerHTML = '';

  diceValues.forEach((value, idx) => {
    const die = document.createElement('div');
    die.classList.add('die');
    die.textContent = value;

    // Fade dice if used
    if (usedDice.includes(idx)) {
      die.classList.add('used', 'fade');
    } else {
      die.classList.remove('fade');
    }

    die.addEventListener('click', () => {
      if (!usedDice.includes(idx)) {
        // Add die to usedDice and update expression
        usedDice.push(idx);
        expression += value.toString();
        updateDisplay();
      }
    });

    diceContainer.appendChild(die);
  });
}

// Update the expression display and evaluate
function updateDisplay() {
  const expressionDisplay = document.getElementById('expression-display');
  const resultDisplay = document.getElementById('result-display');

  expressionDisplay.textContent = expression;

  if (expression === '') {
    resultDisplay.textContent = '';
    return;
  }

  try {
    // Prepare expression for eval
    let safeExpression = expression.replace(/\^/g, '**').replace(/[^-()\d/*+.!^]/g, '');
    safeExpression = processFactorials(safeExpression);

    // Evaluate expression with factorial support
    const val = Function('factorial', `return ${safeExpression}`)(factorial);

    if (val === undefined || val === null || Number.isNaN(val)) {
      resultDisplay.textContent = '?';
    } else {
      resultDisplay.textContent = val;
    }
  } catch {
    resultDisplay.textContent = '?';
  }
}

// Submit expression (on Enter or submit button)
function submitExpression() {
  if (expression === '') return;

  try {
    let safeExpression = expression.replace(/\^/g, '**').replace(/[^-()\d/*+.!^]/g, '');
    safeExpression = processFactorials(safeExpression);

    const val = Function('factorial', `return ${safeExpression}`)(factorial);

    if (val === undefined || val === null || Number.isNaN(val)) {
      alert('Invalid expression');
      return;
    }

    // Handle submission logic (score checking, etc)
    alert(`Result: ${val}`);

  } catch {
    alert('Invalid expression');
  }
}

// Backspace function to remove last character and update dice usage
function backspace() {
  if (expression.length === 0) return;

  // Remove last character
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Check if lastChar is a digit matching a used die and remove from usedDice accordingly
  // We'll try to remove the last used die that matches lastChar
  for (let i = usedDice.length - 1; i >= 0; i--) {
    if (diceValues[usedDice[i]].toString() === lastChar) {
      usedDice.splice(i, 1);
      break;
    }
  }

  updateDisplay();
  updateDiceDisplay();
}

// Clear the entire expression and reset used dice
function clearExpression() {
  expression = '';
  usedDice = [];
  updateDisplay();
  updateDiceDisplay();
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  updateDiceDisplay();

  // Bind buttons
  document.getElementById('backspace-btn').addEventListener('click', backspace);
  document.getElementById('clear-btn').addEventListener('click', clearExpression);
  document.getElementById('submit-btn').addEventListener('click', submitExpression);
});
