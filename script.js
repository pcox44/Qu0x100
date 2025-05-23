// --- CONSTANTS ---
const startDate = new Date(2025, 4, 15); // May is month 4 in JS
const today = new Date();
const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

const minTarget = 1;
const maxTarget = 100;

const diceColors = {
  1: { bg: "red", fg: "white" },
  2: { bg: "white", fg: "black" },
  3: { bg: "blue", fg: "white" },
  4: { bg: "yellow", fg: "black" },
  5: { bg: "green", fg: "white" },
  6: { bg: "black", fg: "yellow" },
};

const operationButtons = [
  "(", ")", "+", "-", "*", "/", "^", "!", "Clear", "Backspace",
];

// --- STATE ---
let currentGameIndex = totalDays - 1; // zero based, so last day is today
let gamesData = [];
let usedDice = [];
let expression = "";
let lockedDays = new Set();
let quoxDays = new Set();
let dailyBestScores = Array(totalDays).fill(null);
let quoxCount = 0;

// --- DOM ELEMENTS ---
const daySelect = document.getElementById("daySelect");
const prevDayBtn = document.getElementById("prevDay");
const nextDayBtn = document.getElementById("nextDay");
const diceContainer = document.getElementById("diceContainer");
const targetBox = document.getElementById("targetBox");
const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluation");
const buttonGrid = document.getElementById("buttonGrid");
const submitBtn = document.getElementById("submitBtn");
const scoreboard = document.getElementById("scoreboard");
const quoxPopup = document.getElementById("quoxPopup");

// --- HELPERS ---

function formatDate(date) {
  // Format as M-D-YYYY (no leading zeros)
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

function generateSeededRandom(seed) {
  // Simple seeded RNG (Mulberry32)
  let t = seed + 0x6D2B79F5;
  return function () {
    t += 0x6D2B79F5;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGameData(dayIndex) {
  // Seed by day index, generate 5 dice and a target number
  const seed = dayIndex + 1000; // arbitrary offset
  const rng = generateSeededRandom(seed);
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(rng() * 6) + 1);
  }
  const target = Math.floor(rng() * (maxTarget - minTarget + 1)) + minTarget;
  return { dice, target };
}

function initGamesData() {
  for (let i = 0; i < totalDays; i++) {
    gamesData.push(generateGameData(i));
  }
}

function updateDaySelectOptions() {
  daySelect.innerHTML = "";
  for (let i = 0; i < totalDays; i++) {
    const option = document.createElement("option");
    option.value = i;
    const gameDate = new Date(startDate.getTime() + i * 86400000);
    option.textContent = formatDate(gameDate);
    daySelect.appendChild(option);
  }
}

function updateDiceDisplay() {
  diceContainer.innerHTML = "";
  const currentDice = gamesData[currentGameIndex].dice;
  currentDice.forEach((dieVal, i) => {
    const die = document.createElement("div");
    die.classList.add("die", `die-${dieVal}`);
    die.textContent = dieVal;
    die.dataset.index = i;
    if (usedDice.includes(i)) {
      die.classList.add("faded");
    }
    diceContainer.appendChild(die);
  });
}

function updateTargetDisplay() {
  targetBox.textContent = `Target: ${gamesData[currentGameIndex].target}`;
}

function updateExpressionDisplay() {
  expressionBox.textContent = expression || "";
}

function evaluateExpression(expr) {
  try {
    // Replace ^ with **
    let e = expr.replace(/\^/g, "**");

    // Handle factorial: replace n! with fact(n)
    e = e.replace(/(\d+)!/g, (_, n) => {
      return `fact(${n})`;
    });

    // Define factorial function
    function fact(n) {
      n = Number(n);
      if (!Number.isInteger(n) || n < 0) return NaN;
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function("fact", `return ${e}`);
    const result = fn(fact);
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    // ignore errors
  }
  return null;
}

function updateEvaluationDisplay() {
  const val = evaluateExpression(expression);
  if (val === null) {
    evaluationBox.textContent = "";
  } else {
    evaluationBox.textContent = val;
  }
}

function isDayLocked() {
  return quoxDays.has(currentGameIndex);
}

function disableButtonsForLockedDay() {
  const buttons = buttonGrid.querySelectorAll("button");
  buttons.forEach((btn) => {
    if (btn.textContent === "Clear" || btn.textContent === "Backspace") {
      btn.disabled = isDayLocked();
    }
  });
  submitBtn.disabled = isDayLocked();
}

function updateScoreboard() {
  const totalQuox = quoxDays.size;
  const completionText = `Qu0x Completion: ${totalQuox}/${totalDays}`;
  scoreboard.innerHTML = `
    <div>${completionText}</div>
    <div>Qu0x Master Score: ${
      totalQuox === totalDays
        ? dailyBestScores.reduce((acc, v) => acc + (v || 0), 0)
        : "N/A"
    }</div>
  `;
}

function updateDropdownEmojis() {
  const options = daySelect.options;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (quoxDays.has(i)) {
      opt.textContent = `⭐ ${opt.textContent}`;
    } else if (dailyBestScores[i] !== null) {
      opt.textContent = `✔ (${dailyBestScores[i]}) ${opt.textContent}`;
    } else {
      // Remove emojis if any
      opt.textContent = opt.textContent.replace(/^(⭐ |✔ \(\d+\) )/, "");
    }
  }
}

function fadeOutDie(index) {
  const diceDivs = diceContainer.children;
  if (diceDivs[index]) {
    diceDivs[index].classList.add("faded");
  }
}

function fadeInDie(index) {
  const diceDivs = diceContainer.children;
  if (diceDivs[index]) {
    diceDivs[index].classList.remove("faded");
  }
}

function resetDiceFade() {
  for (let i = 0; i < 5; i++) {
    fadeInDie(i);
  }
}

function allDiceUsed() {
  return usedDice.length === 5;
}

function showQuoxPopup() {
  quoxPopup.style.display = "block";
  setTimeout(() => {
    quoxPopup.style.display = "none";
  }, 3000);
}

function setExpressionLock() {
  expression = "Quox-Lock";
  updateExpressionDisplay();
  updateEvaluationDisplay();
}

function restoreExpression(expressionToSet) {
  expression = expressionToSet;
  updateExpressionDisplay();
  updateEvaluationDisplay();
}

// --- EVENT HANDLERS ---

function onDieClick(e) {
  if (isDayLocked()) return;
  const idx = Number(e.target.dataset.index);
  if (usedDice.includes(idx)) return;
  usedDice.push(idx);
  fadeOutDie(idx);

  // Append the dice number to expression
  expression += gamesData[currentGameIndex].dice[idx];
  updateExpressionDisplay();
  updateEvaluationDisplay();
}

function onButtonClick(e) {
  if (isDayLocked()) return;
  const val = e.target.textContent;
  if (val === "Clear") {
    expression = "";
    usedDice = [];
    resetDiceFade();
  } else if (val === "Backspace") {
    if (expression.length === 0) return;
    // Remove last character
    const lastChar = expression.slice(-1);
    expression = expression.slice(0, -1);

    // Check if lastChar was a dice number that is still in dice, restore it
    // Find dice index for this number that is currently faded out and restore
    let foundIndex = -1;
    for (let i = usedDice.length - 1; i >= 0; i--) {
      const dieIndex = usedDice[i];
      if (gamesData[currentGameIndex].dice[dieIndex].toString() === lastChar) {
        foundIndex = dieIndex;
        usedDice.splice(i, 1);
        break;
      }
    }
    if (foundIndex >= 0) fadeInDie(foundIndex);
  } else {
    // Append operator or parens or factorial
    expression += val;
  }
  updateExpressionDisplay();
  updateEvaluationDisplay();
}

function onSubmit() {
  if (isDayLocked()) return;

  const val = evaluateExpression(expression);
  if (val === null) {
    alert("Invalid expression.");
    return;
  }

  const target = gamesData[currentGameIndex].target;
  const score = Math.abs(val - target);

  if (score === 0) {
    // Qu0x!
    alert("🎉 Qu0x! Perfect match! 🎉");
    quoxDays.add(currentGameIndex);
    lockedDays.add(currentGameIndex);
    dailyBestScores[currentGameIndex] = 0;
    showQuoxPopup();
    disableButtonsForLockedDay();
    // Lock the day, no further submissions
  } else {
    if (
      dailyBestScores[currentGameIndex] === null ||
      score < dailyBestScores[currentGameIndex]
    ) {
      dailyBestScores[currentGameIndex] = score;
      alert(`Score updated: ${score}`);
    } else {
      alert(`Score: ${score} (Best: ${dailyBestScores[currentGameIndex]})`);
    }
  }
  updateScoreboard();
  updateDropdownEmojis();
}

function onDayChange() {
  currentGameIndex = Number(daySelect.value);
  resetDay();
  renderCurrentDay();
}

function onPrevDay() {
  if (currentGameIndex > 0) {
    currentGameIndex--;
    daySelect.value = currentGameIndex;
    resetDay();
    renderCurrentDay();
  }
}

function onNextDay() {
  if (currentGameIndex < totalDays - 1) {
    currentGameIndex++;
    daySelect.value = currentGameIndex;
    resetDay();
    renderCurrentDay();
  }
}

// --- RENDER FUNCTIONS ---

function resetDay() {
  expression = "";
  usedDice = [];
  updateExpressionDisplay();
  updateEvaluationDisplay();
  disableButtonsForLockedDay();
}

function renderOperationButtons() {
  buttonGrid.innerHTML = "";
  operationButtons.forEach((op) => {
    const btn = document.createElement("button");
    btn.textContent = op;
    btn.addEventListener("click", onButtonClick);
    buttonGrid.appendChild(btn);
  });
}

function renderCurrentDay() {
  updateDiceDisplay();
  updateTargetDisplay();
  updateExpressionDisplay();
  updateEvaluationDisplay();
  disableButtonsForLockedDay();
}

// --- INITIALIZATION ---

function init() {
  initGamesData();
  updateDaySelectOptions();
  daySelect.value = currentGameIndex;

  renderOperationButtons();

  daySelect.addEventListener("change", onDayChange);
  prevDayBtn.addEventListener("click", onPrevDay);
  nextDayBtn.addEventListener("click", onNextDay);

  submitBtn.addEventListener("click", onSubmit);

  diceContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("die")) {
      onDieClick(e);
    }
  });

  updateScoreboard();
  updateDropdownEmojis();

  renderCurrentDay();
}

init();
