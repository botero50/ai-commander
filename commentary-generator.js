/**
 * Commentary Generator — Generates live chess commentary
 *
 * Produces professional esports-style one-liner commentary
 * Examples:
 * - "Ollama finds a devastating fork!"
 * - "Stockfish sacrifices material for a winning attack!"
 * - "Brilliant defensive move from Black!"
 */

export class CommentaryGenerator {
  constructor() {
    this.commentary = [];
    this.lastEvent = null;
  }

  /**
   * Generate commentary for an event
   * @param {Object} event - Chess event
   * @param {string} playerName - Name of player making move
   * @returns {string} One-line commentary
   */
  generateCommentary(event, playerName) {
    if (!event || !playerName) {
      return null;
    }

    let commentary = null;

    switch (event.type) {
      case 'checkmate':
        commentary = `${playerName} delivers checkmate! Game over!`;
        break;

      case 'check':
        commentary = `${playerName} gives check!`;
        break;

      case 'capture':
        commentary = `${playerName} captures a piece!`;
        break;

      case 'queen-sacrifice':
        commentary = `${playerName} sacrifices the queen for a winning attack!`;
        break;

      case 'fork':
        commentary = `${playerName} finds a tactical fork!`;
        break;

      case 'pin':
        commentary = `${playerName} creates a dangerous pin!`;
        break;

      case 'skewer':
        commentary = `${playerName} executes a skewer!`;
        break;

      case 'promotion':
        commentary = `${playerName} promotes a pawn to a queen!`;
        break;

      case 'castling':
        commentary = `${playerName} castles to safety!`;
        break;

      case 'brilliant-move':
        commentary = `${playerName} finds a brilliant move!`;
        break;

      case 'blunder':
        commentary = `${playerName} blunders with a terrible move!`;
        break;

      case 'stalemate':
        commentary = `Stalemate! The game ends in a draw!`;
        break;

      case 'threefold-repetition':
        commentary = `Position repeated three times - draw available!`;
        break;

      case 'fifty-move-rule':
        commentary = `Fifty moves without capture or pawn move - draw available!`;
        break;

      case 'insufficient-material':
        commentary = `Insufficient material - the game ends in a draw!`;
        break;

      default:
        commentary = `${playerName} makes a move.`;
    }

    this.commentary.push({
      event: event.type,
      text: commentary,
      player: playerName,
      timestamp: Date.now(),
    });

    return commentary;
  }

  /**
   * Generate multiple commentary options and pick the best
   */
  generateBestCommentary(event, playerName) {
    const options = this.generateMultipleCommentary(event, playerName);
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Generate multiple commentary variations
   */
  generateMultipleCommentary(event, playerName) {
    const options = [];

    switch (event.type) {
      case 'checkmate':
        options.push(
          `${playerName} delivers checkmate! Game over!`,
          `It's checkmate! ${playerName} wins!`,
          `Checkmate! A stunning finish by ${playerName}!`
        );
        break;

      case 'check':
        options.push(
          `${playerName} gives check!`,
          `${playerName} checks the king!`,
          `Check from ${playerName}!`
        );
        break;

      case 'capture':
        options.push(
          `${playerName} captures a piece!`,
          `${playerName} wins material!`,
          `A piece falls to ${playerName}!`
        );
        break;

      case 'queen-sacrifice':
        options.push(
          `${playerName} sacrifices the queen!`,
          `The queen is sacrificed by ${playerName}!`,
          `Incredible queen sacrifice from ${playerName}!`
        );
        break;

      case 'fork':
        options.push(
          `${playerName} forks multiple pieces!`,
          `A devastating fork from ${playerName}!`,
          `${playerName} attacks two pieces at once!`
        );
        break;

      case 'pin':
        options.push(
          `${playerName} pins an important piece!`,
          `A dangerous pin from ${playerName}!`,
          `${playerName} creates a pin!`
        );
        break;

      case 'promotion':
        options.push(
          `${playerName} promotes to a queen!`,
          `A pawn is promoted by ${playerName}!`,
          `${playerName} brings in a new queen!`
        );
        break;

      case 'castling':
        options.push(
          `${playerName} castles to safety!`,
          `${playerName} castles!`,
          `King tucked away safely - ${playerName} castles!`
        );
        break;

      case 'brilliant-move':
        options.push(
          `Brilliant move from ${playerName}!`,
          `${playerName} finds a wonderful move!`,
          `A masterpiece from ${playerName}!`
        );
        break;

      case 'blunder':
        options.push(
          `Oh no! ${playerName} blunders!`,
          `A terrible mistake from ${playerName}!`,
          `${playerName} makes a critical error!`
        );
        break;

      default:
        options.push(`${playerName} makes a move.`);
    }

    return options;
  }

  /**
   * Get all commentary
   */
  getCommentary() {
    return this.commentary;
  }

  /**
   * Get commentary by event type
   */
  getCommentaryByEvent(eventType) {
    return this.commentary.filter((c) => c.event === eventType);
  }

  /**
   * Get last N commentary items
   */
  getRecentCommentary(count = 5) {
    return this.commentary.slice(-count);
  }

  /**
   * Clear commentary
   */
  reset() {
    this.commentary = [];
    this.lastEvent = null;
  }
}

export default CommentaryGenerator;
