/**
 * Trash Talk Generator
 *
 * Generates contextual, natural-sounding taunts and responses between players.
 * Uses LLM to create dynamic, varied banter covering multiple game aspects.
 * Players can taunt each other AND respond to taunts.
 */

import { Logger } from '../config/logger.js';

export interface GameContext {
  player1: {
    name: string;
    unitCount: number;
    buildingCount: number;
    phase: string;
  };
  player2: {
    name: string;
    unitCount: number;
    buildingCount: number;
    phase: string;
  };
  recentEvent?: string;
  tick: number;
}

export interface TrashTalk {
  speaker: string; // "player1" or "player2"
  message: string;
  tick: number;
  isResponse?: boolean; // True if this is a response to a previous taunt
  respondingTo?: string; // Previous message being responded to
}

export class TrashTalkGenerator {
  private logger: Logger;
  private ollama_url: string = 'http://localhost:11434';
  private model: string = 'tinyllama:latest';
  private lastTalkTick: number = 0;
  private talkFrequency: number = 100; // Generate trash talk every N ticks (3.3 seconds)
  private useOllama: boolean = true;
  private chatCallback?: (message: string) => Promise<void>;
  private lastMessage: TrashTalk | null = null; // Track last message for response generation

  // More natural, varied taunts covering different game aspects
  private readonly DEFAULT_TAUNTS = [
    // Unit/Military focused
    'My units are shredding through your defenses!',
    'Your army can\'t match mine!',
    'Watch your back, my cavalry is coming!',

    // Economy/Tech focused
    'I\'m reaching the next age way before you!',
    'Your economy can\'t compete with mine!',
    'I\'m teching up faster than you!',

    // Strategy/Dominance
    'I control the map now!',
    'You picked the wrong opponent!',
    'This is my game to lose!',
    'I\'ve got you surrounded!',

    // Witty/Cocky
    'Better luck next time!',
    'Too easy!',
    'Is that all you got?',
    'You\'re playing at my level now!',
    'I\'m on another dimension!',
    'You know you can\'t beat me!',

    // Responses to pressure
    'Nice try, but not enough!',
    'You\'re bringing a knife to a gun fight!',
    'Your strategy is predictable!',

    // Defensive/Confident
    'Bring it on!',
    'I\'m just getting started!',
    'You haven\'t seen my real army yet!',
  ];

  // Responses to being taunted
  private readonly DEFAULT_RESPONSES = [
    'Talk is cheap, let\'s see your moves!',
    'We\'ll see who\'s laughing at the end!',
    'You got lucky, that\'s all!',
    'Keep talking, I\'m not worried!',
    'Actions speak louder than words!',
    'You\'re overconfident!',
    'I\'m just warming up!',
    'Your cockiness will be your downfall!',
    'Don\'t count your chickens yet!',
    'We\'ll settle this on the battlefield!',
  ];

  constructor(logger: Logger, ollamaUrl?: string, model?: string, chatCallback?: (message: string) => Promise<void>) {
    this.logger = logger;
    if (ollamaUrl) this.ollama_url = ollamaUrl;
    if (model) this.model = model;
    this.chatCallback = chatCallback;
  }

  /**
   * Generate trash talk or response based on game context
   * Can either taunt or respond to opponent's previous taunt
   */
  async generateTrashTalk(context: GameContext): Promise<TrashTalk | null> {
    try {
      // Generate more frequently (every 100 ticks = 3.3 seconds)
      if (context.tick - this.lastTalkTick < this.talkFrequency) {
        return null;
      }

      // Randomly decide who speaks
      const speaker = Math.random() > 0.5 ? 'player1' : 'player2';
      const opponent = speaker === 'player1' ? 'player2' : 'player1';

      // Build context string
      const speakerStats = context[speaker as keyof GameContext] as any;
      const opponentStats = context[opponent as keyof GameContext] as any;

      // Decide if this is a response or a new taunt (50% chance if we have a previous message)
      const isResponse = this.lastMessage && this.lastMessage.speaker === opponent && Math.random() > 0.5;

      let message: string | null = null;

      // Try Ollama if enabled
      if (this.useOllama) {
        try {
          const prompt = isResponse
            ? this.buildResponsePrompt(speaker, speakerStats, opponentStats, this.lastMessage!.message)
            : this.buildTauntPrompt(speaker, speakerStats, opponentStats);

          const response = await fetch(`${this.ollama_url}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.model,
              prompt,
              stream: false,
              temperature: 0.9, // Higher variety
              num_predict: 60,
              top_k: 50,
              top_p: 0.9,
            }),
          });

          if (response.ok) {
            const data = (await response.json()) as { response: string };
            message = data.response.trim().split('\n')[0]; // Take first line only
            // Remove quotes if present
            message = message.replace(/^["']|["']$/g, '');
          } else {
            this.useOllama = false;
            this.logger.debug('Ollama not available, using fallback taunts');
          }
        } catch (error) {
          this.useOllama = false;
          this.logger.debug('Ollama connection failed, using fallback taunts');
        }
      }

      // Use fallback if no message generated
      if (!message) {
        if (isResponse) {
          message = this.DEFAULT_RESPONSES[Math.floor(Math.random() * this.DEFAULT_RESPONSES.length)];
        } else {
          message = this.DEFAULT_TAUNTS[Math.floor(Math.random() * this.DEFAULT_TAUNTS.length)];
        }
      }

      if (message && message.length > 0) {
        this.lastTalkTick = context.tick;
        const speakerName = speaker === 'player1' ? 'Ollama' : 'Petra';
        const badge = isResponse ? '🔄' : '🗣️';
        this.logger.info(`${badge} ${speakerName}: ${message}`);

        // Send to game chat if callback available
        if (this.chatCallback) {
          this.chatCallback(message).catch(() => {});
        }

        const talk: TrashTalk = {
          speaker,
          message,
          tick: context.tick,
          isResponse,
          respondingTo: isResponse ? this.lastMessage!.message : undefined,
        };

        // Store for potential response
        this.lastMessage = talk;

        return talk;
      }

      return null;
    } catch (error) {
      this.logger.debug(`Trash talk error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Build prompt for a new taunt
   * Covers multiple game aspects: units, buildings, tech phase
   */
  private buildTauntPrompt(speaker: string, speakerStats: any, opponentStats: any): string {
    const context = this.analyzeGameState(speakerStats, opponentStats);

    return `You are a confident esports player in an RTS game. Generate ONE SHORT taunt (max 2 sentences).
Be witty, cocky, and trash-talk about the game. Topics: army size, economy strength, tech level, strategy.

Your position: ${speakerStats.unitCount} units, ${speakerStats.buildingCount} buildings, ${speakerStats.phase} phase
Enemy position: ${opponentStats.unitCount} units, ${opponentStats.buildingCount} buildings, ${opponentStats.phase} phase
Situation: ${context}

Generate a natural, confident taunt. Examples: "My army crushes yours!", "You're playing checkers while I play chess!", "Ouch, that economy!", "Face it, you've lost!"

Keep it short, aggressive, witty. NO quotation marks, NO explanations. Just the taunt:`;
  }

  /**
   * Build prompt for responding to opponent's taunt
   */
  private buildResponsePrompt(speaker: string, speakerStats: any, opponentStats: any, previousTaunt: string): string {
    return `You are a confident esports player responding to opponent trash talk in an RTS game. Generate ONE SHORT response (max 2 sentences).

Opponent said: "${previousTaunt}"

Your position: ${speakerStats.unitCount} units, ${speakerStats.buildingCount} buildings, ${speakerStats.phase} phase
Enemy position: ${opponentStats.unitCount} units, ${opponentStats.buildingCount} buildings, ${opponentStats.phase} phase

Fire back with a witty comeback or confident counter-taunt. Examples: "We'll see about that!", "Talk is cheap!", "You're overconfident!"

Keep it short, snappy, cocky. NO quotation marks, NO explanations. Just your response:`;
  }

  /**
   * Analyze game state to provide context for trash talk
   */
  private analyzeGameState(speaker: any, opponent: any): string {
    const unitDiff = speaker.unitCount - opponent.unitCount;
    const buildingDiff = speaker.buildingCount - opponent.buildingCount;

    if (unitDiff > 10) return 'You have overwhelming military superiority';
    if (unitDiff > 5) return 'You have a strong unit advantage';
    if (unitDiff > 0) return 'You have slightly more units';
    if (unitDiff === 0) return 'Equal unit count - skill determines victory';
    if (unitDiff > -5) return 'Enemy has slight unit advantage';
    return 'Enemy has significant military advantage';
  }

  /**
   * Set trash talk frequency (in ticks)
   */
  setTalkFrequency(ticks: number): void {
    this.talkFrequency = ticks;
  }
}
