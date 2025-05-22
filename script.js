const startDate = new Date('2025-05-15');
let today = new Date();
let currentDayOffset = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
let blitzMode = false;

let dailyData = {}; // Stores best scores and expressions
let totalQu0x = 0;

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getGameData(offset) {
  const seed = offset + 1000;
  let dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(getSeededRandom(seed + i) * 6) + 1);
  }
  const target = Math.floor(getSeededRandom(seed + 100) * 100) + 1;
  return { dice, target };
}

function renderGame() {
  const gameDate = new Date(startDate);
  gameDate.setDate(startDate.getDate() + currentDayOffset);
  const gameNumber = currentDayOffset + 1;
  const key = blitzMode ? 'blitz' + Date.now() : gameDate.toISOString().split('T')[0];

  const { dice, target } = getGameData(currentDayOffset);
  const container = document.getElementById("diceContainer");
  const targetBox = document.getElementById("targetNumber");

  document.getElementById("dateDisplay").innerText = blitzMode ? 'Blitz Mode' : gameDate.toDateString();
  document.getElementById("gameNumber").innerText = blitzMode ? 'Qu0x Blitz' : `Game #${gameNumber}`;
  targetBox.innerText = target;

  container.innerHTML = "";
  dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `die die-${val}`;
    die.innerText = val;
    container.appendChild(die);
  });

  const input = document.getElementById("expression");
  input.value = (dailyData[key] && dailyData[key].locked) ? dailyData[key].expression : "";
  input.disabled = dailyData[key] && dailyData[key].locked;

  document.getElementById("expressionResult").innerText = "";
  document.getElementById("feedback").innerText = "";
  updateScores();
}

function changeDay(delta) {
  if (blitzMode) return;
  currentDayOffset += delta;
  renderGame();
}

function evaluateExpression(expr) {
  try {
    const parsed = parseFactorials(expr);
    if (parsed.includes('**') && /(\d+)\.\d+\*\*/.test(parsed)) return NaN;
    const result = Function(`'use strict'; return (${parsed})`)();
    return isNaN(result) ? NaN : Math.round(result * 100) / 100;
  } catch {
    return NaN;
  }
}

function parseFactorials(expr) {
  while (expr.includes('!')) {
    expr = expr.replace(/(\([^\(\)]+\)|\d+)!/, (_, g) => {
      const val = evaluateExpression(g);
      return factorial(val);
    });
  }
  return expr.replace(/\^/g, '**');
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) return NaN;
  return n === 0 ? 1 : n * factorial(n - 1);
}

document.getElementById("buttons").addEventListener("click", (e) => {
  const btn = e.target.innerText;
  const input = document.getElementById("expression");
  if (btn === "⌫") {
    input.value = input.value.slice(0, -1);
  } else if (btn === "C") {
    input.value = "";
  } else if (btn === "Submit") {
    handleSubmit();
  } else {
    input.value += btn;
  }
  updateLiveValue();
});

document.getElementById("expression").addEventListener("input", updateLiveValue);

function updateLiveValue() {
  const expr = document.getElementById("expression").value;
  const result = evaluateExpression(expr);
  document.getElementById("expressionResult").innerText =
    isNaN(result) ? "" : `= ${result}`;
}

function handleSubmit() {
  const expr = document.getElementById("expression").value;
  const gameDate = new Date(startDate);
  gameDate.setDate(startDate.getDate() + currentDayOffset);
  const key = blitzMode ? 'blitz' + Date.now() : gameDate.toISOString().split('T')[0];

  const { dice, target } = getGameData(currentDayOffset);
  const used = (expr.match(/\d/g) || []).map(Number);
  const sortedUsed = used.sort((a, b) => a - b);
  const sortedDice = [...dice].sort((a, b) => a - b);

  // Ensure each die is used exactly once and no concatenation
  if (sortedUsed.join('') !== sortedDice.join('')) {
    document.getElementById("feedback").innerText = "❌ You must use each die exactly once with no concatenation.";
    return;
  }

  const val = evaluateExpression(expr);
  if (isNaN(val)) {
    document.getElementById("feedback").innerText = "❌ Invalid expression.";
    return;
  }

  const score = Math.abs(target - val);
  const existing = dailyData[key];

  if (!existing || score < existing.score) {
    dailyData[key] = { score, expression: expr };
  }

  if (score === 0 && (!existing || !existing.locked)) {
    dailyData[key].locked = true;
    document.getElementById("feedback").innerText = "🎉 Qu0x!";
    document.getElementById("qu0xSound").play();
  } else {
    document.getElementById("feedback").innerText = `✅ Score: ${score}`;
  }

  renderGame();
}

function updateScores() {
  const bestScoreBox = document.getElementById("bestScore");
  const totalQu0xBox = document.getElementById("totalQu0x");
  const masterScoreBox = document.getElementById("qu0xMasterScore");

  let total = 0;
  let master = 0;
  let complete = true;
  let offset = 0;
  const todayOffset = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));

  for (offset = 0; offset <= todayOffset; offset++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);
    const key = date.toISOString().split('T')[0];
    if (dailyData[key]) {
      if (dailyData[key].score === 0) total++;
      master += dailyData[key].score;
    } else {
      complete = false;
    }
  }

  const gameDate = new Date(startDate);
  gameDate.setDate(startDate.getDate() + currentDayOffset);
  const currentKey = gameDate.toISOString().split('T')[0];
  const best = dailyData[currentKey]?.score ?? "N/A";

  bestScoreBox.innerText = `Best Score: ${best}`;
  totalQu0xBox.innerText = `Total Qu0x: ${total}`;
  masterScoreBox.style.display = complete ? "block" : "none";
  if (complete) masterScoreBox.innerText = `Qu0x-Master Score: ${master}`;
}

function startBlitz() {
  blitzMode = true;
  document.getElementById("gameNumber").innerText = "Qu0x Blitz";
  currentDayOffset = 0;
  renderGame();
}

// Initialize
renderGame();
