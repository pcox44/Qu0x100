// script.js

// Constants and variables
const startDate = new Date("2025-05-15");
const today = new Date();
const dayCount = Math.floor(
  (today - startDate) / (1000 * 60 * 60 * 24)
) + 1;

const diceColors = {
  1: { bg: "red", fg: "white" },
  2: { bg: "white", fg: "black" },
  3: { bg: "blue", fg: "white" },
  4: { bg: "yellow", fg: "black" },
  5: { bg: "green", fg: "white" },
  6: { bg: "black", fg: "yellow" },
};

const puzzles = [];
let currentDayIndex = 0;

const usedDice = new Set();
const usedDiceStack = [];

let expression = "";
let diceValues = [];

const dailyBestScores = {}; // dayIdx: score
const dailyBestSolutions = {}; // dayIdx: expression
const lockedDays = {}; // dayIdx: { locked: true, solution, date }

let qu0xCompletion = 0;

// DOM Elements
const daySelect = document.getElementById("daySelect");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const diceContainer = document.getElementById("diceContainer");
const expressionInput = document.getElementById("expressionInput");
const evaluationBox = document.getElementById("evaluationBox");
const submitButton = document.getElementById("submitBtn");
const lockedMsgDiv = document.getElementById("lockedMsg");
const targetNumberSpan = document.getElementById("targetNumber");
const archiveDiv = document.getElementById("archive");
const qu0xCompletionSpan = document.getElementById("qu0xCompletion");
const gamesCompletedSpan = document.getElementById("gamesCompleted");
const dailyBestScoreSpan = document.getElementById("dailyBestScore");

// Operators
const operators = ["+", "-", "*", "/", "^", "!", "(", ")"];

// Initialize puzzles for all days from startDate to today
function initPuzzles() {
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    // Seeded random for dice and target
    const seed = dateStr.split("-").join("");
    const random = mulberry32(Number(seed));

    // Generate 5 dice values 1-6
    const dice = [];
    for (let j = 0; j < 5; j++) {
      dice.push(1 + Math.floor(random() * 6));
    }

    // Target number 1-100 random
    const target = 1 + Math.floor(random() * 100);

    puzzles.push({ date, dateStr, dice, target });

    // Add option to dropdown
    const option = document.createElement("option");
    option.value = i;
    option.textContent = dateStr;
    daySelect.appendChild(option);
  }
}

// Simple seeded random generator
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Render dice on screen
function renderDice() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const die = document.createElement("div");
    die.classList.add("die");
    die.textContent = val;
    const c = diceColors[val];
    die.style.backgroundColor = c.bg;
    die.style.color = c.fg;
    die.style.border = "2px solid black";
    die.dataset.index = i;
    if (usedDice.has(i)) {
      die.style.opacity = "0.3";
      die.style.pointerEvents = "none";
    } else {
      die.style.opacity = "1";
      die.style.pointerEvents = "auto";
      die.onclick = () => {
        if (isDayLocked()) return;
        addDiceToExpression(i);
      };
    }
    diceContainer.appendChild(die);
  });
}

// Add dice number to expression if not used
function addDiceToExpression(dieIndex) {
  if (usedDice.has(dieIndex)) return;
  const val = diceValues[dieIndex];
  expression += val.toString();
  usedDice.add(dieIndex);
  usedDiceStack.push(dieIndex);
  updateExpression();
}

// Add operator to expression
function addOperator(op) {
  if (isDayLocked()) return;
  expression += op;
  updateExpression();
}

// Backspace removes last character or dice and restores dice if dice removed
function backspace() {
  if (isDayLocked()) return;
  if (expression.length === 0) return;

  // Check last char
  const lastChar = expression.slice(-1);

  // If lastChar is a digit, restore dice usage if it matches dice value at top of usedDiceStack
  if (/\d/.test(lastChar)) {
    if (usedDiceStack.length > 0) {
      const lastUsedDice = usedDiceStack.pop();
      usedDice.delete(lastUsedDice);
    }
  }

  expression = expression.slice(0, -1);
  updateExpression();
}

// Clear all expression and restore dice usage
function clearAll() {
  if (isDayLocked()) return;
  expression = "";
  usedDice.clear();
  usedDiceStack.length = 0;
  updateExpression();
}

// Update expression input and evaluation box
function updateExpression() {
  expressionInput.value = expression;
  evaluateExpressionLive();
  renderDice();
}

// Evaluate expression live, update evaluationBox
function evaluateExpressionLive() {
  if (expression.trim() === "") {
    evaluationBox.textContent = "?";
    return;
  }

  try {
    // Validate expression uses only allowed characters (digits, operators, parentheses)
    if (!/^[0-9+\-*/^!() ]*$/.test(expression)) {
      evaluationBox.textContent = "?";
      return;
    }

    // Replace × and ÷ with * and /
    let expr = expression.replace(/×/g, "*").replace(/÷/g, "/");

    // Evaluate factorial (!) manually because JS eval doesn't support it
    expr = replaceFactorials(expr);

    // Evaluate with Function constructor (safer than eval)
    const func = new Function(`return (${expr})`);
    const result = func();

    if (typeof result === "number" && Number.isFinite(result)) {
      evaluationBox.textContent = Math.round(result);
    } else {
      evaluationBox.textContent = "?";
    }
  } catch {
    evaluationBox.textContent = "?";
  }
}

// Replace factorial in expression, e.g. 3! or (2+1)!
function replaceFactorials(expr) {
  // Regex to find factorial patterns: number or parenthesized expression followed by !
  // We'll replace "x!" with "factorial(x)"
  return expr.replace(/(\d+|\([^\(\)]+\))!/g, (_, match) => {
    return `factorial(${match})`;
  });
}

// Factorial function for integers only
function factorial(n) {
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
    throw new Error("Invalid factorial input");
  }
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Submit expression for current day
function submitExpression() {
  if (isDayLocked()) return;

  // Must use all 5 dice exactly once
  if (usedDice.size !== 5) {
    alert("You must use all 5 dice exactly once!");
    return;
  }

  // Evaluate expression value (integer only)
  if (evaluationBox.textContent === "?" || expression.trim() === "") {
    alert("Invalid Submission");
    return;
  }

  const val = Number(evaluationBox.textContent);
  if (!Number.isInteger(val)) {
    alert("Result must be a whole number");
    return;
  }

  const target = puzzles[currentDayIndex].target;
  const score = Math.abs(target - val);

  // Update best score if better
  if (
    !(currentDayIndex in dailyBestScores) ||
    score < dailyBestScores[currentDayIndex]
  ) {
    dailyBestScores[currentDayIndex] = score;
    dailyBestSolutions[currentDayIndex] = expression;

    if (score === 0) {
      // Qu0x! perfect
      lockedDays[currentDayIndex] = {
        locked: true,
        solution: expression,
        date: puzzles[currentDayIndex].dateStr,
      };
      qu0xCompletion++;
      alert("🎉 Qu0x! Perfect score achieved. This day is now locked.");
    } else {
      alert(`Good try! Your score is ${score}. Keep trying!`);
    }
  } else {
    alert(
      `Your score is ${score}. Try to beat your best score of ${dailyBestScores[currentDayIndex]}.`
    );
  }

  updateArchive();
  updateDropdownOptions();
  renderLockedState();
}

// Check if current day is locked
function isDayLocked() {
  return lockedDays[currentDayIndex] && lockedDays[currentDayIndex].locked;
}

// Render locked day state (disable inputs, show message)
function renderLockedState() {
  if (isDayLocked()) {
    lockedMsgDiv.style.display = "block";
    submitButton.disabled = true;
    clearAll();
    expressionInput.disabled = true;
    diceContainer.style.pointerEvents = "none";
  } else {
    lockedMsgDiv.style.display = "none";
    submitButton.disabled = false;
    expressionInput.disabled = false;
    diceContainer.style.pointerEvents = "auto";
  }
}

// Populate dropdown emoji marks based on day status
function updateDropdownOptions() {
  for (let i = 0; i < daySelect.options.length; i++) {
    const option = daySelect.options[i];
    if (lockedDays[i] && lockedDays[i].locked) {
      option.textContent = puzzles[i].dateStr + " ★"; // Qu0x locked
    } else if (dailyBestScores[i] !== undefined) {
      option.textContent = puzzles[i].dateStr + " ✓"; // solved but not locked
    } else {
      option.textContent = puzzles[i].dateStr; // unsolved
    }
  }
}

// Update archive display of last 5 results
function updateArchive() {
  archiveDiv.innerHTML = "<h3>Last 5 Results</h3>";
  const solvedDays = Object.keys(dailyBestScores)
    .map((i) => Number(i))
    .sort((a, b) => b - a)
    .slice(0, 5);

  solvedDays.forEach((dayIdx) => {
    const div = document.createElement("div");
    const lockedMark = lockedDays[dayIdx]?.locked ? " (Locked)" : "";
    div.textContent = `${puzzles[dayIdx].dateStr}: Score ${dailyBestScores[dayIdx]}${lockedMark}, Solution: ${dailyBestSolutions[dayIdx]}`;
    archiveDiv.appendChild(div);
  });

  qu0xCompletionSpan.textContent = qu0xCompletion;
  gamesCompletedSpan.textContent = Object.keys(dailyBestScores).length;

  // Daily Best Score for current day
  if (dailyBestScores[currentDayIndex] !== undefined) {
    dailyBestScoreSpan.textContent = dailyBestScores[currentDayIndex];
  } else {
    dailyBestScoreSpan.textContent = "-";
  }
}

// Load puzzle for current day index
function loadDay(index) {
  if (index < 0 || index >= puzzles.length) return;
  currentDayIndex = index;

  diceValues = [...puzzles[index].dice];
  expression = "";
  usedDice.clear();
  usedDiceStack.length = 0;

  targetNumberSpan.textContent = puzzles[index].target;
  daySelect.value = index;

  updateExpression();
  renderLockedState();
  updateArchive();
}

// Navigation handlers
function prevDay() {
  if (currentDayIndex > 0) {
    loadDay(currentDayIndex - 1);
  }
}

function nextDay() {
  if (currentDayIndex < puzzles.length - 1) {
    loadDay(currentDayIndex + 1);
  }
}

// Setup operator buttons events
function setupOperatorButtons() {
  document.querySelectorAll(".opBtn").forEach((btn) => {
    btn.onclick = () => {
      addOperator(btn.textContent);
    };
  });

  document.getElementById("backspaceBtn").onclick = backspace;
  document.getElementById("clearBtn").onclick = clearAll;
  submitButton.onclick = submitExpression;
  daySelect.onchange = () => loadDay(Number(daySelect.value));
  prevBtn.onclick = prevDay;
  nextBtn.onclick = nextDay;
}

// Initialization
function init() {
  initPuzzles();
  setupOperatorButtons();
  loadDay(dayCount - 1); // Load today by default
}

init();
