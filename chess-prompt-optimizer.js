/**
 * Chess Prompt Optimizer
 *
 * Advanced prompting strategies for Ollama chess playing:
 * - Multiple prompt tiers optimized for different model sizes
 * - Strategic context injection (threats, opportunities)
 * - Chain-of-thought reasoning guidance
 * - Structured output formatting
 * - Candidate move guidance for better selection
 */

/**
 * Analyze position for strategic context
 */
function analyzePositionContext(game, legalMoves, color) {
  const board = game.board();
  const isWhite = color === 'white';
  let context = {
    checks: 0,
    threats: 0,
    captures: [],
    checks_available: false,
    material_advantage: 0,
  };

  // Count checks
  for (const move of legalMoves) {
    try {
      const result = game.move(move.san, { sloppy: true });
      if (result && game.isCheck()) {
        context.checks++;
        context.checks_available = true;
      }
      game.undo();
    } catch (e) {
      try {
        game.undo();
      } catch (e2) {}
    }
  }

  // Identify captures and their value
  for (const move of legalMoves) {
    if (move.captured) {
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      const value = pieceValues[move.captured.toLowerCase()] || 1;
      context.captures.push({ move: move.san, piece: move.captured, value });
    }
  }

  // Sort captures by value
  context.captures.sort((a, b) => b.value - a.value);

  return context;
}

/**
 * Score moves by forcing priority: checkmate > check > capture > quiet
 * Used to identify top candidate moves for prompt guidance
 */
function scoreMove(legalMove) {
  // Checkmate is highest priority
  if (legalMove.san.includes('#')) {
    return { score: 100, reason: 'checkmate' };
  }
  // Check is very good
  if (legalMove.san.includes('+')) {
    return { score: 50, reason: 'check' };
  }
  // Captures by piece value
  if (legalMove.captured) {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const value = pieceValues[legalMove.captured.toLowerCase()] || 1;
    return { score: 30 + value * 5, reason: `capture-${legalMove.captured}` };
  }
  // Quiet moves are lowest priority
  return { score: 1, reason: 'quiet' };
}

/**
 * Get candidate moves ranked by forcing priority
 * Returns top N moves sorted by score
 */
function getRankedCandidates(legalMoves, count = 3) {
  const scored = legalMoves.map(m => ({
    move: m.san,
    ...scoreMove(m),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

/**
 * Generate prompts based on model size and game phase
 * Note: Game object passed for candidate ranking is not used in current version
 */
function generatePrompt(boardASCII, playerColor, legalMoves, context, gamePhase, model = 'mistral') {
  // Detect model tier
  const isTiny = model.includes('tiny') || model.includes('1.1b');
  const isLarge = model.includes('dolphin') || model.includes('mixtral') || model.includes('13b');
  const isMedium = !isTiny && !isLarge;

  const legalMovesStr = legalMoves.map(m => m.san).join(' ');
  // Get top 3 candidates from context (already analyzed)
  const topCandidates = context.captures.slice(0, 3).map(c => c.move);
  if (topCandidates.length === 0 && legalMoves.length > 0) {
    topCandidates.push(legalMoves[0].san); // Fallback to first legal move
  }

  // TIER 1: Ultra-compact for tiny models (1-2B parameters)
  if (isTiny) {
    return `Chess ${playerColor}:
${boardASCII}

Legal: ${legalMovesStr}
Move: `;
  }

  // TIER 2: Standard structured reasoning (7B parameters like Mistral)
  if (isMedium) {
    let prompt = `You are a chess player analyzing a position.

${boardASCII}

${playerColor} to move. Legal moves: ${legalMovesStr}

Focus:
1. Any checks or checkmates? (${context.checks_available ? 'YES' : 'No'})
2. Can we capture material? (${context.captures.length > 0 ? `Yes: ${context.captures[0].piece}` : 'No'})
3. Best candidate moves to consider: ${topCandidates.slice(0, 2).join(', ')}

Select best move: `;
    return prompt;
  }

  // TIER 3: Deep analysis for large models (8x7B+ parameters like Dolphin)
  if (isLarge) {
    let prompt = `You are a master chess player. Analyze this position deeply.

${boardASCII}

Game phase: ${gamePhase}
${playerColor} to move. Legal moves: ${legalMovesStr}

Systematic analysis:
1. THREATS: Check for forcing moves (checks, captures)
${context.checks_available ? `   - Checking moves available (count: ${context.checks})` : '   - No forcing moves'}
${context.captures.length > 0 ? `   - Captures available: ${context.captures.map(c => c.move).slice(0, 3).join(', ')}` : '   - No captures available'}

2. EVALUATION: Compare candidate moves
   Top candidates: ${topCandidates.slice(0, 3).join(', ')}

3. DECISION: Choose the strongest move
   Consider: forcing moves first, then material gain, then positional advantage

Best move: `;
    return prompt;
  }

  // Fallback
  return `${boardASCII}\n\n${playerColor} moves: ${legalMovesStr}\n\nBest move: `;
}

/**
 * Enhanced move extraction with structured patterns
 */
function extractMoveEnhanced(responseText, legalMoves) {
  if (!responseText) return null;

  const clean = responseText.trim();
  const legalSet = new Set(legalMoves.map(m => m.san.toLowerCase()));

  // Priority 1: Explicit move markers (highest confidence)
  const explicitPatterns = [
    /Best move:\s*([a-zA-Z0-9#=+\-]+)/i,
    /BEST MOVE:\s*([a-zA-Z0-9#=+\-]+)/i,
    /Move:\s*([a-zA-Z0-9#=+\-]+)/i,
    /^([a-zA-Z0-9#=+\-]+)\s*$/, // Single move on its own line
    /\[\s*([a-zA-Z0-9#=+\-]+)\s*\]/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = clean.match(pattern);
    if (match) {
      const moveText = match[1].trim().toLowerCase();
      if (legalSet.has(moveText)) {
        const actualMove = legalMoves.find(m => m.san.toLowerCase() === moveText);
        return { move: actualMove.san, quality: 'explicit', confidence: 0.95 };
      }
    }
  }

  // Priority 2: First valid move mentioned in response
  const words = clean.split(/[\s\n,;.!?()]+/).filter(w => w.length > 0);
  for (const word of words) {
    const lower = word.toLowerCase();
    if (legalSet.has(lower)) {
      const actualMove = legalMoves.find(m => m.san.toLowerCase() === lower);
      return { move: actualMove.san, quality: 'token', confidence: 0.85 };
    }
  }

  // Priority 3: Pattern matching for standard move notation
  const movePattern = /([NBRQK]?[a-h]?[1-8]?[x@]?[a-h][1-8](?:=[NBRQ])?[+#]?)/g;
  const allMentioned = clean.match(movePattern) || [];

  // Try mentioned moves in reverse order (model tends to put best move last)
  for (const moveText of allMentioned.reverse()) {
    const lower = moveText.toLowerCase();
    if (legalSet.has(lower)) {
      const actualMove = legalMoves.find(m => m.san.toLowerCase() === lower);
      return { move: actualMove.san, quality: 'pattern', confidence: 0.7 };
    }
  }

  return null;
}

/**
 * Build complete request with optimized parameters per model
 */
function buildOllamaRequest(prompt, model = 'mistral') {
  const isTiny = model.includes('tiny') || model.includes('1.1b');
  const isLarge = model.includes('dolphin') || model.includes('mixtral') || model.includes('13b');

  return {
    model,
    prompt,
    stream: false,
    // Temperature: lower = more deterministic (chess needs precision, not creativity)
    temperature: isTiny ? 0.25 : 0.15,
    // Token limit based on model capacity
    num_predict: isLarge ? 1024 : isTiny ? 64 : 256,
    // Sampling parameters for focused generation
    top_p: 0.75,
    top_k: 20,
    // Stop tokens to prevent rambling
    stop: ['Best move:', 'Analysis:', '\n\n', 'Therefore'],
    // Repeat penalty to avoid loops
    repeat_penalty: 1.1,
  };
}

export {
  analyzePositionContext,
  scoreMove,
  getRankedCandidates,
  generatePrompt,
  extractMoveEnhanced,
  buildOllamaRequest,
};
