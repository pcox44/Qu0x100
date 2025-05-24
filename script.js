// Qu0x 100 - Weekly game with 5 dice, must use all dice, factorials up to triple, operation buttons, colored dice

// Dice colors mapping for display & emoji conversion (for future share feature if needed)
const diceColors = {
  1: {class: "one", emoji: "🎲"}, // emoji not used here but stored for potential share
  2: {class: "two"},
  3: {class: "three"},
  4: {class: "four"},
  5: {class: "five"},
  6: {class: "six"}
};

const diceValues = [];
let usedDice = [false, false, false, false, false];

const expressionBox = document.getElementById("expressionBox");
const evaluationBox = document.getElementById("evaluationBox");
const diceContainer = document.getElementById("diceContainer");
const submitBtn = document.getElementById("submitBtn");
const buttonGrid = document.getElementById("buttonGrid");
const weeklyGameSelect = document.getElementById("weeklyGameSelect");
const counterBox = document.getElementById("counterBox");
const prevGameBtn = document.getElementById("prevGameBtn");
const nextGameBtn = document.getElementById("nextGameBtn");
const qu0x100Status = document.getElementById("qu0x100Status");

let currentWeeklyGameIndex = 0;
let weeklyGames = [];
let completedNumbers = new Set();
let expression = "";

const operators = ["+", "-", "*", "/", "(", ")", "^", "!", "!!", "!!!"];

// Initialize weekly games from 5/11/2025 every 7 days up to today or 52 weeks max
function generateWeeklyGames() {
  const start = new Date(2025, 4, 11); // May 11, 2025 (months 0-based)
  const today = new Date();
  const weeksToGenerate = 52; // one year approx
  let games = [];
  for(let i = 0; i < weeksToGenerate; i++) {
    const gameDate = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    if(gameDate > today) break;
    games.push(gameDate);
  }
  return games;
}

function formatDate(date) {
  // format mm/dd/yyyy
  const mm = date.getMonth() + 1;
  const dd = date.getDate();
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function populateWeeklySelect() {
  weeklyGames = generateWeeklyGames();
  weeklyGameSelect.innerHTML = "";
  weeklyGames.forEach((date, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `#${i+1} - ${formatDate(date)}`;
    weeklyGameSelect.appendChild(option);
  });
  currentWeeklyGameIndex = weeklyGames.length - 1; // default to latest game
  weeklyGameSelect.value = currentWeeklyGameIndex;
}

function initDice() {
  diceValues.length = 0;
  usedDice = [false, false, false, false, false];
  for(let i=0; i<5; i++) {
    diceValues.push(randomDice());
  }
  renderDice();
}

function randomDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function renderDice() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, idx) => {
    const die = document.createElement("div");
    die.classList.add("die", diceColors[val].class);
    if(usedDice[idx]) die.classList.add("faded");
    die.textContent = val;
    die.dataset.index = idx;
    die.title = usedDice[idx] ? "Used" : "Click to use this die";
    die.addEventListener("click", () => {
      if(!usedDice[idx]) {
        addToExpression(val.toString());
        usedDice[idx] = true;
        renderDice();
      }
    });
    diceContainer.appendChild(die);
  });
}

function addToExpression(char) {
  expression += char;
  updateExpressionBox();
  evaluateExpression();
}

function removeLastFromExpression() {
  if(expression.length === 0) return;
  // Check if last chars form !! or !!! to remove all at once
  if(expression.endsWith("!!!")) {
    expression = expression.slice(0, -3);
  } else if(expression.endsWith("!!")) {
    expression = expression.slice(0, -2);
  } else {
    expression = expression.slice(0, -1);
  }
  updateExpressionBox();
  evaluateExpression();
  updateUsedDice();
}

function updateUsedDice() {
  // Reset usedDice
  usedDice = [false, false, false, false, false];
  // Mark dice used if their numbers appear in expression counting number of appearances
  let tempExpr = expression;
  let diceCount = {};
  diceValues.forEach(v => diceCount[v] = 0);

  // Count dice values used from expression by parsing numbers in order
  // We'll extract all numbers (multi-digit) from expression
  const nums = expression.match(/\d+/g) || [];
  nums.forEach(nStr => {
    const n = parseInt(nStr);
    if(diceCount[n] !== undefined) diceCount[n]++;
  });

  // Now for each dice, mark used if its count is > 0 and decrement count to not reuse same die twice
  diceValues.forEach((val, idx) => {
    if(diceCount[val] && diceCount[val] > 0) {
      usedDice[idx] = true;
      diceCount[val]--;
    }
  });
  renderDice();
}

function updateExpressionBox() {
  expressionBox.textContent = expression;
}

function evaluateExpression() {
  if(expression.trim() === "") {
    evaluationBox.textContent = "?";
    return;
  }
  try {
    // Evaluate with factorial support and ^ as exponentiation

    // Replace ^ with ** for JS eval
    let toEval = expression.replace(/\^/g, "**");

    // Replace factorials: support !!!, !!, and !
    // We'll use a regex to find numbers or parenthesized expressions followed by factorials
    // We'll do repeated replacements until none left to handle nested factorials

    function factorial(n) {
      if(n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
      if(n === 0 || n === 1) return 1;
      let f = 1;
      for(let i=2; i<=n; i++) f *= i;
      return f;
    }

    function doubleFactorial(n) {
      if(n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
      if(n === 0 || n === -1) return 1;
      let f = 1;
      for(let i=n; i>0; i-=2) f *= i;
      return f;
    }

    function tripleFactorial(n) {
      if(n < 0 || !Number.isInteger(n)) throw "Invalid factorial";
      if(n <= 0) return 1;
      let f = 1;
      for(let i=n; i>0; i-=3) f *= i;
      return f;
    }

    // Helper to compute factorial expression
    function computeFactorial(match, expr, factMarks) {
      // Evaluate expr safely (no factorials inside here)
      let val = Function(`"use strict";return (${expr})`)();
      if(!Number.isInteger(val) || val < 0) throw "Invalid factorial input";
      switch(factMarks.length) {
        case 1: return factorial(val);
        case 2: return doubleFactorial(val);
        case 3: return tripleFactorial(val);
        default: throw "Invalid factorial marks";
      }
    }

    // Replace factorial patterns until none remain
    let regex = /(\([^()]+\)|\d+)(!{1,3})/g;
    while(regex.test(toEval)) {
      toEval = toEval.replace(regex, (m, expr, factMarks) => {
        try {
          return computeFactorial(m, expr, factMarks);
        } catch {
          throw "Invalid factorial";
        }
      });
    }

    let val = Function(`"use strict";return (${toEval})`)();

    if(typeof val === "number" && !isNaN(val) && isFinite(val)) {
      evaluationBox.textContent = val.toFixed(4).replace(/\.?0+$/,"");
    } else {
      evaluationBox.textContent = "?";
    }
  } catch {
    evaluationBox.textContent = "?";
  }
}

function validateExpression() {
  if(expression.trim() === "") return false;

  // Must use all 5 dice exactly once each in expression
  // Count dice usage similarly as updateUsedDice
  let diceCount = {};
  diceValues.forEach(v => diceCount[v] = 0);

  const nums = expression.match(/\d+/g) || [];
  nums.forEach(nStr => {
    const n = parseInt(nStr);
    if(diceCount[n] !== undefined) diceCount[n]++;
  });

  // Check each dice appears exactly once
  for(let i=0; i<5; i++) {
    const val = diceValues[i];
    if(!diceCount[val] || diceCount[val] < 1) return false;
    diceCount[val]--;
  }

  // Also check diceCount values are not more than dice appearences
  // (e.g. if a number appears twice but only one die)
  for(let k in diceCount) {
    if(diceCount[k] > 0) return false;
  }

  // Check for invalid chars (only digits, operators, spaces allowed)
  if(!/^[0-9+\-*/^()! ]+$/.test(expression)) return false;

  // Evaluate expression to check no error and result between 1 and 100 integer
  try {
    let val = parseFloat(evaluationBox.textContent);
    if(isNaN(val) || val < 1 || val > 100) return false;
    if(!Number.isInteger(val)) return false;
  } catch {
    return false;
  }

  return true;
}

function submitExpression() {
  if(!validateExpression()) {
    alert("Invalid expression or must use all 5 dice exactly once.\
