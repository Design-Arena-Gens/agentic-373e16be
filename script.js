const landingSection = document.getElementById("landing");
const gameSection = document.getElementById("game");
const boardElement = document.getElementById("board");
const cells = Array.from(boardElement.querySelectorAll(".cell"));
const modeButtons = document.querySelectorAll(".mode-btn");
const backBtn = document.getElementById("back-btn");
const resetBtn = document.getElementById("reset-btn");
const turnIndicator = document.getElementById("turn-indicator");
const resultOverlay = document.getElementById("result");
const resultText = document.getElementById("result-text");
const playAgainBtn = document.getElementById("play-again-btn");
const menuBtn = document.getElementById("menu-btn");
const scoreXEl = document.getElementById("score-x");
const scoreOEl = document.getElementById("score-o");

const winningCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const SoundEngine = (() => {
  let ctx;
  const startCtx = () => {
    if (ctx) return ctx;
    const AudioContext =
      window.AudioContext || window.webkitAudioContext || null;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    return ctx;
  };

  const playTone = (frequency, duration, type = "sawtooth", gain = 0.08) => {
    const audioCtx = startCtx();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  const playSketchScribble = () => {
    playTone(340, 0.15, "square", 0.07);
    setTimeout(() => playTone(480, 0.12, "triangle", 0.05), 40);
  };

  const playVictory = () => {
    playTone(520, 0.2, "sawtooth", 0.08);
    setTimeout(() => playTone(660, 0.25, "triangle", 0.06), 80);
    setTimeout(() => playTone(780, 0.3, "square", 0.05), 180);
  };

  const playDraw = () => {
    playTone(440, 0.18, "triangle", 0.06);
    setTimeout(() => playTone(360, 0.22, "sine", 0.05), 120);
  };

  const getContext = () => ctx;

  return {
    sketch: playSketchScribble,
    victory: playVictory,
    draw: playDraw,
    getContext,
  };
})();

let gameState = {
  mode: "cpu",
  board: Array(9).fill(null),
  currentPlayer: "X",
  running: false,
  scores: { X: 0, O: 0 },
  winLineEl: null,
};

const resetBoardState = (preserveTurn = false) => {
  gameState.board = Array(9).fill(null);
  cells.forEach((cell) => {
    cell.classList.remove("filled");
    const mark = cell.querySelector(".mark");
    if (mark) mark.remove();
  });
  if (gameState.winLineEl) {
    gameState.winLineEl.remove();
    gameState.winLineEl = null;
  }
  if (!preserveTurn) {
    gameState.currentPlayer = "X";
  }
  updateTurnIndicator();
  gameState.running = true;
  boardElement.classList.remove("board-enter");
  void boardElement.offsetWidth; // restart animation
  boardElement.classList.add("board-enter");
};

const updateTurnIndicator = () => {
  turnIndicator.textContent = `${gameState.currentPlayer}'s turn`;
};

const startGame = (mode) => {
  gameState.mode = mode;
  landingSection.classList.add("hidden");
  setTimeout(() => {
    landingSection.style.display = "none";
    gameSection.classList.remove("hidden");
    gameSection.style.display = "grid";
    resetBoardState();
  }, 350);
};

const showLanding = () => {
  gameState.scores = { X: 0, O: 0 };
  updateScores();
  landingSection.style.display = "block";
  requestAnimationFrame(() => landingSection.classList.remove("hidden"));
  gameSection.classList.add("hidden");
  setTimeout(() => {
    gameSection.style.display = "none";
  }, 350);
  resetBoardState();
};

const updateScores = () => {
  scoreXEl.textContent = gameState.scores.X;
  scoreOEl.textContent = gameState.scores.O;
};

const createMarkElement = (player) => {
  const wrapper = document.createElement("span");
  wrapper.className = `mark ${player.toLowerCase()}`;

  if (player === "X") {
    wrapper.innerHTML = `
      <svg viewBox="0 0 100 100">
        <path d="M 20 20 L 80 80" />
        <path d="M 80 20 L 20 80" />
      </svg>
    `;
  } else {
    wrapper.innerHTML = `
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="30" />
      </svg>
    `;
  }

  return wrapper;
};

const placeMark = (index, player) => {
  gameState.board[index] = player;
  const cell = cells[index];
  cell.classList.add("filled");
  const mark = createMarkElement(player);
  cell.appendChild(mark);
  SoundEngine.sketch();
  cell.classList.add("pop");
  setTimeout(() => cell.classList.remove("pop"), 300);
};

const removeResultOverlay = () => {
  resultOverlay.classList.add("hidden");
};

const showResult = (text) => {
  resultText.textContent = text;
  resultOverlay.classList.remove("hidden");
};

const checkForWinner = (board) => {
  for (const combo of winningCombos) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  if (board.every((cell) => cell)) {
    return { winner: null, combo: null };
  }
  return null;
};

const createWinLine = (combo) => {
  const firstCell = cells[combo[0]].getBoundingClientRect();
  const lastCell = cells[combo[2]].getBoundingClientRect();
  const boardRect = boardElement.getBoundingClientRect();

  const start = {
    x: firstCell.left + firstCell.width / 2 - boardRect.left,
    y: firstCell.top + firstCell.height / 2 - boardRect.top,
  };
  const end = {
    x: lastCell.left + lastCell.width / 2 - boardRect.left,
    y: lastCell.top + lastCell.height / 2 - boardRect.top,
  };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const midPoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  const line = document.createElement("div");
  line.className = "win-line";
  line.style.width = `${distance}px`;
  line.style.left = `${midPoint.x - distance / 2}px`;
  line.style.top = `${midPoint.y - 3}px`;
  line.style.transform = `rotate(${angle}rad)`;

  boardElement.appendChild(line);
  gameState.winLineEl = line;
};

const switchPlayer = () => {
  gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
  updateTurnIndicator();
};

const minimax = (board, player) => {
  const opponent = player === "O" ? "X" : "O";
  const result = checkForWinner(board);

  if (result) {
    if (result.winner === "O") return { score: 10 };
    if (result.winner === "X") return { score: -10 };
    return { score: 0 };
  }

  const moves = [];
  board.forEach((val, idx) => {
    if (!val) {
      const newBoard = board.slice();
      newBoard[idx] = player;
      const outcome = minimax(newBoard, opponent);
      moves.push({
        index: idx,
        score: outcome.score,
      });
    }
  });

  let bestMove;
  if (player === "O") {
    let bestScore = -Infinity;
    moves.forEach((move) => {
      if (move.score > bestScore) {
        bestScore = move.score;
        bestMove = move;
      }
    });
  } else {
    let bestScore = Infinity;
    moves.forEach((move) => {
      if (move.score < bestScore) {
        bestScore = move.score;
        bestMove = move;
      }
    });
  }

  return bestMove;
};

const handleCpuMove = () => {
  if (!gameState.running) return;
  const availableMoves = [];
  gameState.board.forEach((val, idx) => {
    if (!val) availableMoves.push(idx);
  });

  let selectedIndex;
  if (availableMoves.length === 9) {
    selectedIndex = Math.floor(Math.random() * availableMoves.length);
    selectedIndex = availableMoves[selectedIndex];
  } else {
    const bestMove = minimax(gameState.board.slice(), "O");
    selectedIndex = bestMove ? bestMove.index : availableMoves[0];
  }

  setTimeout(() => {
    placeMark(selectedIndex, "O");
    const outcome = checkForWinner(gameState.board);
    if (outcome) {
      concludeGame(outcome);
      return;
    }
    switchPlayer();
    gameState.running = true;
  }, 480);
};

const concludeGame = ({ winner, combo }) => {
  gameState.running = false;
  if (combo) createWinLine(combo);

  if (winner) {
    gameState.scores[winner] += 1;
    updateScores();
    showResult(`${winner} Wins!`);
    SoundEngine.victory();
  } else {
    showResult("Draw Game");
    SoundEngine.draw();
  }
};

const onCellClick = (event) => {
  const cell = event.currentTarget;
  const index = Number(cell.dataset.index);

  if (!gameState.running || gameState.board[index]) return;

  placeMark(index, gameState.currentPlayer);
  const outcome = checkForWinner(gameState.board);
  if (outcome) {
    concludeGame(outcome);
    return;
  }

  switchPlayer();
  if (gameState.mode === "cpu" && gameState.currentPlayer === "O") {
    gameState.running = false;
    handleCpuMove();
  }
};

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode === "cpu" ? "cpu" : "local";
    startGame(mode);
    gameState.running = true;
  });
});

cells.forEach((cell) => cell.addEventListener("click", onCellClick));

backBtn.addEventListener("click", () => {
  showLanding();
});

resetBtn.addEventListener("click", () => {
  removeResultOverlay();
  resetBoardState(true);
});

playAgainBtn.addEventListener("click", () => {
  removeResultOverlay();
  resetBoardState();
  gameState.running = true;
  if (gameState.mode === "cpu" && gameState.currentPlayer === "O") {
    gameState.running = false;
    handleCpuMove();
  }
});

menuBtn.addEventListener("click", () => {
  removeResultOverlay();
  showLanding();
});

resultOverlay.addEventListener("click", (event) => {
  if (event.target === resultOverlay) {
    removeResultOverlay();
  }
});

document.addEventListener("visibilitychange", () => {
  const ctx = SoundEngine.getContext?.();
  if (document.visibilityState === "hidden" && ctx) {
    try {
      ctx.suspend();
    } catch (err) {
      // ignore
    }
  }
});

// Initial state
landingSection.classList.remove("hidden");
gameSection.classList.add("hidden");
gameSection.style.display = "none";
resultOverlay.classList.add("hidden");
