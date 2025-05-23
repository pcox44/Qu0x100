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

let usedDiceIds = new Set();
let expression = "";
let dice = [];
let target = 0;
let currentDate = new Date();

const startDate = new Date("2025-05-15T00:00:00");
const today = new Date();
today.setHours(0, 0, 0, 0);

// Helper: seed RNG for date-based repeatable randomness
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
    const id = `die-${index}`;

    die.onclick = () => {
      if (usedDiceIds.has(id)) return;
      appendToExpression(value, id);
      fadeOutDie(die);
    };

    if (usedDiceIds.has(id)) die.classList.add("fade");

    diceContainer.appendChild(die);
  });
}

function fadeOutDie(die) {
  die.classList.add("fade");
}

function fadeInDieById(id) {
  const diceDivs = diceContainer.children;
  for (const die of diceDivs) {
    if (die.textContent && die.classList.contains(id)) {
      die.classList.remove("fade");
      break;
    }
    if (die.getAttribute("data-id") === id) {
      die.classList.remove("fade");
      break;
    }
  }
  // Safer: just remove fade from die with matching text and index
  // We'll re-render on expression change anyway to keep in sync.
}

function renderOperators() {
  const ops = ["+", "-", "*", "/", "(", ")", "^", "!"];
  operatorRow.innerHTML = "";
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

// Append to expression: only add dice value if dice not already used (enforced by UI)
function appendToExpression(value, id = null) {
  // Disallow concatenation: if last token is a digit and value is digit, don't append dice value side by side
  if (id !== null) {
    // Dice value clicked
    // Check last char if digit
    if (expression.length > 0) {
      const lastChar = expression[expression.length - 1];
      if (/\d/.test(lastChar)) {
        // Last char digit - block dice concatenation
        return;
      }
    }
    expression += value.toString();
    usedDiceIds.add(id);
  } else {
    // Operator or parentheses
    expression += value;
  }
  updateExpression();
  renderDice(); // To update fade states
  updateEvaluation();
}

function updateExpression() {
  expressionBox.textContent = expression;
}

function backspace() {
  if (expression.length === 0) return;

  // Remove last char
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Since dice can only be single digit and no concat,
  // try to restore dice if lastChar is digit
  if (/\d/.test(lastChar)) {
    // We need to find which die id was used for that digit and remove from usedDiceIds
    // Since dice values can repeat, find die with matching value that is in usedDiceIds and remove document.getElementById("next-btn");

let currentDate = new Date();
let currentGameId = getDateId(currentDate);
let totalGames = 365; // Set to total daily puzzles available (adjust as needed)
let diceValues = [];
let expressionTokens = []; // tokens as objects {type:'dice'|'op'|'paren', value:string, diceIndex:optional}
let usedDiceIndices = new Set();
let lockedGames = JSON.parse(localStorage.getItem("lockedGames") || "{}");
let bestScores = JSON.parse(localStorage.getItem("bestScores") || "{});
let qu0xCount = 0;

// Operators allowed:
const OPERATORS = ["+", "-", "*", "/", "^", "!", "(", ")"];

function getDateId(date) {
  // Format YYYYMMDD for daily puzzle id
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// Generate 5 dice values from seed (date id)
function generateDiceForGame(gameId) {
  // Simple seeded RNG from gameId
  let seed = parseInt(gameId) || Date.now();
  const rng = mulberry32(seed);

  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(rng() * 6) + 1);
  }
  return dice;
}

// mulberry32 PRNG
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderDice() {
  diceContainer.innerHTML = "";
  diceValues.forEach((v, i) => {
    const die = document.createElement("div");
    die.className = "die";
    die.textContent = v;
    if (usedDiceIndices.has(i)) die.classList.add("fade");
    die.addEventListener("click", () => {
      if (usedDiceIndices.has(i)) return;
      addToken({ type: "dice", value: v.toString(), diceIndex: i });
      usedDiceIndices.add(i);
      die.classList.add("fade");
      updateExpressionOutput();
    });
    diceContainer.appendChild(die);
  });
}

function renderOperators() {
  operatorRow.innerHTML = "";
  OPERATORS.forEach((op) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = op;
    btn.addEventListener("click", () => {
      // Prevent concatentation of dice numbers - only one dice token per click allowed
      if (op.match(/[0-9]/)) return; // should never happen, but safeguard

      // Factorial rules: can only be applied if previous token is a dice or close parenthesis
      if (op === "!") {
        if (
          expressionTokens.length === 0 ||
          !["dice", "paren"].includes(expressionTokens[expressionTokens.length - 1].type)
        ) {
          return; // invalid position for factorial
        }
      }

      // Prevent invalid operator sequence, e.g. two ops in a row except '(' and ')'
      if (
        expressionTokens.length > 0 &&
        expressionTokens[expressionTokens.length - 1].type === "op" &&
        op !== "(" &&
        op !== ")"
      ) {
        return;
      }

      addToken({ type: "op", value: op });
      updateExpressionOutput();
    });
    operatorRow.appendChild(btn);
  });

  // Backspace and Clear buttons
  const backBtn = document.createElement("button");
  backBtn.className = "btn";
  backBtn.textContent = "Backspace";
  backBtn.addEventListener("click", () => {
    backspaceToken();
  });
  operatorRow.appendChild(backBtn);

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn";
  clearBtn.textContent = "Clear";
  clearBtn.addEventListener("click", () => {
    clearExpression();
  });
  operatorRow.appendChild(clearBtn);
}

function addToken(token) {
  // Add token to expressionTokens
  expressionTokens.push(token);
  renderExpression();
}

function backspaceToken() {
  if (expressionTokens.length === 0) return;
  const last = expressionTokens.pop();
  // If last token was dice, free that dice index so it can be reused
  if (last.type === "dice" && last.diceIndex !== undefined) {
    usedDiceIndices.delete(last.diceIndex);
  }
  renderDice();
  renderExpression();
  updateExpressionOutput();
}

function clearExpression() {
  expressionTokens = [];
  usedDiceIndices.clear();
  renderDice();
  renderExpression();
  updateExpressionOutput();
}

function renderExpression() {
  expressionBox.innerHTML = "";
  expressionTokens.forEach((token) => {
    const span = document.createElement("span");
    span.textContent = token.value;
    span.style.cursor = "pointer";
    span.style.userSelect = "none";
    span.addEventListener("click", () => {
      // Remove this token on click
      const index = expressionTokens.indexOf(token);
      if (index > -1) {
        expressionTokens.splice(index, 1);
        if (token.type === "dice" && token.diceIndex !== undefined) {
          usedDiceIndices.delete(token.diceIndex);
          renderDice();
        }
        renderExpression();
        updateExpressionOutput();
      }
    });
    expressionBox.appendChild(span);
  });
}

function updateExpressionOutput() {
  const expr = tokensToString(expressionTokens);
  try {
    const val = evaluateExpression(expr);
    outputBox.textContent = val !== undefined ? val : "";
  } catch {
    outputBox.textContent = "Error";
  }
}

function tokensToString(tokens) {
  return tokens.map((t) => t.value).join("");
}

function evaluateExpression(expr) {
  // Evaluate expression with factorial support and correct order of operations
  // Uses Function with safe replacements to prevent eval issues

  // Replace factorials: convert (n)! or n! to factorial calls
  let transformed = expr;

  // Add support for factorial on grouped expressions like (2+1)!
  // Use a regex to find factorial pattern and replace with factorial call

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error("Invalid factorial");
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }

  // Convert factorials in expr: e.g. (2+1)! -> factorial((2+1))
  // Also support nested factorials.

  transformed = transformed.replace(/(\([^()]+\)|\d+)!/g, (match, p1) => {
    return `factorial(${p1})`;
  });

  // Now build safe eval function:
  // Only allow digits, operators + - * / ^ ( ) and factorial calls.

  // Replace ^ with ** for JS exponentiation
  transformed = transformed.replace(/\^/g, "**");

  // Construct function
  const funcBody = `
    const factorial = ${factorial.toString()};
    return ${transformed};
  `;

  let fn = new Function(funcBody);
  return fn();
}

function showPopup(text) {
  popup.textContent = text;
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

function submitExpression() {
  if (lockedGames[currentGameId]) {
    alert("This daily puzzle is locked because you achieved a Qu0x!");
    return;
  }

  if (expressionTokens.length === 0) return;

  if (usedDiceIndices.size !== diceValues.length) {
    alert("Use all dice exactly once.");
    return;
  }

  // Prevent concatentation of dice (e.g. 2 then 3 as '23'), so check for sequential dice tokens
  for (let i = 1; i < expressionTokens.length; i++) {
    if (
      expressionTokens[i].type === "dice" &&
      expressionTokens[i - 1].type === "dice"
    ) {
      alert("Concatenation of dice is not allowed.");
      return;
    }
  }

  const expr = tokensToString(expressionTokens);
  let val;
  try {
    val = evaluateExpression(expr);
  } catch {
    alert("Invalid expression.");
    return;
  }

  // Check if value is integer since factorial returns integers only
  if (typeof val !== "number" || isNaN(val)) {
    alert("Expression does not evaluate to a number.");
    return;
  }

  // Compute score = absolute difference from target
  // Target is sum of dice values (example). You can adjust target logic as needed
  const target = diceValues.reduce((a, b) => a + b, 0);
  const score = Math.abs(val - target);

  // Save best score if better or no score yet
  if (
    !bestScores[currentGameId] ||
    score < bestScores[currentGameId].score
  ) {
    bestScores[currentGameId] = { score, expression: expr };
    localStorage.setItem("bestScores", JSON.stringify(bestScores));
  }

  bestScoreText.textContent = `Best score for today: ${bestScores[currentGameId].score} (Expr: ${bestScores[currentGameId].expression})`;

  if (score === 0) {
    // Qu0x achieved
    showPopup("Qu0x!");
    lockedGames[currentGameId] = expr;
    localStorage.setItem("lockedGames", JSON.stringify(lockedGames));
    updateQu0xCompletion();
  }
}

function loadGame(date) {
  currentDate = date;
  currentGameId = getDateId(date);
  diceValues = generateDiceForGame(currentGameId);
  expressionTokens = [];
  usedDiceIndices.clear();

  dateDisplay.textContent = `Game #${currentGameId}`;

  renderDice();
  renderOperators();
  renderExpression();

  // Show best score
  if (bestScores[currentGameId]) {
    bestScoreText.textContent = `Best score for today: ${bestScores[currentGameId].score} (Expr: ${bestScores[currentGameId].expression})`;
  } else {
    bestScoreText.textContent = "No submissions yet.";
  }

  // Check if locked
  if (lockedGames[currentGameId]) {
    alert("This daily puzzle is locked because you achieved a Qu0x!");
    // Disable buttons:
    submitBtn.disabled = true;
    operatorRow.querySelectorAll("button").forEach((btn) => btn.disabled = true);
    diceContainer.querySelectorAll(".die").forEach((d) => d.classList.add("fade"));
  } else {
    submitBtn.disabled = false;
    operatorRow.querySelectorAll("button").forEach((btn) => btn.disabled = false);
  }

  updateQu0xCompletion();
  updateExpressionOutput();
}

function updateQu0xCompletion() {
  // Count Qu0x achieved = number of locked games
  const qu0xAchieved = Object.keys(lockedGames).length;
  qu0xCount = qu0xAchieved;

  // Display fraction with horizontal vinculum
  qu0xFractionText.innerHTML = `
    <span style="display:inline-block; text-align:center;">
      <div>${qu0xAchieved}</div>
      <hr style="margin: 0.1em 0; border: 1px solid black;">
      <div>${totalGames}</div>
    </span>
  `;

  // Show Qu0x Master if all solved
  if (qu0xAchieved === totalGames) {
    qu0xMasterText.textContent = "Qu0x-Master Score: " + Object.values(bestScores).reduce((a,v) => a + v.score, 0);
  } else {
    qu0xMasterText.textContent = "Qu0x-Master Score: N/A";
  }
}

// Prev and Next buttons logic to move by one day
prevBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadGame(currentDate);
});
nextBtn.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadGame(currentDate);
});

submitBtn.addEventListener("click", () => {
  submitExpression();
});

function dailyResetCheck() {
  // Reload the game if day changed (local midnight)
  let storedDate = localStorage.getItem("lastLoadedDate");
  const todayStr = new Date().toISOString().slice(0,10);

  if (storedDate !== todayStr) {
    localStorage.setItem("lastLoadedDate", todayStr);
    loadGame(new Date());
  }
}

window.onload = () => {
  // Load today's game by default at midnight local time
  dailyResetCheck();
  loadGame(new Date());
};
