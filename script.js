// === Constants ===
const startDate = new Date("2025-05-15T00:00:00");
const today = new Date();
today.setHours(0, 0, 0, 0);
const gameCount = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

// === State ===
let currentGame = gameCount - 1;
let currentExpression = "";
let usedDice = [];
let diceValues = [];
let targetNumber = 0;

const diceColors = {
  1: { fg: "white", bg: "red" },
  2: { fg: "black", bg: "white" },
  3: { fg: "white", bg: "blue" },
  4: { fg: "black", bg: "yellow" },
  5: { fg: "white", bg: "green" },
  6: { fg: "yellow", bg: "black" },
};

// === Utility ===
function getSeededRandom(index) {
  const seed = startDate.getTime() + index * 86400000;
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededShuffle(array, seedIndex) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    let r = Math.floor(getSeededRandom(seedIndex + i) * (i + 1));
    [arr[i], arr[r]] = [arr[r], arr[i]];
  }
  return arr;
}

function seededDice(index) {
  const vals = [1, 2, 3, 4, 5, 6];
  return seededShuffle([...Array(5)].map(() => vals[Math.floor(getSeededRandom(index++) * 6)]), index);
}

function seededTarget(index) {
  return Math.floor(getSeededRandom(index + 99) * 100) + 1;
}

// === Rendering ===
function renderGame(index) {
  currentExpression = "";
  usedDice = [];
  diceValues = seededDice(index);
  targetNumber = seededTarget(index);

  document.getElementById("target-number").innerText = targetNumber;
  document.getElementById("expression").innerText = "";
  document.getElementById("evaluated-result").innerText = "?";
  document.getElementById("game-number").innerText = index + 1;
  document.getElementById("game-date").innerText = new Date(startDate.getTime() + index * 86400000).toISOString().split("T")[0];

  const diceContainer = document.getElementById("dice-container");
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = "die";
    die.id = `die-${i}`;
    die.innerText = val;
    die.style.backgroundColor = diceColors[val].bg;
    die.style.color = diceColors[val].fg;
    die.onclick = () => useDie(i);
    diceContainer.appendChild(die);
  });

  updateDropdown();
}

function updateDropdown() {
  const dropdown = document.getElementById("gameDropdown");
  dropdown.innerHTML = "";
  for (let i = 0; i < gameCount; i++) {
    const option = document.createElement("option");
    const date = new Date(startDate.getTime() + i * 86400000).toISOString().split("T")[0];
    option.value = i;
    option.innerText = `Game ${i + 1} (${date})`;
    dropdown.appendChild(option);
  }
  dropdown.value = currentGame;
}

// === Expression Logic ===
function useDie(index) {
  if (usedDice.includes(index)) return;
  currentExpression += diceValues[index];
  usedDice.push(index);
  document.getElementById(`die-${index}`).classList.add("hidden");
  updateDisplay();
}

function addToExpression(symbol) {
  currentExpression += symbol;
  updateDisplay();
}

function backspace() {
  if (currentExpression.length === 0) return;
  currentExpression = currentExpression.slice(0, -1);
  updateDisplay(true);
}

function clearExpression() {
  currentExpression = "";
  usedDice = [];
  diceValues.forEach((_, i) => document.getElementById(`die-${i}`).classList.remove("hidden"));
  updateDisplay();
}

function updateDisplay(checkBackspace = false) {
  document.getElementById("expression").innerText = currentExpression;
  try {
    const replaced = currentExpression.replace(/\^/g, "**");
    const factored = replaced.replace(/(\d+)!/g, (_, n) => factorial(Number(n)));
    const result = eval(factored);
    document.getElementById("evaluated-result").innerText = isFinite(result) ? result : "?";
  } catch {
    document.getElementById("evaluated-result").innerText = "?";
  }
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function submitExpression() {
  const resultText = document.getElementById("evaluated-result").innerText;
  if (resultText === "?") {
    document.getElementById("feedback").innerText = "Invalid Submission";
    return;
  }
  const score = Math.abs(Number(resultText) - targetNumber);
  if (score === 0) {
    document.getElementById("quox-animation").style.display = "block";
    setTimeout(() => document.getElementById("quox-animation").style.display = "none", 3000);
  }
  document.getElementById("feedback").innerText = `Score: ${score}`;
}

function prevGame() {
  if (currentGame > 0) {
    currentGame--;
    renderGame(currentGame);
  }
}

function nextGame() {
  if (currentGame < gameCount - 1) {
    currentGame++;
    renderGame(currentGame);
  }
}

function selectGame() {
  const dropdown = document.getElementById("gameDropdown");
  currentGame = Number(dropdown.value);
  renderGame(currentGame);
}

// === Init ===
renderGame(currentGame);
