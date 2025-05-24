// Constants for dice colors and their classes
const diceColors = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
};

const weekSelect = document.getElementById("weekSelect");
const diceContainer = document.getElementById("diceContainer");
const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const submitBtn = document.getElementById("submitBtn");
const backspaceBtn = document.getElementById("backspaceBtn");
const clearBtn = document.getElementById("clearBtn");
const counterBox = document.getElementById("counterBox");
const gridContainer = document.getElementById("gridContainer");
const gameNumberDisplay = document.getElementById("gameNumber");

const buttonGrid = document.getElementById("buttonGrid");

// Operation buttons: + - * / ^ ! ( ) Back Clear
const operationButtons = Array.from(buttonGrid.querySelectorAll("button"));

// State variables
let diceValues = [];
let diceUsed = [];
let expression = "";
let usedDiceIndices = new Set();

let solvedNumbers = new Set();

let currentWeekIndex = 0;

function getMondays(start, end) {
  // Return array of Mondays from start date to end date inclusive
  const mondays = [];
  let d = new Date(start);
  d.setHours(0, 0, 0, 0);

  // Adjust to first Monday on or after start
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }

  while (d <= end) {
    mondays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

function formatDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function seedDice(seedDate) {
  // Simple deterministic PRNG based on date string for consistent dice
  const seed = seedDate.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  // Generate 5 dice numbers 1-6
  const vals = [];
  let state = hash;
  for (let i = 0; i < 5; i++) {
    state = (state * 9301 + 49297) % 233280;
    vals.push((state % 6) + 1);
  }
  return vals;
}

function populateWeekSelect() {
  const firstMonday = new Date(2025, 4, 11); // May 11, 2025
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mondays = getMondays(firstMonday, today);
  mondays.forEach((monday, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Week ${i + 1} - ${formatDate(monday)}`;
    weekSelect.appendChild(option);
  });

  // Default to current week
  const defaultWeek = mondays.length - 1;
  weekSelect.value = defaultWeek >= 0 ? defaultWeek : 0;
  currentWeekIndex = parseInt(weekSelect.value);
}

function saveProgress() {
  if (typeof localStorage === "undefined") return;
  const key = `qu0x100_week_${currentWeekIndex}`;
  const data = {
    solvedNumbers: Array.from(solvedNumbers),
  };
  localStorage.setItem(key, JSON.stringify(data));
}

function loadProgress() {
  if (typeof localStorage === "undefined") return;
  const key = `qu0x100_week_${currentWeekIndex}`;
  const dataStr = localStorage.getItem(key);
  if (dataStr) {
    const data = JSON.parse(dataStr);
    solvedNumbers = new Set(data.solvedNumbers || []);
  } else {
    solvedNumbers = new Set();
  }
}

function resetExpression() {
  expression = "";
  usedDiceIndices.clear();
  updateExpressionDisplay();
  updateDiceFades();
  evaluationBox.textContent = "?";
}

function updateDiceFades() {
  // fade dice that are used (unusable, semi-transparent)
  const diceElements = diceContainer.querySelectorAll(".die");
  diceElements.forEach((dieEl, idx) => {
    if (usedDiceIndices.has(idx)) {
      dieEl.classList.add("faded");
    } else {
      dieEl.classList.remove("faded");
    }
  });
}

function updateExpressionDisplay() {
  expressionBox.textContent = expression;
  evaluateExpressionLive();
}

function evaluateExpressionLive() {
  if (expression.length === 0) {
    evaluationBox.textContent = "?";
    return;
  }
  try {
    // Replace factorials and safely evaluate
    const val = safeEval(expression);
    if (val === undefined || val === null || isNaN(val)) {
      evaluationBox.textContent = "?";
    } else {
      evaluationBox.textContent = val;
    }
  } catch {
    evaluationBox.textContent = "?";
  }
}

// Evaluate expression with factorials and double/triple factorial support
function safeEval(expr) {
  // Remove spaces
  expr = expr.replace(/\s+/g, "");

  // Validate allowed characters only (digits, + - * / ^ ! ( ) )
  if (!/^[0-9+\-*/^!()]+$/.test(expr)) {
    throw new Error("Invalid characters");
  }

  // Parse factorials (!! and !!! supported)
  // Replace n!!! with tripleFactorial(n), n!! with doubleFactorial(n), n! with factorial(n)
  // Use regex to handle these properly

  // Replace triple factorial first (n!!!)
  expr = expr.replace(/(\d+)(!!!)/g, (_, n) => {
    return `tripleFactorial(${n})`;
  });

  // Replace double factorial (n!!)
  expr = expr.replace(/(\d+)(!!)/g, (_, n) => {
    return `doubleFactorial(${n})`;
  });

  // Replace single factorial (n!)
  // Avoid replacing factorial in triple/double factorial handled above
  expr = expr.replace(/(\d+)!/g, (_, n) => {
    return `factorial(${n})`;
  });

  // Also handle factorial for expressions in parentheses like (2+1)!
  // Replace pattern: (expr)!
  expr = expr.replace(/\(([^()]+)\)!/g, (_, innerExpr) => {
    return `factorial((${innerExpr}))`;
  });

  // Create a function with safe math functions
  // eslint-disable-next-line no-new-func
  const f = new Function(
    "factorial",
    "doubleFactorial",
    "tripleFactorial",
    `return ${expr};`
  );

  return f(factorial, doubleFactorial, tripleFactorial);
}

function factorial(n) {
  n = Math.floor(n);
  if (n < 0) throw new Error("Negative factorial");
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

function doubleFactorial(n) {
  n = Math.floor(n);
  if (n < 0) throw new Error("Negative double factorial");
  if (n === 0 || n === -1) return 1;
  let res = 1;
  for (let i = n; i > 0; i -= 2) {
    res *= i;
  }
  return res;
}

function tripleFactorial(n) {
  n = Math.floor(n);
  if (n < 0) throw new Error("Negative triple factorial");
  if (n === 0 || n === -1 || n === -2) return 1;
  let res = 1;
  for (let i = n; i > 0; i -= 3) {
    res *= i;
  }
  return res;
}

function createDice() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `die ${diceColors[val]}`;
    die.textContent = val;
    die.dataset.index = i;
    die.tabIndex = 0;
    die.setAttribute("role", "button");
    die.setAttribute("aria-pressed", "false");
    die.title = `Dice value ${val}`;
    die.addEventListener("click", () => {
      if (usedDiceIndices.has(i)) return;
      usedDiceIndices.add(i);
      expression += val;
      updateExpressionDisplay();
      updateDiceFades();
    });
    diceContainer.appendChild(die);
  });
  updateDiceFades();
}

function createGrid() {
  gridContainer.innerHTML = "";
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    cell.classList.add("grid-number");
    cell.textContent = i;
    if (solvedNumbers.has(i)) {
      cell.classList.add("solved");
    }
    gridContainer.appendChild(cell);
  }
}

function updateCounter() {
  counterBox.textContent = `${solvedNumbers.size} / 100`;
}

function setGameNumber() {
  gameNumberDisplay.textContent = currentWeekIndex + 1;
}

function initWeek(weekIndex) {
  currentWeekIndex = weekIndex;

  // Seed dice for week
  const firstMonday = new Date(2025, 4, 11);
  const mondays = getMondays(firstMonday, new Date());
  const seedDate = mondays[weekIndex];
  diceValues = seedDice(seedDate);
  usedDiceIndices.clear();
  expression = "";
  solvedNumbers = new Set();
  loadProgress();

  setGameNumber();
  createDice();
  createGrid();
  updateCounter();
  resetExpression();
}

function backspace() {
  if (expression.length === 0) return;

  // Remove last character, if it's a dice number, remove from usedDiceIndices the corresponding die (last used dice number)
  // Because dice are used exactly once and only by clicking dice, numbers in expression always match dice numbers used in order clicked.

  // Find last dice number used from right
  let lastDiceIndex = -1;

  // We have no direct tracking of dice order in expression, but since dice values are unique per dice,
  // We can find from right to left the last dice number and remove its usedDiceIndices

  // We'll track dice usage order by maintaining a list of used dice indices in insertion order
  // For now, let's track dice usage order by expression scanning from right:

  // Since expression can have digits, operators, parentheses, factorials, etc., but dice numbers are single digits 1-6
  // We'll remove last dice number (digit) from right in expression that matches a used dice index.

  for (let i = expression.length - 1; i >= 0; i--) {
    const ch = expression[i];
    if (ch >= "1" && ch <= "6") {
      // Find dice with that value and is used and closest to the rightmost in usedDiceIndices
      // We assume dice usage order is in order of usage in usedDiceIndices insertion order. We need to track usage order.

      // We'll track usage order explicitly below.
      break;
    }
  }

  // To properly handle backspace with dice used, track dice usage order separately
  if (diceUsageOrder.length === 0) {
    // No dice used
    // Just remove last char
    expression = expression.slice(0, -1);
    updateExpressionDisplay();
    return;
  }

  // Remove last dice from usage order
  const lastUsedDieIndex = diceUsageOrder.pop();
  usedDiceIndices.delete(lastUsedDieIndex);

  // Remove last dice value character from expression from right
  // The last dice value is diceValues[lastUsedDieIndex]
  // Remove last occurrence of that digit from the end of expression

  const dieVal = diceValues[lastUsedDieIndex].toString();

  // Find last index of dieVal in expression from right
  let idx = expression.lastIndexOf(dieVal);
  if (idx !== -1) {
    expression =
      expression.slice(0, idx) + expression.slice(idx + 1);
  } else {
    // Should never happen, but fallback:
    expression = expression.slice(0, -1);
  }

  updateDiceFades();
  updateExpressionDisplay();
}

function clearAll() {
  resetExpression();
  diceUsageOrder = [];
  updateDiceFades();
}

function addOperation(value) {
  expression += value;
  updateExpressionDisplay();
}

// Track dice usage order to support proper backspace
let diceUsageOrder = [];

function diceClicked(index) {
  if (usedDiceIndices.has(index)) return;
  usedDiceIndices.add(index);
  diceUsageOrder.push(index);
  expression += diceValues[index];
  updateExpressionDisplay();
  updateDiceFades();
}

function setupDiceClicks() {
  const diceEls = diceContainer.querySelectorAll(".die");
  diceEls.forEach((die) => {
    die.addEventListener("click", () => {
      const idx = Number(die.dataset.index);
      diceClicked(idx);
    });
  });
}

function submitExpression() {
  if (expression.length === 0) {
    alert("Enter an expression before submitting!");
    return;
  }

  // Validate expression uses all 5 dice exactly once
  if (usedDiceIndices.size !== 5) {
    alert("You must use all five dice values exactly once!");
    return;
  }

  try {
    const val = safeEval(expression);
    if (
      val === undefined ||
      val === null ||
      isNaN(val) ||
      !Number.isFinite(val)
    ) {
      alert("Invalid expression result.");
      return;
    }
    const rounded = Math.round(val);

    if (rounded < 1 || rounded > 100) {
      alert("Result must be between 1 and 100 inclusive.");
      return;
    }

    if (solvedNumbers.has(rounded)) {
      alert(`Number ${rounded} already solved this week!`);
      return;
    }

    // Mark solved
    solvedNumbers.add(rounded);
    saveProgress();

    // Update grid UI
    const cells = gridContainer.querySelectorAll(".grid-number");
    cells.forEach((cell) => {
      if (parseInt(cell.textContent) === rounded) {
        cell.classList.add("solved");
      }
    });

    // Clear expression & dice usage for next number
    expression = "";
    usedDiceIndices.clear();
    diceUsageOrder = [];
    updateDiceFades();
    updateExpressionDisplay();
    updateCounter();

    alert(`Success! You solved number ${rounded}.`);

  } catch (e) {
    alert("Invalid expression: " + e.message);
  }
}

function saveProgress() {
  const key = `qu0x100_week_${currentWeekIndex}`;
  const arr = Array.from(solvedNumbers);
  localStorage.setItem(key, JSON.stringify(arr));
}

function loadProgress() {
  solvedNumbers.clear();
  const key = `qu0x100_week_${currentWeekIndex}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    const arr = JSON.parse(saved);
    arr.forEach((num) => solvedNumbers.add(num));
  }
}

// Utility to get all Mondays from start to now
function getMondays(start, end) {
  const mondays = [];
  const date = new Date(start);
  date.setHours(0, 0, 0, 0);
  while (date <= end) {
    if (date.getDay() === 1) {
      mondays.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return mondays;
}

// Seed dice from date with a simple seeded RNG
function seedDice(date) {
  // Simple seed based on date string YYYYMMDD
  const seedStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  let seed = Number(seedStr);

  function rng() {
    // Simple linear congruential generator
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const vals = [];
  while (vals.length < 5) {
    const val = Math.floor(rng() * 6) + 1;
    vals.push(val);
  }
  return vals;
}

// Event listeners for buttons
backspaceBtn.addEventListener("click", backspace);
clearBtn.addEventListener("click", clearAll);
submitBtn.addEventListener("click", submitExpression);
prevWeekBtn.addEventListener("click", () => {
  if (currentWeekIndex > 0) {
    initWeek(currentWeekIndex - 1);
  }
});
nextWeekBtn.addEventListener("click", () => {
  if (currentWeekIndex < mondays.length - 1) {
    initWeek(currentWeekIndex + 1);
  }
});
monthYearSelect.addEventListener("change", (e) => {
  const idx = Number(e.target.value);
  if (!isNaN(idx) && idx >= 0 && idx < mondays.length) {
    initWeek(idx);
  }
});

window.addEventListener("load", () => {
  mondays = getMondays(new Date(2025, 4, 11), new Date());
  // Populate monthYearSelect
  mondays.forEach((date, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    monthYearSelect.appendChild(opt);
  });
  // Default to last week available
  initWeek(mondays.length - 1);
});
</script>

</body>
</html>
