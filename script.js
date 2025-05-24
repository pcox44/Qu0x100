<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Qu0x 100</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="top-header">
    <h1 class="title">Qu0x 100</h1>
    <div id="weekDropdownContainer">
      <select id="weekSelector"></select>
    </div>
  </div>
  <div class="instructions">
    <p>
      Use all 5 dice exactly once to build expressions that evaluate to every number from 1 to 100. Click the dice and operation buttons to form your expression. Each completed number is saved. Double/triple factorials are allowed. A new game begins every Saturday.
    </p>
  </div>
  <div class="target-counter pink-box">
    <h2>Completed Numbers: <span id="completedCount">0</span>/100</h2>
  </div>
  <div class="game-container">
    <div class="left-side">
      <div id="diceContainer"></div>
      <div id="buttonContainer"></div>
    </div>
    <div class="right-side">
      <div class="expression-container">
        <div id="expressionBox"></div>
        <div id="resultBox">= <span id="resultValue">?</span></div>
      </div>
      <div class="control-buttons">
        <button id="submitBtn" class="op-button">Submit</button>
        <button id="backspaceBtn" class="op-button">Backspace</button>
        <button id="clearBtn" class="op-button">Clear</button>
      </div>
    </div>
  </div>
  <div id="gridContainer"></div>
  <div id="popup" class="popup hidden">You must use all five dice!</div>
  <script src="script.js"></script>
</body>
</html>
