/**
 * Minesweeper Web Application Controller
 * Handles DOM interactions, Web Audio synthesis, mobile gestures, and rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const boardEl = document.getElementById('minesweeper-board');
  const minesCounterEl = document.getElementById('mines-counter');
  const timerCounterEl = document.getElementById('timer-counter');
  const btnRestart = document.getElementById('btn-restart');
  const faceIcon = document.getElementById('face-icon');
  const statusBanner = document.getElementById('status-banner');

  const diffButtons = document.querySelectorAll('.btn-diff');
  const btnModeToggle = document.getElementById('btn-mode-toggle');
  const modeStateEl = document.getElementById('mode-state');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');

  const infoModal = document.getElementById('info-modal');
  const btnInfoModal = document.getElementById('btn-info-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');

  const resultModal = document.getElementById('game-result-modal');
  const resultIcon = document.getElementById('result-icon');
  const resultTitle = document.getElementById('result-title');
  const resultMessage = document.getElementById('result-message');
  const statTime = document.getElementById('stat-time');
  const statDifficulty = document.getElementById('stat-difficulty');
  const btnModalRestart = document.getElementById('btn-modal-restart');

  // Application State
  let game = new MinesweeperGame('easy');
  let currentDifficulty = 'easy';
  let isFlagMode = false; // Mobile helper flag toggle
  let isMuted = false;
  let audioCtx = null;

  // Initialize Web Audio Context on first interaction
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Synthesized Sound Effects (No external audio file dependencies)
  function playSound(type) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'flag') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'explode') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'win') {
        // Simple 3-tone arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          noteGain.gain.setValueAtTime(0.2, now + idx * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
          noteOsc.start(now + idx * 0.1);
          noteOsc.stop(now + idx * 0.1 + 0.2);
        });
      }
    } catch {
      // Audio fallback silent
    }
  }

  // Format 3-digit LCD string
  function formatLcd(number) {
    if (number < 0) {
      const absVal = Math.min(Math.abs(number), 99);
      return `-${String(absVal).padStart(2, '0')}`;
    }
    const val = Math.min(number, 999);
    return String(val).padStart(3, '0');
  }

  // Render complete board DOM
  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${game.cols}, 1fr)`;

    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        const cellData = game.board[r][c];
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.id = `cell-${r}-${c}`;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);
        cell.dataset.row = r;
        cell.dataset.col = c;

        applyCellState(cell, cellData);

        // Cell Event Listeners
        cell.addEventListener('mousedown', (e) => {
          if (e.button === 0 && !game.gameOver && !game.gameWon) {
            faceIcon.textContent = '😮';
          }
        });

        cell.addEventListener('mouseup', () => {
          if (!game.gameOver && !game.gameWon) {
            faceIcon.textContent = '🙂';
          }
        });

        // Left Click Handler
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          if (isFlagMode) {
            handleFlag(r, c);
          } else {
            handleReveal(r, c);
          }
        });

        // Right Click Handler (Flag)
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          handleFlag(r, c);
        });

        boardEl.appendChild(cell);
      }
    }

    updateDashboard();
  }

  // Update cell visual state
  function applyCellState(cellEl, cellData) {
    cellEl.className = 'cell';
    cellEl.textContent = '';
    cellEl.removeAttribute('data-count');

    if (cellData.isRevealed) {
      cellEl.classList.add('revealed');
      if (cellData.isMine) {
        cellEl.classList.add('mine');
        cellEl.textContent = '💣';
        if (cellData.isExploded) {
          cellEl.classList.add('exploded');
          cellEl.textContent = '💥';
        }
      } else if (cellData.adjacentMines > 0) {
        cellEl.textContent = cellData.adjacentMines;
        cellEl.setAttribute('data-count', cellData.adjacentMines);
      }
    } else if (cellData.isFlagged) {
      cellEl.classList.add('flagged');
      cellEl.textContent = '🚩';
    } else if (cellData.isFalseFlag) {
      cellEl.classList.add('false-flag');
      cellEl.textContent = '❌';
    }
  }

  // Synchronize entire board state with UI
  function updateBoardState() {
    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        if (cellEl) {
          applyCellState(cellEl, game.board[r][c]);
        }
      }
    }
  }

  // Handle cell reveal logic
  function handleReveal(row, col) {
    if (game.gameOver || game.gameWon) return;

    const res = game.revealCell(row, col);
    if (!res.changed) return;

    updateBoardState();
    updateDashboard();

    if (res.event === 'game_over') {
      faceIcon.textContent = '😵';
      statusBanner.textContent = '💥 Game Over! You hit a mine.';
      statusBanner.className = 'status-banner lose';
      playSound('explode');
      showResultModal(false);
    } else if (res.event === 'game_win') {
      faceIcon.textContent = '😎';
      statusBanner.textContent = '🏆 Victory! All safe cells cleared!';
      statusBanner.className = 'status-banner win';
      playSound('win');
      showResultModal(true);
    } else {
      playSound('click');
    }
  }

  // Handle flag toggle logic
  function handleFlag(row, col) {
    if (game.gameOver || game.gameWon) return;

    const changed = game.toggleFlag(row, col);
    if (!changed) return;

    playSound('flag');
    updateBoardState();
    updateDashboard();
  }

  // Update counters and banner
  function updateDashboard() {
    minesCounterEl.textContent = formatLcd(game.getRemainingMines());
    timerCounterEl.textContent = formatLcd(game.elapsedSeconds);
  }

  // Reset Game
  function startNewGame(difficulty = currentDifficulty) {
    currentDifficulty = difficulty;
    game.stopTimer();
    game.configureDifficulty(difficulty);
    game.resetGame();

    // Hook timer callback
    game.onTimerTick = (seconds) => {
      timerCounterEl.textContent = formatLcd(seconds);
    };

    faceIcon.textContent = '🙂';
    statusBanner.textContent = 'Ready to play! Click any cell to begin.';
    statusBanner.className = 'status-banner';

    renderBoard();
  }

  // Show Result Modal
  function showResultModal(isWin) {
    setTimeout(() => {
      if (isWin) {
        resultIcon.textContent = '🏆';
        resultTitle.textContent = 'Victory!';
        resultMessage.textContent = 'Congratulations! You cleared all the safe cells without triggering a mine.';
      } else {
        resultIcon.textContent = '💥';
        resultTitle.textContent = 'Game Over';
        resultMessage.textContent = 'You hit a mine! Better luck on your next sweep.';
      }

      statTime.textContent = `${game.elapsedSeconds}s`;
      statDifficulty.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
      resultModal.classList.remove('hidden');
    }, 600);
  }

  // Event Listeners: Restart Buttons
  btnRestart.addEventListener('click', () => {
    playSound('click');
    startNewGame();
  });

  btnModalRestart.addEventListener('click', () => {
    resultModal.classList.add('hidden');
    playSound('click');
    startNewGame();
  });

  // Difficulty Switcher
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const diff = btn.dataset.difficulty;
      playSound('click');
      startNewGame(diff);
    });
  });

  // Mobile Action Mode Toggle (Dig <-> Flag)
  btnModeToggle.addEventListener('click', () => {
    isFlagMode = !isFlagMode;
    if (isFlagMode) {
      modeStateEl.className = 'mode-state flag';
      modeStateEl.textContent = '🚩 Flag Mode';
    } else {
      modeStateEl.className = 'mode-state dig';
      modeStateEl.textContent = '⛏️ Dig Mode';
    }
    playSound('click');
  });

  // Sound Toggle
  btnSoundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
  });

  // Architecture Info Modal
  btnInfoModal.addEventListener('click', () => {
    infoModal.classList.remove('hidden');
  });

  btnCloseModal.addEventListener('click', () => {
    infoModal.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      infoModal.classList.add('hidden');
    }
    if (e.target === resultModal) {
      resultModal.classList.add('hidden');
    }
  });

  // Initial Boot
  startNewGame('easy');
});
