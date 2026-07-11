/**
 * Trash Talk Generator
 *
 * Generates contextual taunts and banter between players based on game events.
 * Uses LLM to create dynamic, varied insults and boasts.
 */

import { Logger } from '../config/logger.js';

export interface GameContext {
  player1: {
    name: string;
    resources: { food: number; wood: number; stone: number; metal: number };
    unitCount: number;
    buildingCount: number;
  };
  player2: {
    name: string;
    resources: { food: number; wood: number; stone: number; metal: number };
    unitCount: number;
    buildingCount: number;
  };
  recentEvent?: string; // e.g., "player1_killed_unit", "player2_lost_building"
  tick: number;
}

export interface TrashTalk {
  speaker: string; // "player1" or "player2"
  message: string;
  tick: number;
}

export class TrashTalkGenerator {
  private logger: Logger;
  private ollama_url: string = 'http://localhost:11434';
  private model: string = 'tinyllama:latest';
  private lastTalkTick: number = 0;
  private talkFrequency: number = 500; // Generate trash talk every N ticks
  private useOllama: boolean = true;
  private chatCallback?: (message: string) => Promise<void>;

  private readonly DEFAULT_TAUNTS = [
    'Your economy is crumbling!',
    'My units are unstoppable!',
    'You\'re no match for my army!',
    'I own this map now!',
    'Your defenses are pathetic!',
    'Better luck next game!',
    'I\'m too strong for you!',
    'Your strategy is weak!',
    'Prepare to be defeated!',
    'The mighty are here!',
  ];

  constructor(logger: Logger, ollamaUrl?: string, model?: string, chatCallback?: (message: string) => Promise<void>) {
    this.logger = logger;
    if (ollamaUrl) this.ollama_url = ollamaUrl;
    if (model) this.model = model;
    this.chatCallback = chatCallback;
  }

  /**
   * Generate trash talk based on game context
   */
  async generateTrashTalk(context: GameContext): Promise<TrashTalk | null> {
    try {
      // Only generate periodically or on specific events
      if (context.tick - this.lastTalkTick < this.talkFrequency && !context.recentEvent) {
        return null;
      }

      // Randomly decide who speaks
      const speaker = Math.random() > 0.5 ? 'player1' : 'player2';
      const opponent = speaker === 'player1' ? 'player2' : 'player1';

      // Build context string
      const speakerStats = context[speaker as keyof GameContext] as any;
      const opponentStats = context[opponent as keyof GameContext] as any;

      let taunt: string | null = null;

      // Try Ollama if enabled
      if (this.useOllama) {
        const prompt = this.buildPrompt(speaker, speakerStats, opponentStats, context.recentEvent);

        try {
          const response = await fetch(`${this.ollama_url}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.model,
              prompt,
              stream: false,
              temperature: 0.8,
              num_predict: 50,
            }),
          });

          if (response.ok) {
            const data = (await response.json()) as { response: string };
            taunt = data.response.trim();
          } else {
            this.useOllama = false; // Disable Ollama for rest of session
            this.logger.debug('Ollama not available, using fallback taunts');
          }
        } catch (error) {
          this.useOllama = false; // Disable Ollama for rest of session
          this.logger.debug('Ollama connection failed, using fallback taunts');
        }
      }

      // Use fallback if no taunt generated
      if (!taunt) {
        taunt = this.DEFAULT_TAUNTS[Math.floor(Math.random() * this.DEFAULT_TAUNTS.length)];
      }

      if (taunt && taunt.length > 0) {
        this.lastTalkTick = context.tick;
        this.logger.info(`🗣️  ${speaker === 'player1' ? 'Ollama' : 'Petra'}: ${taunt}`);

        // Send to game chat if callback available (fire and forget - don't await)
        if (this.chatCallback) {
          this.chatCallback(taunt).catch(() => {
            // Silently ignore chat failures
          });
        }

        return {
          speaker,
          message: taunt,
          tick: context.tick,
        };
      }

      return null;
    } catch (error) {
      this.logger.debug(`Trash talk error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Build prompt for trash talk generation
   */
  private buildPrompt(
    speaker: string,
    speakerStats: any,
    opponentStats: any,
    event?: string
  ): string {
    let eventContext = '';
    if (event === 'speaker_killed_unit') {
      eventContext = 'Just killed an enemy unit! ';
    } else if (event === 'speaker_lost_unit') {
      eventContext = 'Just lost a unit. ';
    } else if (event === 'opponent_weak') {
      eventContext = 'Opponent is falling behind. ';
    }

    const comparison = this.getComparison(speakerStats, opponentStats);

    return `You are a trash-talking AI game opponent. Generate ONE SHORT taunt (1-2 sentences max).
${eventContext}
Your stats: ${speakerStats.unitCount} units, ${speakerStats.buildingCount} buildings, ${speakerStats.resources.food + speakerStats.resources.wood + speakerStats.resources.stone + speakerStats.resources.metal} total resources
Enemy stats: ${opponentStats.unitCount} units, ${opponentStats.buildingCount} buildings, ${opponentStats.resources.food + opponentStats.resources.wood + opponentStats.resources.stone + opponentStats.resources.metal} total resources
${comparison}

Generate a short, witty, confident taunt in the style of an esports trash talker. Be aggressive but not offensive. NO extra text, just the taunt:`;
  }

  /**
   * Compare player stats to generate contextual taunts
   */
  private getComparison(speaker: any, opponent: any): string {
    const speakerTotal = speaker.resources.food + speaker.resources.wood + speaker.resources.stone + speaker.resources.metal;
    const opponentTotal = opponent.resources.food + opponent.resources.wood + opponent.resources.stone + opponent.resources.metal;

    if (speaker.unitCount > opponent.unitCount * 1.5) {
      return 'You have significantly more units.';
    }
    if (speaker.buildingCount > opponent.buildingCount) {
      return 'Your economy is stronger.';
    }
    if (speakerTotal > opponentTotal * 1.2) {
      return 'You have more resources.';
    }
    if (opponent.unitCount > speaker.unitCount * 1.5) {
      return 'Enemy has more units, but you are more skilled.';
    }
    return 'You are equally matched.';
  }

  /**
   * Set trash talk frequency (in ticks)
   */
  setTalkFrequency(ticks: number): void {
    this.talkFrequency = ticks;
  }
}
