"use strict";
/**
 * Trash Talk Generator
 *
 * Generates contextual, natural-sounding taunts and responses between players.
 * Uses LLM to create dynamic, varied banter covering multiple game aspects.
 * Players can taunt each other AND respond to taunts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrashTalkGenerator = void 0;
class TrashTalkGenerator {
    logger;
    ollama_url = 'http://localhost:11434';
    model = 'tinyllama:latest';
    lastTalkTick = 0;
    talkFrequency = 800; // Generate trash talk every N ticks (~26 seconds at 30 FPS)
    useOllama = true;
    chatCallback;
    lastMessage = null; // Track last message for response generation
    // More natural, varied taunts covering different game aspects
    DEFAULT_TAUNTS = [
        // Early game greetings (for first message at tick ~1-100)
        'Let\'s go! Prepare yourself!',
        'You\'re in for a tough match!',
        'Game on! Let\'s see what you got!',
        'Time to show my skill!',
        'This is gonna be fun!',
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
    DEFAULT_RESPONSES = [
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
    constructor(logger, ollamaUrl, model, chatCallback) {
        this.logger = logger;
        if (ollamaUrl)
            this.ollama_url = ollamaUrl;
        if (model)
            this.model = model;
        this.chatCallback = chatCallback;
    }
    /**
     * Generate trash talk or response based on game context
     * Can either taunt or respond to opponent's previous taunt
     */
    async generateTrashTalk(context) {
        try {
            // Generate more frequently (every 100 ticks = 3.3 seconds)
            // Allow first message at tick 1 or 100
            if (context.tick > 1 && context.tick - this.lastTalkTick < this.talkFrequency) {
                return null;
            }
            this.logger.info('🗣️ Attempting to generate trash talk', {
                tick: context.tick,
                lastTalkTick: this.lastTalkTick,
                frequency: this.talkFrequency,
            });
            // Randomly decide who speaks
            const speaker = Math.random() > 0.5 ? 'player1' : 'player2';
            const opponent = speaker === 'player1' ? 'player2' : 'player1';
            // Build context string
            const speakerStats = context[speaker];
            const opponentStats = context[opponent];
            // Decide if this is a response or a new taunt (50% chance if we have a previous message)
            const isResponse = this.lastMessage && this.lastMessage.speaker === opponent && Math.random() > 0.5;
            let message = null;
            // Try Ollama if enabled
            if (this.useOllama) {
                try {
                    const prompt = isResponse
                        ? this.buildResponsePrompt(speaker, speakerStats, opponentStats, this.lastMessage.message)
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
                        const data = (await response.json());
                        message = data.response.trim().split('\n')[0]; // Take first line only
                        // Remove quotes if present
                        message = message.replace(/^["']|["']$/g, '');
                    }
                    else {
                        this.useOllama = false;
                        this.logger.debug('Ollama not available, using fallback taunts');
                    }
                }
                catch (error) {
                    this.useOllama = false;
                    this.logger.debug('Ollama connection failed, using fallback taunts');
                }
            }
            // Use fallback if no message generated
            if (!message) {
                if (isResponse) {
                    message = this.DEFAULT_RESPONSES[Math.floor(Math.random() * this.DEFAULT_RESPONSES.length)];
                }
                else {
                    message = this.DEFAULT_TAUNTS[Math.floor(Math.random() * this.DEFAULT_TAUNTS.length)];
                }
            }
            if (message && message.length > 0) {
                // ✅ NEW: Filter out messages with placeholder underscores (____) from broken LLM outputs
                if (message.includes('____') || message.includes('__')) {
                    this.logger.debug('Filtered out message with underscores (broken LLM output)', { message });
                    return null;
                }
                this.lastTalkTick = context.tick;
                const speakerName = speaker === 'player1' ? 'Ollama' : 'Petra';
                const badge = isResponse ? '🔄' : '🗣️';
                this.logger.info(`${badge} ${speakerName}: ${message}`);
                // Send to game chat if callback available
                if (this.chatCallback) {
                    this.chatCallback(message).catch(() => { });
                }
                const talk = {
                    speaker,
                    message,
                    tick: context.tick,
                    isResponse,
                    respondingTo: isResponse ? this.lastMessage.message : undefined,
                };
                // Store for potential response
                this.lastMessage = talk;
                return talk;
            }
            return null;
        }
        catch (error) {
            this.logger.debug(`Trash talk error: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    /**
     * Build prompt for a new taunt
     * Covers multiple game aspects: units, buildings, tech phase
     */
    buildTauntPrompt(speaker, speakerStats, opponentStats) {
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
    buildResponsePrompt(speaker, speakerStats, opponentStats, previousTaunt) {
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
    analyzeGameState(speaker, opponent) {
        const unitDiff = speaker.unitCount - opponent.unitCount;
        const buildingDiff = speaker.buildingCount - opponent.buildingCount;
        if (unitDiff > 10)
            return 'You have overwhelming military superiority';
        if (unitDiff > 5)
            return 'You have a strong unit advantage';
        if (unitDiff > 0)
            return 'You have slightly more units';
        if (unitDiff === 0)
            return 'Equal unit count - skill determines victory';
        if (unitDiff > -5)
            return 'Enemy has slight unit advantage';
        return 'Enemy has significant military advantage';
    }
    /**
     * Set trash talk frequency (in ticks)
     */
    setTalkFrequency(ticks) {
        this.talkFrequency = ticks;
    }
}
exports.TrashTalkGenerator = TrashTalkGenerator;
//# sourceMappingURL=trash-talk-generator.js.map