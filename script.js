const START_DATE = new Date("2025-05-15");
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

let currentDate = new Date(TODAY);
let blitzMode = false;
let blitzTarget, blitzDice;
let qu0xData = JSON.parse(localStorage.getItem("qu0xData") || "{}");
let audio = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");

const expressionInput = document.getElementById("expression-input");
const liveResult = document.getElementById("live-result");
const messageBox = document.getElementById("message-box");
const gameNumber = document.getElementById("game-number");
const targetNumber = document.getElementById("target-number");
const diceBox = document.getElementById("dice-box");
const dateDisplay = document.getElementById("date-display");
const totalQu0x = document.getElementById("total-qu0x");
const masterScore = document.getElementById("master-score");
const qu0xAnimation = document.getElementById("qu0x-animation");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateToGameNumber(date) {
  return Math.floor((date - START_DATE) / (1000 * 60 * 60 * 24)) + 1;
}

function seedRandom(date) {
  const seed = parseInt(formatDate(date).replace(/-/g, ""));
  return () => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

function getDailyDice(date) {
  const rand = seedRandom(date);
  return Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
}

function getDailyTarget(date) {
  const rand = seedRandom(date);
  rand(); rand(); // advance RNG
  return Math.floor(rand() * 100) + 1;
}

function renderGame(date) {
  const isLocked = getDayData(date)?.score === 0;
  const dice = blitzMode ? blitzDice : getDailyDice(date);
  const target = blitzMode ? blitzTarget : getDailyTarget(date);

  dateDisplay.textContent = formatDate(date);
  gameNumber.textContent = blitzMode ? "Blitz Mode" : `Game #${dateToGameNumber(date)}`;
  targetNumber.textContent = target;
  diceBox.innerHTML = "";

  dice.forEach((val, i) => {
    const div = document.createElement("div");
    div.textContent = val;
    div.className = `die d${val}`;
    diceBox.appendChild(div);
  });

  expressionInput.value = isLocked ? getDayData(date).expression : "";
  expressionInput.disabled = isLocked;
  liveResult.textContent = "--";
  messageBox.textContent = "";

  updateTotals();
  updateButtons();
}

function updateTotals() {
  const entries = Object.entries(qu0xData).filter(([k, v]) => !v.blitz);
  totalQu0x.textContent = `Total Qu0x: ${entries.filter(([_, v]) => v.score === 0).length}`;

  const numDays = dateToGameNumber(TODAY);
  if (entries.length === numDays) {
    const scoreSum = entries.reduce((a, [, v]) => a + v.score, 0);
    masterScore.textContent = `Qu0x-Master Score: ${scoreSum}`;
  } else {
    masterScore.textContent = `Qu0x-Master Score: —`;
  }
}

function getDayKey(date) {
  return `${formatDate(date)}${blitzMode ? "-blitz" : ""}`;
}

function getDayData(date) {
  return qu0xData[getDayKey(date)];
}

function validateDiceUsage(expr, dice) {
  const used = [];
  const tokens = expr.match(/\d+/g);
  if (!tokens) return false;
  for (let token of tokens) {
    if (token.length > 1) return false;
    used.push(Number(token));
  }
  const counts = (arr) => arr.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
  const usedCounts = counts(used);
  const diceCounts = counts(dice);
  return Object.keys(usedCounts).every(n => usedCounts[n] <= (diceCounts[n] || 0));
}

function evaluateExpression(expr) {
  try {
    if (/[\d)]\s*[\d(]/.test(expr)) return null;
    const result = math.evaluate(expr);
    if (!Number.isFinite(result) || typeof result !== "number") return null;
    return Number.isInteger(result) ? result : +result.toFixed(2);
  } catch {
    return null;
  }
}

function handleInput() {
  const expr = expressionInput.value;
  const dice = blitzMode ? blitzDice : getDailyDice(currentDate);
  const value = evaluateExpression(expr);
  liveResult.textContent = value !== null ? value : "--";
}

function submit() {
  const expr = expressionInput.value;
  const dice = blitzMode ? blitzDice : getDailyDice(currentDate);
  const target = blitzMode ? blitzTarget : getDailyTarget(currentDate);

  const value = evaluateExpression(expr);
  if (value === null) {
    messageBox.textContent = "Invalid expression.";
    return;
  }

  if (!validateDiceUsage(expr, dice)) {
    messageBox.textContent = "Use each die exactly once. No combining digits.";
    return;
  }

  const score = Math.abs(target - value);
  const key = getDayKey(currentDate);
  const existing = qu0xData[key];

  if (existing && existing.score === 0) {
    messageBox.textContent = "Qu0x already achieved for this day!";
    return;
  }

  if (!existing || score < existing.score) {
    qu0xData[key] = { expression: expr, score, blitz: blitzMode };
    localStorage.setItem("qu0xData", JSON.stringify(qu0xData));
  }

  if (score === 0) {
    messageBox.textContent = "🎉 Qu0x!";
    expressionInput.disabled = true;
    showAnimation();
    audio.play();
  } else {
    messageBox.textContent = `Score: ${score}`;
  }

  renderGame(currentDate);
}

function showAnimation() {
  qu0xAnimation.style.display = "block";
  setTimeout(() => qu0xAnimation.style.display = "none", 2000);
}

function updateButtons() {
  prevBtn.disabled = blitzMode || formatDate(currentDate) === formatDate(START_DATE);
  nextBtn.disabled = blitzMode || formatDate(currentDate) >= formatDate(TODAY);
}

function prevDay() {
  currentDate.setDate(currentDate.getDate() - 1);
  renderGame(currentDate);
}

function nextDay() {
  currentDate.setDate(currentDate.getDate() + 1);
  renderGame(currentDate);
}

function enterBlitzMode() {
  blitzMode = true;
  blitzDice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
  blitzTarget = Math.floor(Math.random() * 100) + 1;
  currentDate = new Date();
  document.getElementById("blitz-mode-btn").style.display = "none";
  document.getElementById("daily-mode-btn").style.display = "inline-block";
  renderGame(currentDate);
}

function exitBlitzMode() {
  blitzMode = false;
  document.getElementById("blitz-mode-btn").style.display = "inline-block";
  document.getElementById("daily-mode-btn").style.display = "none";
  currentDate = new Date();
  renderGame(currentDate);
}

function createButtons() {
  const container = document.getElementById("buttons-container");
  const symbols = ['+', '-', '*', '/', '(', ')', '^', '!'];
  container.innerHTML = "";

  [...new Set([...Array(10).keys(), ...symbols])].forEach(char => {
    const btn = document.createElement("button");
    btn.textContent = char;
    btn.onclick = () => {
      expressionInput.value += char;
      handleInput();
    };
    container.appendChild(btn);
  });

  const back = document.createElement("button");
  back.textContent = "⌫";
  back.onclick = () => {
    expressionInput.value = expressionInput.value.slice(0, -1);
    handleInput();
  };
  container.appendChild(back);

  const clr = document.createElement("button");
  clr.textContent = "Clear";
  clr.onclick = () => {
    expressionInput.value = "";
    handleInput();
  };
  container.appendChild(clr);
}

// Event Listeners
document.getElementById("submit-btn").onclick = submit;
document.getElementById("prev-btn").onclick = prevDay;
document.getElementById("next-btn").onclick = nextDay;
document.getElementById("blitz-mode-btn").onclick = enterBlitzMode;
document.getElementById("daily-mode-btn").onclick = exitBlitzMode;
expressionInput.addEventListener("input", handleInput);

// Initial Setup
createButtons();
renderGame(currentDate);
