const diceContainer = document.getElementById("dice-container");
const operatorRow = document.getElementById("operator-row");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("output-box");
const submitBtn = document.getElementById("submit-btn");
const bestScoreText = document.getElementById("best-score");
const qu0xMasterText = document.getElementById("qu0x-master");
const qu0xFractionText = document.getElementById("qu0x-fraction");
const popup = document.getElementById("qu0x-popup");
const dateDisplay = document.getElementById("date-display");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

let usedDice = [];
let expression = "";
let dice = [];
let target = 0;
let currentDate = new Date();

const startDate = new Date("2025-05-15T00:00:00");
const today = new Date();
today.setHours(0, 0, 0, 0);

// Seeded random generator based on date seed
function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function getSeedForDate(date) {
  return parseInt(
    date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0")
  );
}

function rollDice(seed) {
  const rng = seedRandom(seed);
  const rolled = [];
  for (let i = 0; i < 5; i++) {
    rolled.push(Math.floor(rng() * 6) + 1);
  }
  return rolled;
}

function generateTarget(seed) {
  const rng = seedRandom(seed);
  return Math.floor(rng() * 100) + 1;
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((value, index) => {
    const die = document.createElement("div");
    die.className = `die die-${value}`;
    die.textContent = value;
    die.dataset.id = index;

    if (usedDice.includes(index)) {
      die.classList.add("used");
      die.style.pointerEvents = "none";
      die.style.opacity = "0.3";
    } else {
      die.classList.remove("used");
      die.style.pointerEvents = "auto";
      die.style.opacity = "1";
      die.onclick = () => {
        appendToExpression(value, index);
        // fade out animation
        die.style.transition = "opacity 0.4s ease";
        die.style.opacity = "0.3";
        die.style.pointerEvents = "none";
      };
    }
    diceContainer.appendChild(die);
  });
}

function renderOperators() {
  operatorRow.innerHTML = "";
  const ops = ["+", "-", "*", "/", "(", ")", "^", "!"];
  ops.forEach((op) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = op;
    btn.onclick = () => appendToExpression(op);
    operatorRow.appendChild(btn);
  });

  // Backspace button
  const backBtn = document.createElement("button");
  backBtn.className = "btn";
  backBtn.textContent = "⌫";
  backBtn.onclick = backspace;
  operatorRow.appendChild(backBtn);

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.className = "btn";
  clearBtn.textContent = "Clear";
  clearBtn.onclick = clearExpression;
  operatorRow.appendChild(clearBtn);
}

function appendToExpression(value, dieIndex = null) {
  if (dieIndex !== null && usedDice.includes(dieIndex)) {
    return; // prevent reuse of the same die
  }
  // For dice values, add parentheses if last token was a number or factorial to avoid concatenation
  const lastChar = expression.slice(-1);
  if (
    typeof value === "number" &&
    ((lastChar >= "0" && lastChar <= "9") || lastChar === "!")
  ) {
    // don't allow concatenation of dice numbers
    return;
  }

  expression += value.toString();
  expressionBox.textContent = expression;

  if (dieIndex !== null) {
    usedDice.push(dieIndex);
    renderDice();
  }
  evaluateExpression();
}

function evaluateExpression() {
  if (!expression) {
    outputBox.textContent = "";
    return;
  }
  try {
    const val = evaluate(expression);
    outputBox.textContent = val !== undefined ? val : "";
  } catch {
    outputBox.textContent = "Error";
  }
}

function backspace() {
  if (!expression) return;

  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  expressionBox.textContent = expression;

  // If lastChar is a die number, free it up
  if ("123456".includes(lastChar)) {
    // Remove die from usedDice corresponding to that value & first occurrence
    // Because dice can be duplicates, remove the usedDice for the earliest die with that value
    for (let i = 0; i < usedDice.length; i++) {
      if (dice[usedDice[i]].toString() === lastChar) {
        usedDice.splice(i, 1);
        break;
      }
    }
    renderDice();
  }

  evaluateExpression();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  expressionBox.textContent = "";
  outputBox.textContent = "";
  renderDice();
}

function evaluate(expr) {
  // Evaluate factorials, parentheses, exponentiation properly.
  // Simple safe eval substitute with factorial support

  // Replace factorial ! with function calls
  function factorial(n) {
    if (n < 0 || n % 1 !== 0) throw new Error("Invalid factorial");
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  // Replace all factorial instances, e.g., 3! or (2+1)!
  // Using RegExp with recursion is complex, so a workaround:
  // We'll parse from left to right, find ! and evaluate left-side expression.

  let replaced = expr;
  const factRegex = /(\([^()]+\)|\d+)!/g;

  // This regex matches digits or expressions in parentheses immediately followed by !

  replaced = replaced.replace(factRegex, (match, g1) => {
    try {
      // evaluate the inside expression g1 recursively
      let val = Function(`"use strict";return (${g1})`)();
      let f = factorial(val);
      return f.toString();
    } catch {
      throw new Error("Invalid factorial");
    }
  });

  // Now safely evaluate replaced expression with Function (only math ops)
  // Disallow letters for security

  if (/[^0-9+\-*/().^ ]/.test(replaced)) {
    throw new Error("Invalid characters");
  }

  // Replace ^ with ** for exponentiation in JS
  replaced = replaced.replace(/\^/g, "**");

  return Function(`"use strict";return (${replaced})`)();
}

function renderDate() {
  const y = currentDate.getFullYear();
  const m = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const d = currentDate.getDate().toString().padStart(2, "0");
  dateDisplay.textContent = `Game Date: ${y}-${m}-${d}`;
}

function loadGame(date) {
  currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);
  renderDate();

  const seed = getSeedForDate(currentDate);

  dice = rollDice(seed);
  target = generateTarget(seed + 999); // different seed for target

  usedDice = [];
  expression = "";
  expressionBox.textContent = "";
  outputBox.textContent = "";
  bestScoreText.textContent = "";
  qu0xMasterText.textContent = "";

  renderDice();
  renderOperators();
  renderQu0xCompletion();

  // Show target in best-score area for now
  bestScoreText.textContent = `Target: ${target}`;

  updateNavButtons();
}

function updateNavButtons() {
  const earliest = startDate.getTime();
  const latest = today.getTime();
  prevBtn.disabled = currentDate.getTime() <= earliest;
  nextBtn.disabled = currentDate.getTime() >= latest;
}

function renderQu0xCompletion() {
  // Get from localStorage
  const completed = JSON.parse(localStorage.getItem("qu0xCompleted") || "{}");
  const totalGames = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
  );

  const completedCount = Object.keys(completed).length;

  // Display as proper fraction with horizontal vinculum
  // Example: 5/20

  qu0xFractionText.textContent = `${completedCount} / ${totalGames}`;
}

function showPopup(text) {
  popup.textContent = text;
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

function submitExpression() {
  // Check if all dice used exactly once
  if (usedDice.length !== dice.length) {
    alert("You must use all dice exactly once!");
    return;
  }

  // Evaluate final expression
  let val;
  try {
    val = evaluate(expression);
  } catch {
    alert("Invalid expression!");
    return;
  }

  const diff = Math.abs(val - target);
  bestScoreText.textContent = `Your result: ${val}, Target: ${target}, Difference: ${diff}`;

  // Save best score to localStorage by date key (yyyymmdd)
  const key = getSeedForDate(currentDate).toString();

  const bestScores = JSON.parse(localStorage.getItem("bestScores") || "{}");
  if (!bestScores[key] || bestScores[key] > diff) {
    bestScores[key] = diff;
    localStorage.setItem("bestScores", JSON.stringify(bestScores));
  }

  if (diff === 0) {
    // Qu0x achieved! Lock the day (disable submit)
    alert("Qu0x! Perfect score achieved!");
    showPopup("Qu0x!");
    lockDay(key);
    updateQu0xMaster();
  }

  renderQu0xCompletion();
}

function lockDay(key) {
  // Mark day as locked in localStorage
  const locked = JSON.parse(localStorage.getItem("lockedDays") || "{}");
  locked[key] = true;
  localStorage.setItem("lockedDays", JSON.stringify(locked));

  submitBtn.disabled = true;
  // Optionally disable dice and operators too
  diceContainer.querySelectorAll(".die").forEach((die) => (die.onclick = null));
  operatorRow.querySelectorAll(".btn").forEach((btn) => (btn.disabled = true));
}

function isDayLocked(key) {
  const locked = JSON.parse(localStorage.getItem("lockedDays") || "{}");
  return !!locked[key];
}

function updateQu0xMaster() {
  // Sum of today's best scores or "N/A" if not all solved
  const bestScores = JSON.parse(localStorage.getItem("bestScores") || "{}");
  const totalGames = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
  );

  if (Object.keys(bestScores).length < totalGames) {
    qu0xMasterText.textContent = "Qu0x Master Score: N/A";
    return;
  }

  let sum = 0;
  for (let i = 0; i < totalGames; i++) {
    const key = getSeedForDate(new Date(startDate.getTime() + i * 86400000)).toString();
    sum += bestScores[key] || 0;
  }
  qu0xMasterText.textContent = `Qu0x Master Score: ${sum}`;
}

// Navigation buttons
prevBtn.onclick = () => {
  currentDate = new Date(currentDate.getTime() - 86400000);
  loadGame(currentDate);
};

nextBtn.onclick = () => {
  currentDate = new Date(currentDate.getTime() + 86400000);
  loadGame(currentDate);
};

submitBtn.onclick = () => {
  const key = getSeedForDate(currentDate).toString();
  if (isDayLocked(key)) {
    alert("This day's puzzle is locked because you already achieved a Qu0x!");
    return;
  }
  submitExpression();
};

// Initial load
loadGame(today);
updateQu0xMaster();
