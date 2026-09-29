const MinesweeperGame = require('../minesweeper-game');

describe('MinesweeperGame Test Suite', () => {
  let game;

  beforeEach(() => {
    game = new MinesweeperGame('easy');
  });

  afterEach(() => {
    game.stopTimer();
  });

  describe('1. Board Generation & Dimensions', () => {
    test('should generate a 9x9 board for easy difficulty', () => {
      expect(game.rows).toBe(9);
      expect(game.cols).toBe(9);
      expect(game.totalMines).toBe(10);
      expect(game.board.length).toBe(9);
      expect(game.board[0].length).toBe(9);
    });

    test('should generate correct cell structures', () => {
      const cell = game.board[0][0];
      expect(cell).toHaveProperty('row', 0);
      expect(cell).toHaveProperty('col', 0);
      expect(cell).toHaveProperty('isMine', false);
      expect(cell).toHaveProperty('isRevealed', false);
      expect(cell).toHaveProperty('isFlagged', false);
      expect(cell).toHaveProperty('adjacentMines', 0);
    });
  });

  describe('2. Difficulty Configuration', () => {
    test('should configure medium difficulty properly (16x16, 40 mines)', () => {
      const medGame = new MinesweeperGame('medium');
      expect(medGame.rows).toBe(16);
      expect(medGame.cols).toBe(16);
      expect(medGame.totalMines).toBe(40);
      expect(medGame.board.length).toBe(16);
      expect(medGame.board[0].length).toBe(16);
      medGame.stopTimer();
    });

    test('should configure hard difficulty properly (16x30, 99 mines)', () => {
      const hardGame = new MinesweeperGame('hard');
      expect(hardGame.rows).toBe(16);
      expect(hardGame.cols).toBe(30);
      expect(hardGame.totalMines).toBe(99);
      expect(hardGame.board.length).toBe(16);
      expect(hardGame.board[0].length).toBe(30);
      hardGame.stopTimer();
    });

    test('should handle custom difficulty parameters with safe boundaries', () => {
      const customGame = new MinesweeperGame({ rows: 12, cols: 12, mines: 15 });
      expect(customGame.rows).toBe(12);
      expect(customGame.cols).toBe(12);
      expect(customGame.totalMines).toBe(15);
      customGame.stopTimer();
    });
  });

  describe('3. Mine Placement & No Duplicate Mines', () => {
    test('should place exact number of mines without exceeding total', () => {
      game.placeMines();
      let actualMines = 0;
      for (let r = 0; r < game.rows; r++) {
        for (let c = 0; c < game.cols; c++) {
          if (game.board[r][c].isMine) actualMines++;
        }
      }
      expect(actualMines).toBe(10);
    });

    test('should ensure no duplicate mine positions exist', () => {
      game.placeMines();
      const minePositions = new Set();
      for (let r = 0; r < game.rows; r++) {
        for (let c = 0; c < game.cols; c++) {
          if (game.board[r][c].isMine) {
            const key = `${r}-${c}`;
            expect(minePositions.has(key)).toBe(false);
            minePositions.add(key);
          }
        }
      }
      expect(minePositions.size).toBe(10);
    });

    test('should respect safe cell on first click', () => {
      const safeR = 4;
      const safeC = 4;
      game.placeMines(safeR, safeC);
      expect(game.board[safeR][safeC].isMine).toBe(false);
    });
  });

  describe('4. Neighbor Mine Calculation', () => {
    test('should correctly compute adjacent mine numbers for surrounded cells', () => {
      // Create manual 3x3 test board
      const customGame = new MinesweeperGame({ rows: 3, cols: 3, mines: 1 });
      customGame.resetGame();

      // Manually set mines: place mine at (0,0) and (2,2)
      customGame.board[0][0].isMine = true;
      customGame.board[2][2].isMine = true;
      customGame.totalMines = 2;
      customGame.minesPlaced = true;
      customGame.calculateAdjacentMines();

      // Center cell (1,1) has 2 adjacent mines
      expect(customGame.board[1][1].adjacentMines).toBe(2);
      // Cell (0,1) is neighbor to (0,0) only -> 1 adjacent mine
      expect(customGame.board[0][1].adjacentMines).toBe(1);
      // Cell (0,2) is not adjacent to either mine -> 0
      expect(customGame.board[0][2].adjacentMines).toBe(0);

      customGame.stopTimer();
    });
  });

  describe('5. Safe Cell Detection & Recursive Blank Reveal', () => {
    test('should reveal adjacent empty cells automatically on 0-count cell reveal', () => {
      // Create a 4x4 board with 1 mine at corner (3,3)
      const customGame = new MinesweeperGame({ rows: 4, cols: 4, mines: 1 });
      customGame.resetGame();
      customGame.board[3][3].isMine = true;
      customGame.totalMines = 1;
      customGame.minesPlaced = true;
      customGame.calculateAdjacentMines();

      // Cell (0,0) has 0 adjacent mines
      expect(customGame.board[0][0].adjacentMines).toBe(0);

      // Reveal (0,0)
      customGame.revealCell(0, 0);

      // (0,0), (0,1), (1,0), (1,1) etc. should be recursively revealed
      expect(customGame.board[0][0].isRevealed).toBe(true);
      expect(customGame.board[0][1].isRevealed).toBe(true);
      expect(customGame.board[1][0].isRevealed).toBe(true);
      expect(customGame.board[1][1].isRevealed).toBe(true);

      // Mine at (3,3) must NOT be revealed
      expect(customGame.board[3][3].isRevealed).toBe(false);

      customGame.stopTimer();
    });
  });

  describe('6. Flag Toggling', () => {
    test('should toggle flag on unrevealed cell and update mine counter', () => {
      expect(game.getRemainingMines()).toBe(10);

      const toggled = game.toggleFlag(2, 3);
      expect(toggled).toBe(true);
      expect(game.board[2][3].isFlagged).toBe(true);
      expect(game.getRemainingMines()).toBe(9);

      // Toggle off
      game.toggleFlag(2, 3);
      expect(game.board[2][3].isFlagged).toBe(false);
      expect(game.getRemainingMines()).toBe(10);
    });

    test('should prevent revealing a flagged cell', () => {
      game.toggleFlag(1, 1);
      const res = game.revealCell(1, 1);
      expect(res.changed).toBe(false);
      expect(game.board[1][1].isRevealed).toBe(false);
    });

    test('should not toggle flag on already revealed cell', () => {
      // Reveal cell
      game.revealCell(0, 0);
      const toggled = game.toggleFlag(0, 0);
      expect(toggled).toBe(false);
      expect(game.board[0][0].isFlagged).toBe(false);
    });
  });

  describe('7. Win Condition', () => {
    test('should detect victory when all non-mine cells are revealed', () => {
      // 2x2 board with 1 mine at (1,1)
      const miniGame = new MinesweeperGame({ rows: 2, cols: 2, mines: 1 });
      miniGame.resetGame();
      miniGame.board[1][1].isMine = true;
      miniGame.totalMines = 1;
      miniGame.minesPlaced = true;
      miniGame.calculateAdjacentMines();

      miniGame.revealCell(0, 0);
      miniGame.revealCell(0, 1);
      miniGame.revealCell(1, 0);

      expect(miniGame.gameWon).toBe(true);
      expect(miniGame.gameOver).toBe(false);
      expect(miniGame.statusMessage).toContain('Victory');

      miniGame.stopTimer();
    });
  });

  describe('8. Lose Condition', () => {
    test('should trigger game over when a mine is clicked', () => {
      // 3x3 board with mine at (1,1)
      const miniGame = new MinesweeperGame({ rows: 3, cols: 3, mines: 1 });
      miniGame.resetGame();
      miniGame.board[1][1].isMine = true;
      miniGame.totalMines = 1;
      miniGame.minesPlaced = true;
      miniGame.calculateAdjacentMines();

      const result = game.revealCell.call(miniGame, 1, 1);
      expect(result.event).toBe('game_over');
      expect(miniGame.gameOver).toBe(true);
      expect(miniGame.gameWon).toBe(false);
      expect(miniGame.board[1][1].isExploded).toBe(true);
      expect(miniGame.statusMessage).toContain('Game Over');

      miniGame.stopTimer();
    });
  });

  describe('9. Game Reset & State Persistence', () => {
    test('resetGame should return game to pristine initial state', () => {
      game.revealCell(0, 0);
      game.toggleFlag(1, 1);
      expect(game.flagsCount).toBeGreaterThanOrEqual(1);

      game.resetGame();
      expect(game.flagsCount).toBe(0);
      expect(game.revealedCount).toBe(0);
      expect(game.gameOver).toBe(false);
      expect(game.gameWon).toBe(false);
      expect(game.minesPlaced).toBe(false);
    });
  });
});
