import { Chess } from 'chess.js';

interface GameMessage {
  type: string;
  moveNumber?: number;
  move?: string;
  whitePlayer?: { model: string };
  blackPlayer?: { model: string };
}

export function generatePGN(messages: GameMessage[]): string {
  const chess = new Chess();
  const moves: string[] = [];

  // Extract all moves from messages
  const gameMoves = messages
    .filter((m) => m.type === 'MovePlayed')
    .map((m) => m.move)
    .filter((move): move is string => !!move);

  // Play all moves to validate
  for (const move of gameMoves) {
    try {
      chess.move(move, { sloppy: true });
      moves.push(move);
    } catch (error) {
      console.error('Invalid move:', move, error);
    }
  }

  // Get player info
  const gameStartEvent = messages.find((m) => m.type === 'GameStarted');
  const whitePlayer = gameStartEvent?.whitePlayer?.model || 'Ollama';
  const blackPlayer = gameStartEvent?.blackPlayer?.model || 'Ollama';

  // Generate PGN headers
  const date = new Date().toISOString().split('T')[0];
  const headers = [
    `[Event "AI Commander Chess Match"]`,
    `[Site "AI Commander"]`,
    `[Date "${date}"]`,
    `[Round "1"]`,
    `[White "${whitePlayer}"]`,
    `[Black "${blackPlayer}"]`,
    `[Result "${getResult(chess)}"]`,
    `[FEN "${chess.fen()}"]`,
  ].join('\n');

  // Format moves in PGN style (1. e4 e5 2. Nf3 ...)
  const moveList = formatMoveList(moves);

  return `${headers}\n\n${moveList}`;
}

function formatMoveList(moves: string[]): string {
  let pgn = '';
  let moveCount = 1;

  for (let i = 0; i < moves.length; i += 2) {
    pgn += `${moveCount}. ${moves[i] || ''} `;
    if (i + 1 < moves.length) {
      pgn += `${moves[i + 1] || ''} `;
    }
    moveCount++;
  }

  return pgn.trim();
}

function getResult(chess: Chess): string {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? '0-1' : '1-0';
  }
  if (chess.isDraw()) {
    return '1/2-1/2';
  }
  return '*';
}

export function downloadPGN(pgnContent: string, filename: string = 'chess-game.pgn'): void {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(pgnContent));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
