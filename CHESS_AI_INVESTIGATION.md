# Chess AI Integration Investigation

**Date:** 2026-07-15  
**Objective:** Find free, open-source chess repositories for AI-controlled gameplay  
**Status:** ✅ COMPLETE - 2 Recommended Options Identified

---

## 🎯 Recommended Solutions

### Option 1: chess.js (RECOMMENDED FOR SIMPLICITY)

**Repository:** https://github.com/jhlywa/chess.js

**Perfect For:** Building a lightweight chess AI system with your own decision logic

#### Key Specifications:
- **Language:** TypeScript
- **Type:** Chess library (move generation, validation, game logic)
- **Latest Version:** 1.4.0 (June 2025)
- **Popularity:** ⭐ 4,400+ GitHub stars
- **Dependencies:** None (pure TypeScript)
- **Platform Support:** Node.js + Browser

#### Core Features:
✅ Legal move generation  
✅ Move validation  
✅ Piece placement/movement  
✅ Check/checkmate/stalemate detection  
✅ PGN (Portable Game Notation) output  
✅ FEN format support  

#### API Summary:
```javascript
const chess = new Chess()

// Get legal moves
const moves = chess.moves()  // Returns all legal moves

// Make a move
chess.move('e2e4')  // Algebraic notation
chess.move({ from: 'e2', to: 'e4' })  // Object notation

// Check game state
chess.isGameOver()
chess.isCheckmate()
chess.isStalemate()
chess.isCheck()

// Get board state
chess.board()  // Returns 2D array
chess.fen()    // FEN string

// Game history
chess.pgn()    // PGN notation
chess.moves({ verbose: true })  // Detailed move info
```

#### Why Choose chess.js:
- ✅ Lightweight - perfect for integrating with your AI agents
- ✅ Pure game logic - you control the AI decision-making
- ✅ Excellent for: Custom AI strategies, LLM integration
- ✅ No external dependencies
- ✅ Mature and stable library

---

### Option 2: js-chess-engine (RECOMMENDED FOR BUILT-IN AI)

**Repository:** https://github.com/josefjadrny/js-chess-engine

**Perfect For:** Using built-in AI with multiple difficulty levels

#### Key Specifications:
- **Language:** TypeScript (v2.0 complete rewrite)
- **Type:** Chess engine with built-in AI
- **Latest Version:** v2.0+
- **Popularity:** Active maintenance, production-ready
- **Dependencies:** Zero
- **Platform Support:** Node.js >=24 + Browser

#### Core Features:
✅ 5 configurable AI difficulty levels (1-5)  
✅ Move generation and validation  
✅ AI decision-making (Minimax + Alpha-Beta Pruning)  
✅ Stateful and stateless APIs  
✅ FEN and JSON board formats  
✅ Automatic pawn promotion  
✅ Check/checkmate/stalemate detection  
✅ Transposition tables for performance  

#### API Summary:
```javascript
import { Game } from 'js-chess-engine'

// Stateful approach (Game class)
const game = new Game()

// Get available moves
const moves = game.moves()

// Make human move
game.move('e2e4')

// Get AI move (difficulty 1-5)
const aiMove = game.ai(4)  // Level 4 AI

// Check game state
game.isCheck()
game.isCheckmate()
game.isStalemate()

// Get board
game.getBoard()
game.getStatus()

// Stateless approach (pure functions)
import { aiMove, getMoves } from 'js-chess-engine'
const board = { /* FEN or JSON */ }
const moves = getMoves(board)
const move = aiMove(board, 3)  // Difficulty 3
```

#### Why Choose js-chess-engine:
- ✅ Built-in AI - ready to use immediately
- ✅ 5 difficulty levels - scalable challenge
- ✅ Excellent for: Quick integration, benchmark testing
- ✅ Both stateful and stateless APIs
- ✅ Modern TypeScript v2.0 rewrite
- ✅ Zero dependencies

---

## 📊 Comparison Matrix

| Feature | chess.js | js-chess-engine |
|---------|----------|-----------------|
| Move Generation | ✅ | ✅ |
| Move Validation | ✅ | ✅ |
| Built-in AI | ❌ | ✅ (5 levels) |
| AI Algorithm | — | Minimax + Alpha-Beta |
| FEN Support | ✅ | ✅ |
| PGN Support | ✅ | ✅ |
| Stateless API | ❌ | ✅ |
| Node.js Support | ✅ | ✅ v24+ |
| Browser Support | ✅ | ✅ |
| Dependencies | 0 | 0 |
| Stars | 4.4k | Lower but active |
| Use Case | Custom AI | Quick integration |

---

## 🚀 Implementation Strategy for AI Commander

### Recommended Approach: Hybrid

**Use chess.js + Your AI Agents**

```
Your AI Agents (Claude, Ollama, etc.)
           ↓
    [Decision Logic]
           ↓
    chess.js Library
           ↓
    [Game State]
           ↓
    UI/Visualization
```

**Why This Works:**
1. chess.js handles all chess logic (reliable, tested)
2. Your AI agents handle strategy/decisions
3. Clean separation of concerns
4. Can swap AI agents without changing chess logic
5. Perfect for your multi-LLM tournament system

### Steps to Implement:

#### Step 1: Create Chess Adapter Package
```
packages/chess-adapter/
  src/
    chess-adapter.ts      # Wraps chess.js
    game-controller.ts    # Manages game flow
    move-validator.ts     # Move legality
    state-mapper.ts       # Board state → AI input
```

#### Step 2: Wire AI Agents
```
Your existing AI framework:
  - Ollama Brain
  - Claude Brain
  - Gemini Brain
```

Each agent:
1. Receives board state
2. Generates legal moves
3. Makes decision
4. Returns move
5. chess.js validates and applies

#### Step 3: Game Loop
```javascript
while (!game.isGameOver()) {
  // Player 1 (AI 1)
  const board = game.getBoard()
  const p1Move = await aiPlayer1.decide(board)
  game.move(p1Move)
  
  // Player 2 (AI 2)
  const p2Move = await aiPlayer2.decide(board)
  game.move(p2Move)
}
```

---

## 📦 Installation

### Option 1: chess.js
```bash
npm install chess.js
# or
yarn add chess.js
```

### Option 2: js-chess-engine
```bash
npm install js-chess-engine
# or
yarn add js-chess-engine
```

---

## 🎮 Additional Chess UIs (Optional)

If you want a visual board:

1. **chessground** (https://github.com/lichess-org/chessground)
   - Beautiful, interactive chess UI
   - Used by lichess.org
   - Works with chess.js moves

2. **chess-ui** (various repos)
   - React components
   - Drag-and-drop support
   - Real-time updates

3. **chess-board** (https://github.com/aakhtar23/ChessBoard)
   - Lightweight board visualization
   - No external dependencies

---

## 🔗 All Available Resources

### Top Recommendations:
1. **chess.js** - https://github.com/jhlywa/chess.js (Library - Recommended for custom AI)
2. **js-chess-engine** - https://github.com/josefjadrny/js-chess-engine (Engine with AI)
3. **creature-chess** - https://github.com/Jameskmonger/creature-chess (Full game, TypeScript+React)

### Alternative Full Games:
- **Broot Chess** - Real-time multiplayer with WebSockets
- **Online Chess** - Free play with Stockfish integration
- **Javascript-Chess-Game** - https://github.com/AhmadAlkholy/Javascript-Chess-Game

### Topic Lists (for more options):
- https://github.com/topics/chess-game?l=typescript
- https://github.com/topics/chess-engine?l=typescript
- https://github.com/topics/chess-js

---

## ✅ Action Plan

1. **Immediate:** Clone chess.js, integrate into ai-commander
2. **Week 1:** Create chess-adapter package wrapping chess.js
3. **Week 2:** Wire up existing AI agents (Ollama, Claude, etc.)
4. **Week 3:** Implement game loop and match controller
5. **Week 4:** Add visualization (optional chessground UI)
6. **Week 5:** Tournament support (integrate with existing tournament system)

---

## 💡 Quick Start Code Snippet

```typescript
// packages/chess-adapter/src/chess-game-controller.ts
import { Chess } from 'chess.js'
import { Brain } from '@ai-commander/brain'

export class ChessGameController {
  private chess = new Chess()
  
  constructor(
    private whiteAI: Brain,
    private blackAI: Brain
  ) {}
  
  async playGame(): Promise<string> {
    while (!this.chess.isGameOver()) {
      // White's turn
      const whiteBoard = this.chess.board()
      const whiteMove = await this.whiteAI.decide({
        board: whiteBoard,
        legalMoves: this.chess.moves(),
        color: 'white'
      })
      this.chess.move(whiteMove)
      
      if (this.chess.isGameOver()) break
      
      // Black's turn
      const blackBoard = this.chess.board()
      const blackMove = await this.blackAI.decide({
        board: blackBoard,
        legalMoves: this.chess.moves(),
        color: 'black'
      })
      this.chess.move(blackMove)
    }
    
    return this.chess.pgn()  // Game record
  }
}
```

---

**Recommendation Summary:**
✅ Use **chess.js** for core game logic  
✅ Integrate with your existing AI agent framework  
✅ Build on your proven tournament/match system  
✅ Full TypeScript integration with zero dependencies  
✅ Production-ready, actively maintained  

**Estimated Implementation:** 2-3 weeks for full chess AI system

