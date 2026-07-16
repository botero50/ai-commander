/**
 * Chess Board Display — Shows ASCII visual of current board position
 *
 * Displays:
 * - 8x8 chess board with piece symbols
 * - Rank numbers and file letters
 * - Last move highlighted
 * - Clear visual representation
 */

export class BoardDisplay {
  constructor() {
    // Piece symbols
    this.pieces = {
      p: '♟', P: '♙',
      n: '♞', N: '♘',
      b: '♝', B: '♗',
      r: '♜', R: '♖',
      q: '♛', Q: '♕',
      k: '♚', K: '♔',
    };
  }

  /**
   * Display current board position from FEN
   * @param {string} fen - FEN string of current position
   * @param {string} lastMove - Last move in SAN notation (for highlighting)
   */
  display(fen, lastMove = '') {
    // Parse FEN to get board position
    const boardPart = fen.split(' ')[0];
    const board = this.fenToBoard(boardPart);

    // Display the board
    console.log('\n' + this.renderBoard(board, lastMove) + '\n');
  }

  /**
   * Convert FEN position to 2D board array
   */
  fenToBoard(fenBoard) {
    const board = [];
    const rows = fenBoard.split('/');

    for (const row of rows) {
      const boardRow = [];
      for (const char of row) {
        if (isNaN(char)) {
          // It's a piece
          boardRow.push(char);
        } else {
          // It's empty squares
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push('.');
          }
        }
      }
      board.push(boardRow);
    }

    return board;
  }

  /**
   * Render board as ASCII art
   */
  renderBoard(board, lastMove = '') {
    const files = 'abcdefgh';
    let output = '  ┌───┬───┬───┬───┬───┬───┬───┬───┐\n';

    // Rows from top (rank 8) to bottom (rank 1)
    for (let rank = 0; rank < 8; rank++) {
      const rankNum = 8 - rank;
      output += rankNum + ' │';

      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        const square = files[file] + rankNum;

        // Highlight last move
        const isLastMove = lastMove.includes(square);
        const bgColor = isLastMove ? '\x1b[43m' : '';
        const resetColor = isLastMove ? '\x1b[0m' : '';

        // Alternate square colors
        const isLight = (rank + file) % 2 === 0;
        const squareColor = isLight ? '\x1b[47m' : '\x1b[40m';

        const displayPiece = piece === '.' ? ' ' : this.pieces[piece] || piece;
        output += bgColor + squareColor + ' ' + displayPiece + ' ' + resetColor + '│';
      }

      output += '\n';
      if (rank < 7) {
        output += '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n';
      }
    }

    output += '  └───┴───┴───┴───┴───┴───┴───┴───┘\n';
    output += '    a   b   c   d   e   f   g   h\n';

    return output;
  }

  /**
   * Convert move notation to square names for highlighting
   * @param {string} moveNotation - Move in SAN or algebraic notation
   * @returns {string} Move for highlighting
   */
  getMoveForDisplay(moveNotation) {
    // Extract from and to squares from move notation
    // For now, just return the last two characters (to square)
    // A full implementation would parse the notation properly
    return moveNotation.toLowerCase();
  }
}
