document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const weekSelector = document.getElementById("weekSelector");
  const diceContainer = document.getElementById("diceContainer");
  const buttonContainer = document.getElementById("buttonContainer");
  const expressionBox = document.getElementById("expressionBox");
  const resultValue = document.getElementById("resultValue");
  const submitBtn = document.getElementById("submitBtn");
  const backspaceBtn = document.getElementById("backspaceBtn");
  const clearBtn = document.getElementById("clearBtn");
  const completedCountSpan = document.getElementById("completedCount");
  const gridContainer = document.getElementById("gridContainer");
  const popup = document.getElementById("popup");

  // Dice colors map
  const diceColors = {
    1: "white",
    2: "black",
    3: "blue",
    4: "yellow",
    5: "green",
    6: "yellow-black",
  };

  // Variables
  let weeksList = [];
  let currentWeekIndex = 1;
  let diceValues = [];
  let expressionArr = [];
  let usedDiceIndices = new Set();
  let diceUsedCount = 0;
  let completedNumbers = new Set();

  // Initialize weeks from 5/11/2025 every 7 days up to current date
  function initWeeks() {
    weeksList = [];
    const startDate = new Date(2025, 4, 11); // May 11, 2025 (month 0-based)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let current = new Date(startDate);

    while (current <= today) {
      weeksList.push({ date: new Date(current) });
      current.setDate(current.getDate() + 7);
    }
  }

  // Generate dice from date (seeded)
  function generateDice(date) {
    // Simple deterministic dice generator from date
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    let vals = [];
    for (let i = 0; i < 5; i++) {
      vals.push(((seed + i * 7) % 6) + 1);
    }
    return vals;
  }

  // Save data for week
  function saveWeekData(weekKey, completedNumbers, history) {
    localStorage.setItem(
      weekKey,
      JSON.stringify({
        completedNumbers: Array.from(completedNumbers),
        history,
      })
    );
  }

  // Load data for week
  function loadWeekData(weekKey) {
    const dataStr = localStorage.getItem(weekKey);
    if (!dataStr) return { completedNumbers: [], history: [] };
    try {
      return JSON.parse(dataStr);
    } catch {
      return { completedNumbers: [], history: [] };
    }
  }

  // Render week dropdown
  function renderWeekDropdown() {
    weekSelector.innerHTML = "";
    weeksList.forEach((week, index) => {
      const label = week.date.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
      const weekKey = getWeekKey(week.date);
      const data = loadWeekData(weekKey);
      const completedCount = data.completedNumbers.length;
      const star = completedCount === 100 ? " ⭐" : "";
      const option = document.createElement("option");
      option.value = index + 1;
      option.textContent = label + star;
      weekSelector.appendChild(option);
    });
  }

  // Get unique key for week by date string yyyy-mm-dd
  function getWeekKey(date) {
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    return `qu0x100-week-${yyyy}-${mm}-${dd}`;
  }

  // Render dice buttons
  function renderDice() {
    diceContainer.innerHTML = "";
    diceValues.forEach((val, idx) => {
      const die = document.createElement("button");
      die.type = "button";
      die.className = `die ${diceColors[val]}`;
      die.textContent = val;
      die.disabled = usedDiceIndices.has(idx);
      die.setAttribute("aria-label", `Die value ${val} ${die.disabled ? "used" : "available"}`);
      die.dataset.idx = idx;
      die.addEventListener("click", onDiceClick);
      diceContainer.appendChild(die);
    });
  }

  // Dice click handler
  function onDiceClick(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    if (usedDiceIndices.has(idx)) return;

    expressionArr.push({ type: "die", value: diceValues[idx], idx });
    usedDiceIndices.add(idx);
    diceUsedCount++;

    updateExpression();
    renderDice();
    updateResult();
  }

  // Render operation buttons
  function renderButtons() {
    buttonContainer.innerHTML = "";
    const ops = ["+", "-", "*", "/", "^", "!", "(", ")"];
    ops.forEach((op) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "op-btn";
      btn.textContent = op;
      btn.setAttribute("aria-label", `Operation ${op}`);
      btn.addEventListener("click", () => {
        // Append op to expression
        // Factorial can be repeated (!!, !!!)
        if (op === "!") {
          // Allow multiple factorials, add '!' to expression
          // Just append another factorial
          expressionArr.push({ type: "op", value: "!" });
        } else {
          expressionArr.push({ type: "op", value: op });
        }
        updateExpression();
        updateResult();
      });
      buttonContainer.appendChild(btn);
    });
  }

  // Update expression display
  function updateExpression() {
    expressionBox.innerHTML = "";
    expressionArr.forEach((token) => {
      const span = document.createElement("span");
      if (token.type === "die") {
        span.textContent = token.value;
        span.className = diceColors[token.value];
      } else if (token.type === "op") {
        span.textContent = token.value;
        span.className = "op-symbol";
      }
      expressionBox.appendChild(span);
    });
  }

  // Evaluate expression safely supporting factorial and exponentiation
  function evaluateExpression(exprStr) {
    function factorial(n) {
      if (n < 0 || !Number.isInteger(n)) throw "Factorial invalid";
      if (n === 0 || n === 1) return 1;
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }

    const factorialRegex = /(\d+|\([^()]+\))(!+)/g;
    let replaced = exprStr;
    let loopCount = 0;
    while (factorialRegex.test(replaced) && loopCount < 50) {
      replaced = replaced.replace(factorialRegex, (match, base, facts) => {
        let baseVal;
        if (base.startsWith("(")) {
          try {
            baseVal = eval(base);
          } catch {
            throw "Invalid factorial base";
          }
        } else {
          baseVal = Number(base);
        }
        let res = baseVal;
        for (let i = 0; i < facts.length; i++) {
          res = factorial(res);
        }
        return res;
      });
      loopCount++;
    }

    replaced = replaced.replace(/\^/g, "**");

    if (/[^-+*\/()\d.!^ \t]/.test(replaced)) throw "Invalid characters";

    return eval(replaced);
  }

  // Update the result display live
  function updateResult() {
    if (expressionArr.length === 0) {
      resultValue.textContent = "";
      return;
    }
    try {
      const exprStr = expressionArr
        .map((t) => (t.type === "die" ? t.value : t.value))
        .join("");
      const val = evaluateExpression(exprStr);
      if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
        resultValue.textContent = val.toString();
      } else {
        resultValue.textContent = "?";
      }
    } catch {
      resultValue.textContent = "?";
    }
  }

  // Clear expression and reset dice usage
  function clearExpression() {
    expressionArr = [];
    usedDiceIndices.clear();
    diceUsedCount = 0;
    updateExpression();
    updateResult();
    renderDice();
  }

  // Backspace one character/token
  function backspace() {
    if (expressionArr.length === 0) return;
    const last = expressionArr.pop();
    if (last.type === "die") {
      usedDiceIndices.delete(last.idx);
      diceUsedCount--;
    }
    updateExpression();
    updateResult();
    renderDice();
  }

  // Show popup message for 3 seconds
  function showPopup(message) {
    popup.textContent = message;
    popup.classList.remove("hidden");
    setTimeout(() => {
      popup.classList.add("hidden");
    }, 3000);
  }

  // Submit expression
  function submitExpression() {
    // Validate all dice used
    if (diceUsedCount !== 5) {
      showPopup("Please use all 5 dice in expression.");
      return;
    }

    // Evaluate expression value
    let val;
    try {
      const exprStr = expressionArr
        .map((t) => (t.type === "die" ? t.value : t.value))
        .join("");
      val = evaluateExpression(exprStr);
      if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
        showPopup("Invalid expression evaluation.");
        return;
      }
    } catch {
      showPopup("Invalid expression.");
      return;
    }

    // Round value to integer for completion check
    const intVal = Math.round(val);
    if (intVal < 1 || intVal > 100) {
      showPopup("Result must be between 1 and 100.");
      return;
    }

    if (completedNumbers.has(intVal)) {
      showPopup(`Number ${intVal} already completed.`);
      return;
    }

    // Mark number as completed
    completedNumbers.add(intVal);
    saveCurrentWeekData();
    renderGrid();
    updateCompletedCount();

    showPopup(`Number ${intVal} completed!`);

    // Clear for next input
    clearExpression();
  }

  // Save current week data to localStorage
  function saveCurrentWeekData() {
    const weekKey = getWeekKey(weeksList[currentWeekIndex - 1].date);
    saveWeekData(weekKey, completedNumbers, []);
  }

  // Load current week data
  function loadWeek() {
    const weekKey = getWeekKey(weeksList[currentWeekIndex - 1].date);
    const data = loadWeekData(weekKey);
    completedNumbers = new Set(data.completedNumbers || []);
  }

  // Render grid 1 to 100 with completed highlights
  function renderGrid() {
    gridContainer.innerHTML = "";
    for (let i = 1; i <= 100; i++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.textContent = i.toString();
      if (completedNumbers.has(i)) {
        cell.classList.add("completed");
      }
      gridContainer.appendChild(cell);
    }
  }

  // Update completed count display
  function updateCompletedCount() {
    completedCountSpan.textContent = completedNumbers.size;
  }

  // Load week and reset state
  function loadWeek() {
    loadWeekData(getWeekKey(weeksList[currentWeekIndex - 1].date));
    loadWeek();
  }

  // When week dropdown changes
  weekSelector.addEventListener("change", () => {
    currentWeekIndex = parseInt(weekSelector.value);
    loadWeek();
    clearExpression();
    renderDice();
    renderGrid();
    updateCompletedCount();
  });

  // Submit button
  submitBtn.addEventListener("click", submitExpression);

  // Backspace button
  backspaceBtn.addEventListener("click", () => {
    backspace();
  });

  // Clear button
  clearBtn.addEventListener("click", () => {
    clearExpression();
  });

  // On page load
  function loadWeek() {
    const weekKey = getWeekKey(weeksList[currentWeekIndex - 1].date);
    const data = loadWeekData(weekKey);
    completedNumbers = new Set(data.completedNumbers || []);
    diceValues = generateDice(weeksList[currentWeekIndex - 1].date);
    usedDiceIndices.clear();
    diceUsedCount = 0;
    expressionArr = [];
    updateExpression();
    updateResult();
    renderDice();
    renderGrid();
    updateCompletedCount();
  }

  // Initialize and load
  function init() {
    initWeeks();
    renderWeekDropdown();
    currentWeekIndex = getCurrentWeekIndex();
    weekSelector.value = currentWeekIndex;
    loadWeek();
    clearExpression();
    renderButtons();
  }

  init();
});
