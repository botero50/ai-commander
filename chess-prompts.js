/**
 * Chess AI Prompts
 *
 * Collection of prompts for chess move selection.
 * Story 73.1: Prompt Optimization
 *
 * Each prompt can be tested, measured, and ranked by win rate.
 */

const prompts = {
  /**
   * Default: Classic chain-of-thought reasoning
   * Focus: Systematic analysis, step-by-step evaluation
   * Expected: Balanced, reliable play
   */
  classic: (boardState, gameHistory, candidateMoves, color) => `You are a world-class grandmaster chess player analyzing a critical tournament position.

${gameHistory.length > 0 ? `Game moves so far: ${gameHistory}\n` : ''}
Current position (FEN): ${boardState}
Your side to move: ${color === 'white' ? 'White' : 'Black'}

Analyze this position systematically:

STEP 1 - MATERIAL COUNT:
Count all pieces for both sides. Q=9pts, R=5pts, B/N=3pts, P=1pt.
Who has material advantage?

STEP 2 - PAWN STRUCTURE:
Identify doubled, isolated, backward, or passed pawns.
Which side has better pawn structure? Are there weaknesses to exploit?

STEP 3 - PIECE ACTIVITY & COORDINATION:
Which of my pieces are optimally placed?
Which of opponent's pieces are poorly placed?
Who controls the center (d4, e4, d5, e5)?
Are any pieces hanging (undefended)?

STEP 4 - KING SAFETY:
Is either king under immediate threat?
Who has safer king position?
Are there escape squares if under attack?

STEP 5 - TACTICAL OPPORTUNITIES:
Look for pins, forks, skewers, discovered attacks, back-rank threats.
Can I win material or create immediate threats?
Can I deliver checkmate in 2-3 moves?

STEP 6 - STRATEGIC GOALS:
What is my main objective in this position?
Should I attack, defend, improve piece placement, or exploit weaknesses?

STEP 7 - CANDIDATE MOVES (3-5 options):
List your best candidate moves in standard notation.
For each: explain why it's strong and what opponent's best response is.

STEP 8 - BEST MOVE SELECTION:
Considering all factors, which single move is objectively best?
Can I calculate a clear advantage after this move?

---FINAL ANSWER---

Best move: [Move in standard algebraic notation - examples: Nf3, e4, Bxc5, Qh5+, O-O, cxd5, Nxe5]
Confidence: [0-100]%
Main reason: [One sentence explaining this move's strength]

---END---

Possible moves to consider: ${candidateMoves.join(', ')}`,

  /**
   * Aggressive: Prioritizes attacking moves and creating threats
   * Focus: Winning material, checking, forcing opponent's hand
   * Expected: Tactical, sharp play with more risk
   */
  aggressive: (boardState, gameHistory, candidateMoves, color) => `You are a legendary attacking grandmaster known for sharp, forcing play.

${gameHistory.length > 0 ? `Game moves so far: ${gameHistory}\n` : ''}
Current position (FEN): ${boardState}
Your side to move: ${color === 'white' ? 'White' : 'Black'}

ATTACK MODE - FORCING MOVES ONLY:

PRIORITY 1: CHECKMATE THREATS
Can I deliver checkmate in 1-3 moves? If yes, find it immediately.

PRIORITY 2: CHECK & WIN MATERIAL
Look for checks that:
- Win material (piece, pawn)
- Create discovered attacks
- Force opponent into bad positions
- Eliminate defenders

PRIORITY 3: AGGRESSIVE PIECE PLACEMENT
Place pieces to:
- Attack multiple pieces at once (forks)
- Control key squares (d5, e5, f5, h7)
- Create mating nets around opponent king
- Pin or skewer pieces

PRIORITY 4: SACRIFICE FOR ATTACK
If attacking moves lead to:
- Mating attack (worth material)
- Perpetual check (save game)
- Winning more material back
- Overwhelming advantage

PRIORITY 5: AVOID PASSIVE MOVES
Skip defensive/slow moves unless defending against checkmate.

CANDIDATE MOVES: ${candidateMoves.join(', ')}

---FINAL ANSWER---

Best move: [Most forcing attacking move]
Confidence: [0-100]%
Attack plan: [2-3 sentence description of forcing sequence]

---END---`,

  /**
   * Defensive: Prioritizes stability and minimizing risks
   * Focus: Preventing losses, solid positions, gradual improvement
   * Expected: Patient, defensive, grinding play
   */
  defensive: (boardState, gameHistory, candidateMoves, color) => `You are a defensive specialist known for rock-solid, unbreakable positions.

${gameHistory.length > 0 ? `Game moves so far: ${gameHistory}\n` : ''}
Current position (FEN): ${boardState}
Your side to move: ${color === 'white' ? 'White' : 'Black'}

DEFENSE MODE - SAFETY FIRST:

PRIORITY 1: CHECKMATE DEFENSE
Check if opponent has checkmate threats.
If yes, block/move king to safety. Defend all critical squares.

PRIORITY 2: MATERIAL PROTECTION
Ensure NO pieces are hanging (undefended).
Defend all attacked pieces.
Remove pieces from attack when possible.

PRIORITY 3: KING SAFETY
- Keep king centralized or castled (safe)
- Avoid moves that expose king
- Maintain escape squares
- Keep defender pieces near king

PRIORITY 4: STRUCTURE IMPROVEMENT
If position is safe:
- Improve piece placement
- Control center squares
- Create passed pawns
- Strengthen weak pawns

PRIORITY 5: GRADUAL COUNTERPLAY
Only when safe, look for:
- Slow positional improvements
- Prophylactic moves (prevent opponent plans)
- Piece repositioning
- Pawn advances that are safe

AVOID: All risky moves, sacrifices, unclear complications.

CANDIDATE MOVES: ${candidateMoves.join(', ')}

---FINAL ANSWER---

Best move: [Safest move that improves position]
Confidence: [0-100]%
Defense plan: [2-3 sentence description of safety maintained]

---END---`,

  /**
   * Positional: Emphasizes long-term position over tactics
   * Focus: Superior pawn structures, better piece placement, long-term advantages
   * Expected: Slow, grinding, pressure-building play
   */
  positional: (boardState, gameHistory, candidateMoves, color) => `You are a positional grandmaster like Capablanca, obsessed with superior structure.

${gameHistory.length > 0 ? `Game moves so far: ${gameHistory}\n` : ''}
Current position (FEN): ${boardState}
Your side to move: ${color === 'white' ? 'White' : 'Black'}

POSITIONAL STRATEGY:

STEP 1: IMBALANCE IDENTIFICATION
- What structural advantages do I have?
- What are opponent's weaknesses?
- Are there fixed weak squares (outposts)?
- Pawn majority areas?

STEP 2: IDEAL SQUARE PLACEMENT
- Where should my pieces go long-term?
- Can I plant knight on d5/e6? (for White)
- Can I control key files (c-file, e-file)?
- Create restricted positions?

STEP 3: OPPONENT WEAKNESS EXPLOITATION
- Weak d5 square? → Plant knight there
- Backward pawn? → Attack it
- Poor bishop? → Trade it
- King exposure? → Slowly build pressure

STEP 4: PAWN STRUCTURE IMPROVEMENT
- Advance pawns to create space
- Create passed pawns
- Control files and ranks
- Lock in advantages

STEP 5: MINOR MOVE SELECTION
Choose moves that:
- Improve piece positioning
- Restrict opponent pieces
- Build slow pressure
- Gain space

CANDIDATE MOVES: ${candidateMoves.join(', ')}

---FINAL ANSWER---

Best move: [Move that improves long-term position]
Confidence: [0-100]%
Positional idea: [3-4 sentence plan for long-term advantage]

---END---`,

  /**
   * Balanced: Weighs all factors equally
   * Focus: Best objective move regardless of style
   * Expected: Flexible, adaptable play
   */
  balanced: (boardState, gameHistory, candidateMoves, color) => `You are a versatile super-GM who adapts to any position optimally.

${gameHistory.length > 0 ? `Game moves so far: ${gameHistory}\n` : ''}
Current position (FEN): ${boardState}
Your side to move: ${color === 'white' ? 'White' : 'Black'}

BEST MOVE ANALYSIS:

For each candidate move, evaluate (0-10 scale):
- Tactical strength: Wins material, creates threats?
- Positional benefit: Improves long-term structure?
- Safety: Does it weaken my position?
- Opponent response: Can they counter-attack?

CANDIDATE MOVES: ${candidateMoves.join(', ')}

Find the move with best overall score (tactical + positional + safety).

---FINAL ANSWER---

Best move: [Objectively best move]
Confidence: [0-100]%
Reasoning: [2-3 sentence summary of strengths]

---END---`,

  /**
   * Minimal: Shortest prompt, tests if less reasoning helps
   * Focus: Direct move selection with minimal context
   * Expected: Faster moves, potentially weaker
   */
  minimal: (boardState, gameHistory, candidateMoves, color) => `Position (FEN): ${boardState}
${gameHistory.length > 0 ? `Moves: ${gameHistory}` : ''}
Your move: ${color}
Best candidate: ${candidateMoves.join(', ')}

Return ONLY: "Best move: [move] Confidence: [0-100]%"`,

  /**
   * Verbose: Extremely detailed analysis with many checks
   * Focus: Deep analysis, catching subtle factors
   * Expected: Stronger play, slower thinking
   */
  verbose: (boardState, gameHistory, candidateMoves, color) => `You are analyzing the most critical position of your chess career.

${gameHistory.length > 0 ? `Game moves so far: ${gameHistory}\n` : ''}
Current position (FEN): ${boardState}
Your side to move: ${color === 'white' ? 'White' : 'Black'}

COMPREHENSIVE ANALYSIS:

MATERIAL ANALYSIS:
- Count each piece type and value
- Who is up material?
- How significant is the imbalance?

PAWN STRUCTURE:
- Draw mental board of pawn skeleton
- Are there doubled, isolated, backward pawns?
- Which side has better pawn formation?
- Are there potential passed pawns?
- King safety implications?

PIECE ACTIVITY:
- Is each piece well-placed?
- Which pieces are active, which passive?
- Are there bottlenecked pieces?
- Can I improve piece coordination?

TACTICS:
- Are any pieces hanging?
- Forks available?
- Pins or skewers?
- Discovered attacks?
- Back rank threats?
- Mating patterns?

STRATEGY:
- What is this position's key feature?
- Should I attack, defend, or improve?
- What is opponent's main threat?
- How do I prevent it while improving?

CANDIDATE EVALUATION:
For each move: ${candidateMoves.join(', ')}
- What does it accomplish?
- What are opponent's best responses?
- Does it lead to advantage?

CONCLUSION:
After complete analysis, which move best serves the position?

---FINAL ANSWER---

Best move: [Move in standard algebraic notation]
Confidence: [0-100]%
Key reason: [One sentence explaining why this is best]

---END---`,
};

/**
 * Get prompt by name
 * Returns function that generates prompt given board state
 */
export function getPrompt(name = 'classic') {
  return prompts[name] || prompts.classic;
}

/**
 * List all available prompts
 */
export function listPrompts() {
  return Object.keys(prompts);
}

/**
 * Get prompt metadata
 */
export function getPromptInfo(name) {
  const descriptions = {
    classic: { description: 'Systematic step-by-step analysis', style: 'balanced', difficulty: 'medium' },
    aggressive: { description: 'Forcing moves, attacking play', style: 'tactical', difficulty: 'hard' },
    defensive: { description: 'Safety first, minimal risk', style: 'solid', difficulty: 'easy' },
    positional: { description: 'Long-term structure improvements', style: 'positional', difficulty: 'hard' },
    balanced: { description: 'Flexible, adapts to position', style: 'versatile', difficulty: 'hard' },
    minimal: { description: 'Shortest prompt, quick moves', style: 'fast', difficulty: 'easy' },
    verbose: { description: 'Extremely detailed analysis', style: 'deep', difficulty: 'very hard' },
  };

  return descriptions[name] || { description: 'Unknown prompt', style: 'unknown', difficulty: 'unknown' };
}

export { prompts };
