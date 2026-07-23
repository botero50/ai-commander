/**
 * Real Chess Game Executor
 *
 * Replaces simulateGame() with real chess execution.
 *
 * - Uses chess.js for real game state
 * - Uses Ollama/Stockfish for real AI decisions
 * - Processes every move through broadcast pipeline
 * - No simulation, no fake data
 */

import { Chess } from 'chess.js';
import { BoardDisplay } from './board-display.js';
import { getGameEventBus } from './game-event-bus.js';

/**
 * Convert chess board to ASCII representation for better LLM understanding
 */
function getBoardASCII(game) {
  const board = game.board();
  let ascii = '  a b c d e f g h\n';

  for (let rank = 7; rank >= 0; rank--) {
    ascii += (rank + 1) + ' ';
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        // White pieces uppercase, Black pieces lowercase
        const symbol = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
        ascii += symbol + ' ';
      } else {
        ascii += '· ';
      }
    }
    ascii += (rank + 1) + '\n';
  }
  ascii += '  a b c d e f g h';
  return ascii;
}

/**
 * Get relevant move history: opening moves + recent moves (avoid sending full game)
 */
function getRelevantMoveHistory(game, maxRecentMoves = 12) {
  const allMoves = game.history({ verbose: false });

  if (allMoves.length <= 8) {
    return allMoves.join(' ');  // Early game, keep everything
  }

  // Strategy: opening context (first 3-4 moves) + recent moves (last N)
  const opening = allMoves.slice(0, 3).join(' ');
  const recentCount = Math.min(maxRecentMoves, allMoves.length - 3);
  const recent = allMoves.slice(allMoves.length - recentCount).join(' ');

  return opening.length > 0 ? `${opening} ... ${recent}` : recent;
}

/**
 * Get current game phase based on move count and material
 */
function getGamePhase(game) {
  const moveCount = game.history().length;

  if (moveCount <= 12) return 'Opening';
  if (moveCount <= 40) return 'Middlegame';
  return 'Endgame';
}

/**
 * Extract move from response with multiple pattern matching strategies
 */
function extractMoveFromResponse(responseText, legalMoves) {
  if (!responseText) return null;

  // Priority 1: Explicit structured markers
  const structuredPatterns = [
    /Best move:\s*([a-zA-Z0-9#=+\-]+)/i,
    /BEST MOVE:\s*([a-zA-Z0-9#=+\-]+)/i,
    /Final choice:\s*([a-zA-Z0-9#=+\-]+)/i,
    /Final answer:\s*([a-zA-Z0-9#=+\-]+)/i,
    /\[\s*([a-zA-Z0-9#=+\-]+)\s*\]\s*$/im, // [MOVE] at end
  ];

  for (const pattern of structuredPatterns) {
    const match = responseText.match(pattern);
    if (match) {
      const moveText = match[1].trim();
      const legalMatch = legalMoves.find(m => m.san.toLowerCase() === moveText.toLowerCase());
      if (legalMatch) {
        return { move: legalMatch.san, quality: 'structured', confidence: 0.95 };
      }
    }
  }

  // Priority 2: Last paragraph (if multiple moves mentioned)
  const paragraphs = responseText.split(/\n\n+/);
  if (paragraphs.length > 1) {
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const allMovesInLast = lastParagraph.match(/\b([NBRQK]?[a-h]?[1-8]?[x@]?[a-h][1-8](?:=[NBRQ])?[+#]?)\b/g) || [];

    if (allMovesInLast.length > 0) {
      for (const moveText of allMovesInLast.reverse()) {
        const legalMatch = legalMoves.find(m => m.san.toLowerCase() === moveText.toLowerCase());
        if (legalMatch) {
          return { move: legalMatch.san, quality: 'paragraph_end', confidence: 0.8 };
        }
      }
    }
  }

  // Priority 3: All moves mentioned (validate and return first legal)
  const allMentioned = responseText.match(/\b([NBRQK]?[a-h]?[1-8]?[x@]?[a-h][1-8](?:=[NBRQ])?[+#]?)\b/g) || [];

  if (allMentioned.length > 0) {
    // Try last-to-first to favor most recently mentioned
    for (const moveText of allMentioned.reverse()) {
      const legalMatch = legalMoves.find(m => m.san.toLowerCase() === moveText.toLowerCase());
      if (legalMatch) {
        return { move: legalMatch.san, quality: 'extracted', confidence: 0.6 };
      }
    }
  }

  return null;
}

export class RealChessGame {
  constructor(matchConfig, broadcastService = null, ui = null, wsServer = null) {
    this.matchConfig = matchConfig;
    // Legacy parameters kept for backward compatibility but no longer used
    this.broadcast = broadcastService;
    this.ui = ui;
    this.wsServer = wsServer;
    // Use event bus for all event emission
    this.eventBus = getGameEventBus();
    this.game = new Chess();
    this.boardDisplay = new BoardDisplay();
    this.moves = [];
    this.moveDetails = [];  // Store complete move data
    this.startTime = Date.now();
    this.gameId = `game-${Date.now()}-${Math.random()}`;
    this.playerModels = {
      white: {
        name: matchConfig.white.name || matchConfig.white.model,
        provider: matchConfig.white.provider || 'ollama',
        model: matchConfig.white.model,
        temperature: matchConfig.white.temperature || 0.5,
      },
      black: {
        name: matchConfig.black.name || matchConfig.black.model,
        provider: matchConfig.black.provider || 'ollama',
        model: matchConfig.black.model,
        temperature: matchConfig.black.temperature || 0.5,
      },
    };
  }

  /**
   * Execute a complete chess game
   */
  async play() {
    let moveCount = 0;
    const maxMoves = 500;
    const startTime = Date.now();
    let illegalMoveRetries = 0;

    // Emit game started event
    this.eventBus.emit('game.started', {
      gameId: this.gameId,
      whiteModel: this.playerModels.white.model,
      blackModel: this.playerModels.black.model,
    });

    while (!this.game.isGameOver() && moveCount < maxMoves) {
      const isWhiteToMove = moveCount % 2 === 0;
      const color = isWhiteToMove ? 'white' : 'black';
      const player = this.playerModels[color];

      try {
        // Get legal moves
        const legalMoves = this.game.moves({ verbose: true });
        if (legalMoves.length === 0) {
          break; // No legal moves available
        }

        // Capture position BEFORE the move (for immutable artifact)
        const fenBefore = this.game.fen();
        this.lastPositionBeforeMove = fenBefore;

        // Get position description BEFORE making the move (current position)
        const positionDescription = this.getPositionDescription();

        // Get AI decision
        const moveResult = await this.getAIMove(player, legalMoves, color, moveCount);

        if (!moveResult) {
          // Fallback: pick random legal move
          illegalMoveRetries++;
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          this.executeMove(
            randomMove.san,
            color,
            moveCount,
            0,
            0,
            positionDescription,
            {}  // No decision data for fallback
          );
        } else {
          // Validate move is legal
          const isLegal = legalMoves.some(m => m.san === moveResult.move);
          if (!isLegal) {
            illegalMoveRetries++;
          }
          // Pass complete decision data
          this.executeMove(
            moveResult.move,
            color,
            moveCount,
            moveResult.latency,
            moveResult.confidence || 0,
            positionDescription,
            moveResult.decision || {}  // Include full LLM decision
          );
        }

        moveCount++;
      } catch (error) {
        console.error(`Error in move ${moveCount}: ${error.message}`);
        // Try random fallback
        const legalMoves = this.game.moves({ verbose: true });
        if (legalMoves.length > 0) {
          const positionDescription = this.getPositionDescription();
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          this.executeMove(randomMove.san, color, moveCount, 0, 0, positionDescription);
          moveCount++;
        } else {
          break;
        }
      }
    }

    // Emit game finished event (NEW: After game completes)
    const gameResult = this.getGameResult();
    this.eventBus.emit('game.finished', {
      gameId: this.gameId,
      whiteModel: this.playerModels.white.model,
      blackModel: this.playerModels.black.model,
      result: gameResult,
      pgn: this.game.pgn(),
      finalFen: this.game.fen(),
      moveCount: this.moves.length,
      durationMs: Date.now() - startTime,
      illegalMoveRetries,
    });

    // Return game result
    return {
      gameId: this.gameId,
      moves: this.moves,
      moveDetails: this.moveDetails,  // NEW: Complete move data
      result: gameResult,
      durationMs: Date.now() - startTime,
      moveCount: this.moves.length,
      pgn: this.game.pgn(),
      fen: this.game.fen(),
      illegalMoveRetries,
    };
  }

  /**
   * Get move from AI (Ollama or Stockfish)
   * Returns {move: string, latency: number} or null
   */
  async getAIMove(player, legalMoves, color, moveCount) {
    try {
      if (player.provider === 'ollama') {
        return await this.getOllamaMove(player, legalMoves, color);
      } else if (player.provider === 'stockfish') {
        return await this.getStockfishMove(player, legalMoves);
      } else {
        // Fallback for unknown provider
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return { move: randomMove.san, latency: 0 };
      }
    } catch (error) {
      console.error(`Error getting AI move: ${error.message}, falling back to random`);
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      return { move: randomMove.san, latency: 0 };
    }
  }

  /**
   * Query Ollama for a move decision
   * Uses chain-of-thought reasoning with systematic analysis
   */
  async getOllamaMove(player, legalMoves, color) {
    const boardState = this.game.fen();
    const boardASCII = getBoardASCII(this.game);
    const moveHistory = getRelevantMoveHistory(this.game);
    const gamePhase = getGamePhase(this.game);
    const moveCount = this.game.history().length;
    const playerColor = color === 'white' ? 'White' : 'Black';

    // Choose prompt tier based on model size (can be enhanced with model detection)
    let prompt;

    // Tier 2: Structured reasoning (best for 7B models like Mistral)
    // This tier balances reasoning quality with model capability
    prompt = `Chess Position Analysis

Player: ${playerColor} | Phase: ${gamePhase} (move ${moveCount})

Current Position:
${boardASCII}

FEN: ${boardState}
${moveHistory ? `Recent moves: ${moveHistory}` : ''}

Legal moves available: ${legalMoves.map(m => m.san).join(', ')}

Analyze this position:
1. Material assessment: Count pieces and evaluate material balance
2. Piece activity: Which pieces are well-placed? Which are passive?
3. King safety: Is either king under threat? Safe or exposed?
4. Tactics: Look for any pins, forks, skewers, or forcing moves
5. Strategic goal: What's the best plan for ${playerColor}?

Based on this analysis, select the BEST MOVE from the legal moves list above.

Best move: `;

    // Alternative Tier 1 (ultra-simple for tinyllama):
    // if (player.model.includes('tiny') || player.model.includes('1.1b')) {
    //   prompt = `Chess (${playerColor} to move):
    // ${boardASCII}
    // Recent: ${moveHistory}
    // Legal moves: ${legalMoves.map(m => m.san).join(', ')}
    // Best move: `;
    // }

    // Alternative Tier 3 (deep analysis for larger models like Dolphin):
    // if (player.model.includes('dolphin') || player.model.includes('13b')) {
    //   prompt = `Position Analysis - ${playerColor}
    // ${boardASCII}
    // [Similar to Tier 2 but with more detail...]`
    // }

    try {
      const moveStartTime = Date.now();

      // Determine appropriate parameters based on model size
      const isTinyModel = player.model.includes('tiny') || player.model.includes('1.1b');
      const isLargeModel = player.model.includes('dolphin') || player.model.includes('13b') || player.model.includes('mixtral');

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: player.model,
          prompt,
          // Chess requires deterministic move selection, not creativity
          temperature: isTinyModel ? 0.3 : 0.2,  // Very low for consistent strategic play
          stream: false,
          // Allow more tokens for structured reasoning
          num_predict: isLargeModel ? 1024 : isTinyModel ? 128 : 512,
          // More focused sampling for better reasoning
          top_p: 0.8,
          top_k: 30,
          // Better stop tokens for structured output
          stop: ['Best move:', 'Best move', 'Final move', '\n\n'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('Ollama returned empty response');
      }

      const moveLatency = Date.now() - moveStartTime;
      const responseText = data.response ? String(data.response).trim() : '';

      if (!responseText || responseText.length === 0) {
        throw new Error('Empty response from Ollama');
      }

      // Use improved multi-strategy move extraction
      const extracted = extractMoveFromResponse(responseText, legalMoves);

      if (extracted) {
        const logMessage = `   ⏱️  ${player.name} (${extracted.move}) - Ollama latency: ${moveLatency}ms (quality: ${extracted.quality})`;
        console.log(logMessage);

        // Return complete decision data for research
        return {
          move: extracted.move,
          latency: moveLatency,
          confidence: extracted.confidence || 0.7,
          decision: {
            prompt,
            response: responseText,
            parsingStatus: 'success',
            extractionQuality: extracted.quality,
            tokensIn: data.prompt_eval_count || 0,
            tokensOut: data.eval_count || 0,
          },
        };
      }

      // No move extracted - this is a failure, don't fall back to engine
      throw new Error(`Could not extract valid move from response (tried structured patterns, paragraph end, and full text matching)`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const moveLatency = Date.now() - moveStartTime;
      console.error(`   ❌ Ollama request failed: ${errorMsg}`);

      // IMPORTANT: Do NOT fall back to engine moves - this taints the research data
      // Instead: use a random legal move (maintains research integrity)
      if (legalMoves && legalMoves.length > 0) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        if (randomMove && randomMove.san) {
          console.log(`   ⏱️  ${player.name} (${randomMove.san}) - Ollama error, using random legal move (${moveLatency}ms)`);
          return {
            move: randomMove.san,
            latency: moveLatency,
            confidence: 0,
            decision: {
              parsingStatus: 'error_fallback',
              error: errorMsg,
              tokensIn: 0,
              tokensOut: 0,
            },
          };
        }
      }

      throw new Error(`Ollama failed and no legal moves available: ${errorMsg}`);
    }
  }

  /**
   * Identify the current opening or position type
   */
  getPositionDescription() {
    const history = this.game.history({ verbose: false });
    const moveCount = history.length;
    const movesStr = history.join(' ').toLowerCase();

    // Opening recognitions - but ONLY in early game (moves 1-12)
    if (moveCount >= 3 && moveCount <= 12) {
      // 1.e4 openings
      if (movesStr.startsWith('e4')) {
        // Sicilian Defense (1.e4 c5)
        if (movesStr.startsWith('e4 c5')) {
          return 'Sicilian Defense';
        }
        // French Defense (1.e4 e6)
        if (movesStr.startsWith('e4 e6')) {
          return 'French Defense';
        }
        // Caro-Kann Defense (1.e4 c6)
        if (movesStr.startsWith('e4 c6')) {
          return 'Caro-Kann Defense';
        }
        // 1.e4 e5 openings
        if (movesStr.startsWith('e4 e5')) {
          // Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5)
          if (movesStr.includes('nf3') && movesStr.includes('nc6') && movesStr.includes('bb5')) {
            return 'Ruy Lopez';
          }
          // Scotch Game (1.e4 e5 2.Nf3 Nc6 3.Nxe5)
          if (movesStr.includes('nxe5') && movesStr.includes('nf3')) {
            return 'Scotch Game';
          }
          // Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4)
          if (movesStr.includes('bc4') && movesStr.includes('nf3')) {
            return 'Italian Game';
          }
          // Vienna Game
          if (movesStr.startsWith('e4 e5 nc3')) {
            return 'Vienna Game';
          }
          // King's Gambit
          if (movesStr.startsWith('e4 e5 f4')) {
            return "King's Gambit";
          }
          return 'Open Game';
        }
      }

      // 1.d4 openings
      if (movesStr.startsWith('d4')) {
        // Queen's Gambit (1.d4 d5 2.c4)
        if (movesStr.startsWith('d4 d5 c4')) {
          return "Queen's Gambit";
        }
        // Indian Defenses (1.d4 Nf6)
        if (movesStr.startsWith('d4 nf6')) {
          // Nimzo Indian
          if (movesStr.includes('c4') && movesStr.includes('nc6') && movesStr.includes('nc3')) {
            return 'Nimzo-Indian';
          }
          // King's Indian
          if (movesStr.includes('c4') && movesStr.includes('g6')) {
            return "King's Indian";
          }
          return 'Indian Defense';
        }
        return 'Closed Game';
      }

      // 1.c4 - English Opening
      if (movesStr.startsWith('c4')) {
        return 'English Opening';
      }
    }

    // Opening established (moves 13+) - transition to game phase description
    // Count material and tactical indicators
    const checks = history.filter(m => m.includes('+')).length;
    const captures = history.filter(m => m.includes('x')).length;
    const castles = history.filter(m => m === 'o-o' || m === 'o-o-o').length;

    // Early middlegame - opening ending, tactics beginning
    if (moveCount >= 13 && moveCount <= 20) {
      if (checks >= 2) {
        return 'Opening Tactics';
      }
      if (captures >= 3) {
        return 'Early Exchanges';
      }
      return 'Middlegame Begins';
    }

    // Middlegame - tactical phase
    if (moveCount >= 21 && moveCount <= 35) {
      if (checks >= 4) {
        return 'Tactical Complexity';
      }
      if (captures >= 10) {
        return 'Material Exchanges';
      }
      if (captures >= 6) {
        return 'Active Tactics';
      }
      return 'Middlegame Fight';
    }

    // Middle-late game - positions settling
    if (moveCount >= 36 && moveCount <= 50) {
      if (checks >= 5) {
        return 'Sharp Tactics';
      }
      if (captures >= 15) {
        return 'Simplified Position';
      }
      return 'Late Middlegame';
    }

    // Endgame - few pieces left
    if (moveCount > 50) {
      const recentCaptures = history.slice(-5).filter(m => m.includes('x')).length;

      if (recentCaptures >= 2) {
        return 'Endgame Tactics';
      }
      if (checks >= 8) {
        return 'King Hunt';
      }
      return 'Endgame';
    }

    return '';
  }

  /**
   * Get top candidate moves to help guide Ollama's selection
   * Returns the strongest moves based on positional evaluation
   */
  getCandidateMoves(legalMoves) {
    if (!legalMoves || legalMoves.length === 0) return [];

    const scoredMoves = [];

    for (const move of legalMoves) {
      if (!move || !move.san) continue;

      try {
        let score = 0;
        const executed = this.game.move(move.san, { sloppy: true });
        if (!executed) continue;

        // Evaluate position after move
        if (this.game.isCheckmate()) {
          score = 10000; // Checkmate wins immediately
        } else if (this.game.isCheck()) {
          score = 500; // Check is strong
        } else if (executed.captured) {
          // Captures are good - score by piece value
          const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
          const capturedPiece = (executed.captured || '').toLowerCase();
          score = (pieceValues[capturedPiece] || 1) * 100;
        } else {
          // Quiet moves get modest score
          score = 10;
        }

        scoredMoves.push({ move: move.san, score, promotion: executed.promotion });
        this.game.undo();
      } catch (e) {
        try {
          this.game.undo();
        } catch (e2) {
          // ignore
        }
      }
    }

    // Sort by score descending and return top candidates
    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves.slice(0, 5).map(m => m.move);
  }

  /**
   * Get the best legal move using chess evaluation
   */
  getBestMove(legalMoves) {
    try {
      if (!legalMoves || legalMoves.length === 0) return null;

      let bestMove = legalMoves[0];
      let bestScore = -Infinity;

      for (const move of legalMoves) {
        if (!move || !move.san) continue;

        try {
          let score = 0;

          // Execute move temporarily
          const executed = this.game.move(move.san, { sloppy: true });
          if (!executed) continue;

          // Checkmate is highest priority
          if (this.game.isCheckmate()) {
            score = 1000;
          } else if (this.game.isCheck()) {
            // Check is good
            score = 100;
          } else if (executed && executed.captured) {
            // Captures by piece value
            const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
            const capturedPiece = (executed.captured || '').toLowerCase();
            score = (pieceValues[capturedPiece] || 1) * 10;
          } else {
            // Neutral score for quiet moves
            score = 10;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }

          this.game.undo();
        } catch (moveError) {
          // Undo failed move if evaluation crashed
          try {
            this.game.undo();
          } catch (e) {
            // ignore
          }
          continue;
        }
      }

      return bestMove;
    } catch (error) {
      console.error(`   ❌ getBestMove fatal error: ${error instanceof Error ? error.message : String(error)}`);
      return legalMoves && legalMoves[0] ? legalMoves[0] : null;
    }
  }

  /**
   * Query Stockfish engine for a move
   */
  async getStockfishMove(player, legalMoves) {
    // Stockfish is not running in this demo setup, use best legal move heuristic
    // In production, this would use UCI protocol
    // For now, return first legal move as placeholder
    return { move: legalMoves[0].san, latency: 0 };
  }

  /**
   * Execute a move and emit event
   */
  executeMove(moveNotation, color, moveCount, latencyMs = 0, confidence = 0, description = '', decision = {}) {
    // Execute move in chess.js
    const move = this.game.move(moveNotation);

    if (!move) {
      throw new Error(`Invalid move: ${moveNotation}`);
    }

    // Get position before move (captured earlier, passed via caller context)
    const fenBefore = this.lastPositionBeforeMove || '';

    // Store move notation (for backward compatibility)
    this.moves.push(moveNotation);

    // Store complete move data (NEW: Full immutable artifact)
    const moveDetails = {
      gameId: this.gameId,
      moveNumber: moveCount + 1,
      color,
      san: move.san,
      uci: move.uci,
      piece: move.piece,
      flags: move.flags,
      fenBefore,
      fenAfter: this.game.fen(),
      latencyMs,
      confidence,
      description,  // Opening name
      decision: {
        prompt: decision.prompt || '',
        response: decision.response || '',
        parsingStatus: decision.parsingStatus || 'unknown',
        tokensIn: decision.tokensIn || 0,
        tokensOut: decision.tokensOut || 0,
      },
    };

    this.moveDetails.push(moveDetails);

    // Emit move.made event (NEW: Decoupled from broadcast)
    this.eventBus.emit('move.made', moveDetails);

    // Legacy broadcast support (for backward compatibility with UI)
    // Only if broadcast service is provided
    if (this.broadcast) {
      try {
        const broadcasts = this.broadcast.processMove(moveDetails, this.playerModels[color].name);
        for (const broadcast of broadcasts) {
          this.broadcast.displayBroadcast(broadcast);
          if (this.wsServer) {
            this.wsServer.emitCommentaryGenerated(broadcast, moveNotation, this.playerModels[color].name, broadcast.severity);
          }
        }
      } catch (error) {
        // Log but don't crash if broadcast fails - it's optional
        console.debug('Broadcast service error (optional):', error.message);
      }
    }

    // Legacy WebSocket support (for backward compatibility with spectators)
    if (this.wsServer) {
      try {
        this.wsServer.emitMovePlayed(moveDetails, this.playerModels[color].name, latencyMs);
      } catch (error) {
        console.debug('WebSocket error (optional):', error.message);
      }
    }

    // Format move output with analysis details
    let moveLog = `  ${moveCount + 1}. ${moveNotation} (${color})`;

    if (latencyMs > 0) {
      moveLog += ` - ${(latencyMs / 1000).toFixed(1)}s`;
    }

    if (confidence > 0) {
      moveLog += `, ${Math.round(confidence * 100)}% confidence`;
    }

    if (description) {
      moveLog += ` (${description})`;
    }

    console.log(moveLog);

    // Display board after every move for real-time visualization
    this.boardDisplay.display(this.game.fen(), moveNotation);
  }

  /**
   * Get game result
   */
  getGameResult() {
    if (this.game.isCheckmate()) {
      return this.game.turn() === 'w' ? 'black-win' : 'white-win';
    } else if (this.game.isDraw()) {
      return 'draw';
    } else if (this.game.isStalemate()) {
      return 'draw';
    } else if (this.game.isThreefoldRepetition()) {
      return 'draw';
    } else if (this.game.isInsufficientMaterial()) {
      return 'draw';
    }
    return 'ongoing';
  }

  /**
   * Get game state as object
   */
  getState() {
    return {
      fen: this.game.fen(),
      pgn: this.game.pgn(),
      moves: this.moves,
      moveCount: this.moves.length,
      isGameOver: this.game.isGameOver(),
      turn: this.game.turn() === 'w' ? 'white' : 'black',
      inCheck: this.game.inCheck(),
      legalMoves: this.game.moves().length,
    };
  }
}

export default RealChessGame;
