/**
 * Chess Observation Adapter — Formats board state for brain consumption.
 *
 * Converts:
 * - WorldState → BrainObservation format
 * - Chess concepts → Goal/Command options for brain decision-making
 * - Legal moves → Available command choices
 */

import type { WorldState } from '@ai-commander/domain';
import type { GoalOption, CommandOption, WorldObservation } from '@ai-commander/brain';

export class ChessObservationAdapter {
  /**
   * Convert WorldState to observation format expected by brains.
   *
   * @param worldState The current board state
   * @param playerColor The color of the player making the decision
   * @returns Observation formatted for brain consumption
   */
  static adaptWorldState(worldState: WorldState, playerColor: 'white' | 'black'): WorldObservation {
    const customData = worldState.customData as any;
    const legalMoves = customData.legalMoves as string[];

    return {
      tick: worldState.time.tick,
      timestamp: worldState.time.timestamp,
      missionId: 'chess-game',
      agentId: playerColor,
      agentName: playerColor === 'white' ? 'White' : 'Black',
      agentPosition: { x: 4, y: 4 }, // Center of board
      agentHealth: 100,
      friendlyUnits: this.createPieceAgents(worldState, playerColor),
      enemyUnits: this.createPieceAgents(worldState, playerColor === 'white' ? 'black' : 'white'),
      resources: this.buildResourceList(customData, playerColor),
      structures: [],
      visibility: {
        explored: 64, // Full board
        visible: 64,
        totalMap: 64,
        visibleEnemyCount: customData.material[playerColor === 'white' ? 'blackPiecesTotal' : 'whitePiecesTotal'],
        visibleResourceCount: 0,
      },
    };
  }

  /**
   * Generate strategic goal options for the brain.
   *
   * @param worldState Current board state
   * @param playerColor Player's color
   * @returns Available goals to consider
   */
  static generateGoals(worldState: WorldState, playerColor: 'white' | 'black'): GoalOption[] {
    const customData = worldState.customData as any;

    return [
      {
        id: 'checkmate-opponent',
        intent: 'Achieve checkmate against the opponent',
        priority: 'high' as const,
        feasibility: this.estimateCheckmateChance(customData),
        expectedDuration: 20,
        estimatedValue: 1000,
      },
      {
        id: 'material-gain',
        intent: 'Capture opponent pieces to gain material advantage',
        priority: 'high' as const,
        feasibility: this.estimateCaptureChance(customData, playerColor),
        expectedDuration: 5,
        estimatedValue: 100,
      },
      {
        id: 'control-center',
        intent: 'Position pieces to control central squares (d4, e4, d5, e5)',
        priority: 'medium' as const,
        feasibility: 0.7,
        expectedDuration: 3,
        estimatedValue: 30,
      },
      {
        id: 'king-safety',
        intent: 'Improve king safety through castling or repositioning',
        priority: 'medium' as const,
        feasibility: 0.6,
        expectedDuration: 2,
        estimatedValue: 50,
      },
      {
        id: 'develop-pieces',
        intent: 'Develop minor pieces and prepare for middle game',
        priority: 'medium' as const,
        feasibility: 0.8,
        expectedDuration: 1,
        estimatedValue: 20,
      },
    ];
  }

  /**
   * Convert available legal moves to command options for the brain.
   *
   * @param legalMoves List of legal moves in algebraic notation
   * @param moveNumber Current move number for context
   * @returns Available commands the brain can choose from
   */
  static generateCommandOptions(legalMoves: string[], moveNumber: number): CommandOption[] {
    return legalMoves.map((move, idx) => ({
      id: `move-${moveNumber}-${idx}`,
      action: 'move',
      target: move,
      expectedDuration: 1,
      expectedCost: 0,
      description: move,
    }));
  }

  /**
   * Create agent snapshots for pieces of a specific color.
   */
  private static createPieceAgents(worldState: WorldState, color: 'white' | 'black') {
    return worldState.agents
      .filter(agent => {
        const customData = agent.customData as any;
        return customData?.color === (color === 'white' ? 'w' : 'b');
      })
      .map(agent => ({
        agentId: agent.agentId,
        displayName: agent.customData?.name || 'Piece',
        position: agent.customData?.position || { x: 0, y: 0 },
      }));
  }

  /**
   * Build resource list from board material.
   */
  private static buildResourceList(customData: any, playerColor: 'white' | 'black') {
    const material = customData.material;
    const prefix = playerColor === 'white' ? 'white' : 'black';

    return [
      {
        type: 'pieces-total',
        amount: material[`${prefix}PiecesTotal`],
      },
      {
        type: 'queens',
        amount: material[`${prefix}Queens`],
      },
      {
        type: 'rooks',
        amount: material[`${prefix}Rooks`],
      },
      {
        type: 'bishops',
        amount: material[`${prefix}Bishops`],
      },
      {
        type: 'knights',
        amount: material[`${prefix}Knights`],
      },
      {
        type: 'pawns',
        amount: material[`${prefix}Pawns`],
      },
      {
        type: 'material-value',
        amount: this.calculateMaterialValue(material, playerColor),
      },
    ];
  }

  /**
   * Calculate material value (in points) for a player.
   * Q=9, R=5, B=3, N=3, P=1
   */
  private static calculateMaterialValue(material: any, color: 'white' | 'black'): number {
    const prefix = color === 'white' ? 'white' : 'black';
    return (
      material[`${prefix}Queens`] * 9 +
      material[`${prefix}Rooks`] * 5 +
      material[`${prefix}Bishops`] * 3 +
      material[`${prefix}Knights`] * 3 +
      material[`${prefix}Pawns`] * 1
    );
  }

  /**
   * Estimate likelihood of achieving checkmate (increases with material advantage).
   */
  private static estimateCheckmateChance(customData: any): number {
    const wMaterial = this.calculateMaterialFromCustomData(customData, 'white');
    const bMaterial = this.calculateMaterialFromCustomData(customData, 'black');
    const advantage = Math.abs(wMaterial - bMaterial);

    // More material = higher checkmate chance
    if (advantage > 10) return 0.3; // Significant advantage
    if (advantage > 5) return 0.15;
    if (advantage > 0) return 0.08;
    return 0.05; // Equal material, rare checkmate
  }

  /**
   * Estimate likelihood of capturing opponent pieces.
   */
  private static estimateCaptureChance(customData: any, playerColor: 'white' | 'black'): number {
    const legalMoves = customData.legalMoves as string[];

    // Count captures in legal moves (moves containing 'x' or moving to opponent pieces)
    const captures = legalMoves.filter((m: string) => m.includes('x')).length;
    const captureRate = captures / Math.max(legalMoves.length, 1);

    return Math.min(0.95, captureRate + 0.2); // At least 20% base feasibility
  }

  /**
   * Helper to calculate material value from custom data.
   */
  private static calculateMaterialFromCustomData(customData: any, color: 'white' | 'black'): number {
    const material = customData.material;
    const prefix = color === 'white' ? 'white' : 'black';

    return (
      material[`${prefix}Queens`] * 9 +
      material[`${prefix}Rooks`] * 5 +
      material[`${prefix}Bishops`] * 3 +
      material[`${prefix}Knights`] * 3 +
      material[`${prefix}Pawns`] * 1
    );
  }
}
