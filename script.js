const opButtons = document.querySelectorAll(".op-btn");
const diceRow = document.getElementById("dice-row");
const expressionBox = document.getElementById("expression-box");
const outputBox = document.getElementById("expression-output-box");
const submitBtn = document.getElementById("submit-btn");
const scoreResult = document.getElementById("score-result");
const gameNumber = document.getElementById("game-number");
const targetNumber = document.getElementById("target-number");
const backspaceBtn = document.getElementById("backspace-btn");
const clearBtn = document.getElementById("clear-btn");
const gameSelect = document.getElementById("game-select");
const modeToggle = document.getElementById("mode-toggle");
const currentDateSpan = document.getElementById("current-date");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const qu0xCount = document.getElementById("qu0x-count");
const masterScore = document.getElementById("master-score");
const popupContainer = document.getElementById("popup-container");

let currentGame = 0;
let blitzMode = false;
let games = [];

function getTodayKey() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function randomDice(seed) {
  const rand = mulberry32(seed);
  const dice = [];
  for (let i = 0; i < 5; i++) dice.push(1 + Math.floor(rand() * 6));
  return dice;
}

function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(dateString) {
  return parseInt(dateString.replace(/-/g, ""));
}

function buildGame(dateStr, index) {
  const seed = seedFromDate(dateStr) + index;
  const dice = randomDice(seed);
  const target = 10 + Math.floor(mulberry32(seed + 99)() * 90);
  return { date: dateStr, dice, target, best: null, solved: false, isQu0x: false };
}

function initGames(n = 30) {
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    games.push(buildGame(dateStr, i));
  }
  games.reverse();
}

function updateGameSelect() {
  gameSelect.innerHTML = "";
  games.forEach((game, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `#${idx + 1} - ${game.date}`;
    if (game.solved && game.isQu0x) opt.textContent = "⭐ " + opt.textContent;
    else if (game.solved) opt.textContent = "✅ " + opt.textContent;
    gameSelect.appendChild(opt);
  });
  gameSelect.value = currentGame;
}

function renderGame() {
  const game = games[currentGame];
  gameNumber.textContent = currentGame + 1;
  targetNumber.textContent = game.target;
  currentDateSpan.textContent = game.date;
  expressionBox.textContent = "";
  outputBox.textContent = "?";
  scoreResult.textContent = game.best ?? "-";
  renderDice(game.dice);
  updateGameSelect();
  updateStats();
}

function renderDice(dice) {
  diceRow.innerHTML = "";
  dice.forEach((val, idx) => {
    const die = document.createElement("div");
    die.className = `die die-${val}`;
    die.textContent = val;
    die.onclick = () => {
      if (blitzMode || !games[currentGame].solved) {
        expressionBox.textContent += val;
        evaluateExpression();
      }
    };
    diceRow.appendChild(die);
  });
}

opButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    if (blitzMode || !games[currentGame].solved) {
      expressionBox.textContent += btn.textContent;
      evaluateExpression();
    }
  })
);

submitBtn.onclick = () => {
  const game = games[currentGame];
  if (!blitzMode && game.solved) return;

  const expr = expressionBox.textContent;
  const used = game.dice.slice();
  const nums = expr.match(/\d+/g) || [];
  for (const n of nums) {
    const index = used.indexOf(+n);
    if (index !== -1) used.splice(index, 1);
    else return alert("Invalid use of dice.");
  }

  let val;
  try {
    val = evalExpression(expr);
  } catch {
    return alert("Invalid expression.");
  }

  const score = Math.abs(val - game.target);
  if (game.best === null || score < game.best) game.best = score;
  if (score === 0 && !game.solved) {
    game.solved = true;
    game.isQu0x = true;
    if (!blitzMode) showPopup("Qu0x!");
  } else if (!blitzMode) {
    game.solved = true;
  }

  scoreResult.textContent = game.best;
  outputBox.textContent = val;
  updateGameSelect();
  updateStats();
};

function evalExpression(expr) {
  expr = expr.replace(/(\d+)!/g, (_, n) => factorial(+n));
  expr = expr.replace(/(\d+)\^(\d+)/g, (_, a, b) => `Math.pow(${a},${b})`);
  return Function('"use strict";return (' + expr + ')')();
}

function factorial(n) {
  if (n < 0 || n > 12) throw new Error("Bad factorial");
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function evaluateExpression() {
  try {
    const output = evalExpression(expressionBox.textContent);
    outputBox.textContent = output;
  } catch {
    outputBox.textContent = "?";
  }
}

backspaceBtn.onclick = () => {
  const expr = expressionBox.textContent;
  expressionBox.textContent = expr.slice(0, -1);
  evaluateExpression();
};

clearBtn.onclick = () => {
  expressionBox.textContent = "";
  outputBox.textContent = "?";
};

gameSelect.onchange = () => {
  currentGame = +gameSelect.value;
  renderGame();
};

modeToggle.onclick = () => {
  blitzMode = !blitzMode;
  modeToggle.textContent = blitzMode ? "Daily Mode" : "Blitz Mode";
  if (blitzMode) {
    const today = getTodayKey();
    const seed = Date.now() % 100000;
    games.push(buildGame(today, seed));
    currentGame = games.length - 1;
  } else {
    currentGame = 0;
  }
  renderGame();
};

prevBtn.onclick = () => {
  if (currentGame > 0) {
    currentGame--;
    renderGame();
  }
};

nextBtn.onclick = () => {
  if (currentGame < games.length - 1) {
    currentGame++;
    renderGame();
  }
};

function updateStats() {
  const qu0xes = games.filter((g) => g.isQu0x).length;
  const solved = games.filter((g) => g.best !== null).length;
  const totalScore = games.reduce((acc, g) => acc + (g.best ?? 0), 0);
  const allSolved = solved === games.length;

  qu0xCount.textContent = qu0xes;
  masterScore.textContent = allSolved ? totalScore : "N/A";
}

function showPopup(text) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "popup";
  popupContainer.appendChild(div);
  setTimeout(() => popupContainer.removeChild(div), 3000);
}

// Initialize
initGames();
renderGame();
