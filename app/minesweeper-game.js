/**
 * Minesweeper Game Core Engine
 * Decoupled logic usable in both Node.js (Jest unit tests) and browser environments.
 */

class MinesweeperGame {
  static DIFFICULTIES = {
    easy: { name: 'Easy', rows: 9, cols: 9, mines: 10 },
    medium: { name: 'Medium', rows: 16, cols: 16, mines: 40 },
    hard: { name: 'Hard', rows: 16, cols: 30, mines: 99 }
  };

  /**
   * @param {string|object} difficulty - Preset name ('easy', 'medium', 'hard') or custom config {rows, cols, mines}
   */
  constructor(difficulty = 'easy') {
    this.configureDifficulty(difficulty);
    this.resetGame();
  }

  /**
   * Configure board difficulty parameters
   */
  configureDifficulty(difficulty) {
    if (typeof difficulty === 'string' && MinesweeperGame.DIFFICULTIES[difficulty]) {
      const config = MinesweeperGame.DIFFICULTIES[difficulty];
      this.rows = config.rows;
      this.cols = config.cols;
      this.totalMines = config.mines;
      this.difficultyName = difficulty;
    } else if (typeof difficulty === 'object' && difficulty !== null) {
      this.rows = Math.max(2, Math.min(40, difficulty.rows || 9));
      this.cols = Math.max(2, Math.min(50, difficulty.cols || 9));
      const maxMines = Math.floor((this.rows * this.cols) * 0.8);
      this.totalMines = Math.max(1, Math.min(maxMines, difficulty.mines || 10));
      this.difficultyName = 'custom';
    } else {
      const config = MinesweeperGame.DIFFICULTIES.easy;
      this.rows = config.rows;
      this.cols = config.cols;
      this.totalMines = config.mines;
      this.difficultyName = 'easy';
    }
  }

  /**
   * Reset game state and recreate board
   */
  resetGame() {
    this.board = this.createBoard(this.rows, this.cols);
    this.minesPlaced = false;
    this.flagsCount = 0;
    this.revealedCount = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.gameStarted = false;
    this.elapsedSeconds = 0;
    this.statusMessage = 'Ready to play! Click any cell to begin.';
    this.stopTimer();
  }

  /**
   * Create empty 2D board grid
   */
  createBoard(rows, cols) {
    const board = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          isExploded: false,
          adjacentMines: 0
        });
      }
      board.push(row);
    }
    return board;
  }

  /**
   * Randomly place mines avoiding duplicate positions and optionally safe zone on first click
   */
  placeMines(safeRow = null, safeCol = null) {
    let minesPlaced = 0;
    const totalCells = this.rows * this.cols;
    const targetMines = Math.min(this.totalMines, totalCells - 1);

    // Build available positions pool
    const pool = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // If safe coordinates provided, reserve safe cell
        if (safeRow !== null && safeCol !== null && r === safeRow && c === safeCol) {
          continue;
        }
        pool.push({ r, c });
      }
    }

    // Shuffle pool (Fisher-Yates) and pick positions
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (let i = 0; i < targetMines && i < pool.length; i++) {
      const { r, c } = pool[i];
      this.board[r][c].isMine = true;
      minesPlaced++;
    }

    this.minesPlaced = true;
    this.calculateAdjacentMines();
  }

  /**
   * Compute adjacent mine counts for each cell on the board
   */
  calculateAdjacentMines() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c].isMine) {
          this.board[r][c].adjacentMines = 0;
          continue;
        }

        let count = 0;
        const neighbors = this.getNeighbors(r, c);
        for (const neighbor of neighbors) {
          if (neighbor.isMine) {
            count++;
          }
        }
        this.board[r][c].adjacentMines = count;
      }
    }
  }

  /**
   * Get valid 8-directional neighbor cells
   */
  getNeighbors(row, col) {
    const neighbors = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        neighbors.push(this.board[nr][nc]);
      }
    }
    return neighbors;
  }

  /**
   * Reveal cell at specified coordinates
   */
  revealCell(row, col) {
    if (this.gameOver || this.gameWon) return { changed: false };

    // Validate bounds
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return { changed: false };
    }

    const cell = this.board[row][col];

    // Cannot reveal flagged or already revealed cell
    if (cell.isRevealed || cell.isFlagged) {
      return { changed: false };
    }

    // First click initialization: place mines ensuring safe first click
    if (!this.minesPlaced) {
      this.placeMines(row, col);
      this.startGameTimer();
    }

    // Check if cell is mine
    if (cell.isMine) {
      cell.isExploded = true;
      cell.isRevealed = true;
      this.endGame(false);
      return { changed: true, event: 'game_over', cell };
    }

    // Normal safe reveal
    cell.isRevealed = true;
    this.revealedCount++;

    // If blank (0 adjacent mines), recursively reveal neighbors
    if (cell.adjacentMines === 0) {
      this.revealEmptyCells(row, col);
    }

    // Check win condition
    if (this.checkWin()) {
      this.endGame(true);
      return { changed: true, event: 'game_win', cell };
    }

    return { changed: true, event: 'revealed', cell };
  }

  /**
   * Breadth-first / recursive reveal of adjacent safe cells when adjacentMines === 0
   */
  revealEmptyCells(startRow, startCol) {
    const queue = [{ r: startRow, c: startCol }];
    const visited = new Set();
    visited.add(`${startRow},${startCol}`);

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.getNeighbors(current.r, current.c);

      for (const neighbor of neighbors) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
          neighbor.isRevealed = true;
          this.revealedCount++;

          if (neighbor.adjacentMines === 0) {
            queue.push({ r: neighbor.row, c: neighbor.col });
          }
        }
      }
    }
    if (this.checkWin()) {
      this.endGame(true);
    }
  }

  /**
   * Toggle flag on a cell
   */
  toggleFlag(row, col) {
    if (this.gameOver || this.gameWon) return false;
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;

    const cell = this.board[row][col];
    if (cell.isRevealed) return false;

    if (!this.gameStarted && !this.minesPlaced) {
      this.startGameTimer();
    }

    cell.isFlagged = !cell.isFlagged;
    this.flagsCount += cell.isFlagged ? 1 : -1;

    return true;
  }

  /**
   * Check if winning condition is satisfied
   * Win is met when all non-mine cells have been revealed
   */
  checkWin() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.board[r][c];

        if (!cell.isMine && !cell.isRevealed) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * End game logic (win or lose)
   */
  endGame(isWin) {
    this.stopTimer();
    this.gameOver = !isWin;
    this.gameWon = isWin;

    if (isWin) {
      this.statusMessage = 'Victory! All safe cells cleared!';
      // Automatically flag all unflagged mines on win
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.board[r][c].isMine) {
            this.board[r][c].isFlagged = true;
          }
        }
      }
      this.flagsCount = this.totalMines;
    } else {
      this.statusMessage = 'Game Over! You hit a mine.';
      // Reveal all mines on lose
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.board[r][c];
          if (cell.isMine) {
            cell.isRevealed = true;
          } else if (cell.isFlagged && !cell.isMine) {
            cell.isFalseFlag = true;
          }
        }
      }
    }
  }

  /**
   * Get remaining mine count (total mines - flags)
   */
  getRemainingMines() {
    return this.totalMines - this.flagsCount;
  }

  /**
   * Start timer handler
   */
  startGameTimer() {
    this.gameStarted = true;
    if (typeof this.onTimerTick === 'function' && !this.timerInterval) {
      this.timerInterval = setInterval(() => {
        this.elapsedSeconds++;
        this.onTimerTick(this.elapsedSeconds);
      }, 1000);
    }
  }

  /**
   * Stop timer handler
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

// Export for Node/CommonJS (Jest) and Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MinesweeperGame;
}
if (typeof window !== 'undefined') {
  window.MinesweeperGame = MinesweeperGame;
}
