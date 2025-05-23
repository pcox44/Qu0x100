const expressionInput = document.getElementById("expression");
const evaluatedValue = document.getElementById("evaluatedValue");
const diceContainer = document.getElementById("diceContainer");
const submitBtn = document.getElementById("submit");
const bestScoreSpan = document.getElementById("bestScore");
const daySelect = document.getElementById("daySelect");
const targetBox = document.getElementById("targetBox");
const quoxPopup = document.getElementById("quoxPopup");
const quoxSound = document.getElementById("quoxSound");
const quoxCompletion = document.getElementById("quoxCompletion");
const quoxMaster = document.getElementById("quoxMaster");
const clearBtn = document.getElementById("clearBtn");
const backspaceBtn = document.getElementById("backspaceBtn");

let currentDate = new Date();
let dice = [];
let usedDice = [];
let target = 0;
let gameHistory = {};

const diceStyles = {
  1: { bg: "red", text: "white" },
  2: { bg: "white", text: "black" },
  3: { bg: "blue", text: "white" },
  4: { bg: "yellow", text: "black" },
  5: { bg: "green", text: "white" },
  6: { bg: "black", text: "yellow" }
};

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDice(seed) {
  let values = [];
  for (let i = 0; i < 5; i++) {
    seed += i;
    let val = Math.floor(seedRandom(seed) * 6) + 1;
    values.push(val);
  }
  return values;
}

function generateTarget(seed) {
  return Math.floor(seedRandom(seed + 999) * 100) + 1;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getGameNumber(date) {
  const start = new Date("2025-05-15");
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function updateDaySelect() {
  const today = new Date();
  const start = new Date("2025-05-15");
  const totalDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  daySelect.innerHTML = "";
  for (let i = 1; i <= totalDays; i++) {
    const option = document.createElement("option");
    const date = new Date(start);
    date.setDate(date.getDate() + i - 1);
    option.value = formatDate(date);
    const history = JSON.parse(localStorage.getItem("quoxGameHistory") || "{}");
    let emoji = "";
    const day = formatDate(date);
    if (history[day]?.score === 0) emoji = "⭐ ";
    else if (history[day]?.score != null) emoji = "✅ ";
    option.textContent = `${emoji}Game #${i} — ${day}`;
    daySelect.appendChild(option);
  }
}

function loadGame(date) {
  const seed = parseInt(date.replace(/-/g, ""));
  dice = generateDice(seed);
  target = generateTarget(seed);
  usedDice = [];
  expressionInput.value = "";
  evaluatedValue.textContent = "=";
  displayDice();
  targetBox.textContent = `🎯 Target: ${target}`;
  updateScores();
  const day = formatDate(currentDate);
  if (gameHistory[day]?.score === 0) {
    expressionInput.value = "Qu0x-Lock";
    evaluatedValue.textContent = "= " + gameHistory[day].expression;
  }
}

function displayDice() {
  diceContainer.innerHTML = "";
  dice.forEach((val, i) => {
    const btn = document.createElement("div");
    btn.classList.add("die");
    btn.textContent = val;
    const style = diceStyles[val];
    btn.style.backgroundColor = style.bg;
    btn.style.color = style.text;
    if (usedDice.includes(i)) btn.classList.add("faded");
    btn.onclick = () => {
      if (usedDice.includes(i) || expressionInput.value === "Qu0x-Lock") return;
      usedDice.push(i);
      updateExpression(expressionInput.value + val);
    };
    diceContainer.appendChild(btn);
  });
}

function updateExpression(expr) {
  expressionInput.value = expr;
  try {
    if (!expr || expr.includes("!")) {
      evaluatedValue.textContent = "=";
      return;
    }
    const result = eval(expr);
    evaluatedValue.textContent = "= " + Math.round(result);
  } catch {
    evaluatedValue.textContent = "=";
  }
}

document.querySelectorAll(".opBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (expressionInput.value === "Qu0x-Lock") return;
    const val = btn.textContent;
    if (val === "Clear") {
      expressionInput.value = "";
      usedDice = [];
      displayDice();
      evaluatedValue.textContent = "=";
    } else if (val === "Backspace") {
      expressionInput.value = expressionInput.value.slice(0, -1);
      // Restore dice usage if needed
      usedDice = [];
      dice.forEach((v, i) => {
        if (expressionInput.value.includes(v.toString())) usedDice.push(i);
      });
      displayDice();
      updateExpression(expressionInput.value);
    } else {
      updateExpression(expressionInput.value + val);
    }
  });
});

submitBtn.onclick = () => {
  const expr = expressionInput.value;
  if (expr === "Qu0x-Lock") return;

  try {
    if (!expr || usedDice.length !== 5) {
      alert("Use all 5 dice exactly once!");
      return;
    }
    const result = eval(expr.replace(/(\d+)!/g, (_, n) => {
      n = parseInt(n);
      if (isNaN(n) || n < 0 || !Number.isInteger(n)) throw new Error("Invalid factorial");
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }));
    const score = Math.abs(target - result);
    const day = formatDate(currentDate);
    const prev = gameHistory[day];
    if (!prev || score < prev.score) {
      gameHistory[day] = { score, expression: expr };
      localStorage.setItem("quoxGameHistory", JSON.stringify(gameHistory));
    }
    if (score === 0) {
      showQuoxPopup();
      expressionInput.value = "Qu0x-Lock";
      evaluatedValue.textContent = "= " + expr;
    }
    updateScores();
  } catch {
    alert("Invalid expression.");
  }
};

function showQuoxPopup() {
  quoxPopup.style.display = "block";
  quoxSound.play();
  setTimeout(() => {
    quoxPopup.style.display = "none";
  }, 3000);
}

function updateScores() {
  const day = formatDate(currentDate);
  const record = gameHistory[day];
  bestScoreSpan.textContent = record ? record.score : "N/A";

  const days = Object.keys(JSON.parse(localStorage.getItem("quoxGameHistory") || "{}"));
  const total = daySelect.options.length;
  const completed = days.filter(d => gameHistory[d]?.score === 0).length;
  quoxCompletion.textContent = `Qu0x Completion: ${completed}/${total}`;

  const solved = days.filter(d => gameHistory[d]?.score != null);
  if (solved.length === total) {
    const sum = solved.reduce((a, d) => a + gameHistory[d].score, 0);
    quoxMaster.textContent = `Qu0x Master Score: ${sum}`;
  } else {
    quoxMaster.textContent = `Qu0x Master Score: N/A`;
  }
}

// Navigation
document.getElementById("prevDay").onclick = () => {
  currentDate.setDate(currentDate.getDate() - 1);
  daySelect.value = formatDate(currentDate);
  loadGame(currentDate);
};

document.getElementById("nextDay").onclick = () => {
  currentDate.setDate(currentDate.getDate() + 1);
  daySelect.value = formatDate(currentDate);
  loadGame(currentDate);
};

daySelect.onchange = () => {
  currentDate = new Date(daySelect.value);
  loadGame(currentDate);
};

(function init() {
  gameHistory = JSON.parse(localStorage.getItem("quoxGameHistory") || "{}");
  updateDaySelect();
  currentDate = new Date();
  loadGame(currentDate);
  daySelect.value = formatDate(currentDate);
})();
