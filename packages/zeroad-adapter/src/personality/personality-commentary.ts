/**
 * Personality Commentary
 * Apply personality traits to commentary generation
 */

import { PersonalityProfile, PersonalityArchetype } from './personality-profile.js';

export interface CommentarySegment {
  segmentId: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful';
  intensity: number; // 1-10
  duration?: number; // seconds
}

export interface PersonalityCommentary {
  commentaryId: string;
  originalText: string;
  personalityId: string;
  personalityName: string;
  variantText: string;
  segments: CommentarySegment[];
  metadata: {
    generatedAt: number;
    wordCount: number;
    sentimentShift?: number; // -100 to 100
    formalityAdjustment?: number; // -50 to 50
    energyLevel?: number; // 1-10
  };
}

/**
 * Personality-driven commentary transformer
 */
export class PersonalityCommentaryGenerator {
  private commentaries: Map<string, PersonalityCommentary> = new Map();
  private commentaryCounter: number = 0;

  constructor() {}

  /**
   * Generate commentary variant from personality
   */
  generateVariant(
    originalText: string,
    personality: PersonalityProfile
  ): PersonalityCommentary {
    const commentaryId = `commentary_${Date.now()}_${this.commentaryCounter++}`;

    // Apply personality transformations
    let variantText = originalText;
    let energyLevel = 5; // Base level
    let sentimentShift = 0;
    let formalityAdjustment = 0;

    // Apply enthusiasm and verbosity
    if (personality.traits.enthusiasm > 80) {
      variantText = this.addEmphasis(variantText, personality.traits.enthusiasm);
      energyLevel += 3;
    } else if (personality.traits.enthusiasm < 40) {
      variantText = this.removeEmphasis(variantText);
      energyLevel -= 2;
    }

    // Apply verbosity
    if (personality.traits.verbosity > 75) {
      variantText = this.expandText(variantText, personality.traits.verbosity);
    } else if (personality.traits.verbosity < 50) {
      variantText = this.compressText(variantText);
    }

    // Apply humor
    if (personality.traits.humor > 70) {
      variantText = this.addHumor(variantText, personality.archetype);
      sentimentShift += 15;
    }

    // Apply formality based on vocabulary
    if (personality.style.vocabulary === 'formal') {
      variantText = this.formalize(variantText);
      formalityAdjustment += 30;
    } else if (personality.style.vocabulary === 'casual') {
      variantText = this.casualize(variantText);
      formalityAdjustment -= 30;
    }

    // Apply controversial adjustment
    if (personality.traits.controversial > 70) {
      variantText = this.makeBolder(variantText);
      sentimentShift += Math.min(20, personality.traits.controversial - 70);
    }

    // Generate emotional segments
    const segments = this.createSegments(variantText, personality);

    energyLevel = Math.max(1, Math.min(10, energyLevel));

    const commentary: PersonalityCommentary = {
      commentaryId,
      originalText,
      personalityId: personality.profileId,
      personalityName: personality.name,
      variantText,
      segments,
      metadata: {
        generatedAt: Date.now(),
        wordCount: variantText.split(/\s+/).length,
        sentimentShift: Math.max(-100, Math.min(100, sentimentShift)),
        formalityAdjustment: Math.max(-50, Math.min(50, formalityAdjustment)),
        energyLevel,
      },
    };

    this.commentaries.set(commentaryId, commentary);

    return { ...commentary };
  }

  /**
   * Generate multiple variants for different personalities
   */
  generateMultiVariants(
    originalText: string,
    personalities: PersonalityProfile[]
  ): PersonalityCommentary[] {
    return personalities.map((p) => this.generateVariant(originalText, p));
  }

  /**
   * Get commentary
   */
  getCommentary(commentaryId: string): PersonalityCommentary | null {
    const commentary = this.commentaries.get(commentaryId);
    return commentary ? { ...commentary } : null;
  }

  /**
   * Get all commentaries
   */
  getAllCommentaries(): PersonalityCommentary[] {
    return Array.from(this.commentaries.values()).map((c) => ({ ...c }));
  }

  /**
   * Compare variants
   */
  compareVariants(originalText: string, personalities: PersonalityProfile[]): {
    original: string;
    variants: Array<{ personality: string; text: string; energyLevel: number }>;
  } {
    const variants = personalities.map((p) => {
      const commentary = this.generateVariant(originalText, p);
      return {
        personality: p.name,
        text: commentary.variantText,
        energyLevel: commentary.metadata.energyLevel || 5,
      };
    });

    return {
      original: originalText,
      variants,
    };
  }

  /**
   * Apply archetype-specific transformation
   */
  applyArchetype(text: string, archetype: PersonalityArchetype): string {
    switch (archetype) {
      case 'analyst':
        return this.applyAnalystStyle(text);
      case 'hype':
        return this.applyHypeStyle(text);
      case 'storyteller':
        return this.applyStorytellerStyle(text);
      case 'educator':
        return this.applyEducatorStyle(text);
      case 'comedian':
        return this.applyComedianStyle(text);
      default:
        return text;
    }
  }

  /**
   * Helper: Add emphasis (exclamation marks, caps, etc.)
   */
  private addEmphasis(text: string, enthusiasm: number): string {
    let result = text;

    // Add capital letters for emphasis based on enthusiasm
    const emphasisCount = Math.floor(enthusiasm / 30);
    const words = result.split(/\s+/);

    for (let i = 0; i < emphasisCount && i < words.length; i++) {
      words[i] = words[i].toUpperCase();
    }

    result = words.join(' ');

    // Add exclamation marks
    if (enthusiasm > 85) {
      result = result.replace(/([.!?])$/, (match) => '!!!');
    } else if (enthusiasm > 75) {
      result = result.replace(/([.!?])$/, (match) => '!!');
    }

    return result;
  }

  /**
   * Helper: Remove emphasis
   */
  private removeEmphasis(text: string): string {
    return text
      .replace(/!!!+/g, '.')
      .replace(/!!+/g, '.')
      .replace(/[A-Z]{2,}/g, (match) => match.charAt(0) + match.slice(1).toLowerCase());
  }

  /**
   * Helper: Expand text
   */
  private expandText(text: string, verbosity: number): string {
    const expansions: Record<string, string> = {
      'good': 'very good',
      'bad': 'quite bad',
      'fast': 'incredibly fast',
      'slow': 'rather slow',
      'big': 'quite substantial',
      'small': 'relatively small',
    };

    let result = text;

    for (const [key, value] of Object.entries(expansions)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      if (verbosity > 85) {
        result = result.replace(regex, `absolutely ${value}`);
      } else {
        result = result.replace(regex, value);
      }
    }

    return result;
  }

  /**
   * Helper: Compress text
   */
  private compressText(text: string): string {
    return text
      .replace(/very\s+/g, '')
      .replace(/quite\s+/g, '')
      .replace(/rather\s+/g, '')
      .replace(/absolutely\s+/g, '');
  }

  /**
   * Helper: Add humor
   */
  private addHumor(text: string, archetype: PersonalityArchetype): string {
    const jokes: Record<PersonalityArchetype, string[]> = {
      analyst: [' (statistically speaking)', ' (by my calculations)', ' (theoretically)'],
      hype: [' (no cap)', ' (for real)', ' (straight up)'],
      storyteller: [' (like they say)', ' (as the saying goes)', ' (once upon a time)'],
      educator: [' (as we discuss)', ' (in this context)', ' (for clarification)'],
      comedian: [' lol', ' haha', ' XD'],
    };

    const jokeList = jokes[archetype] || [];
    if (jokeList.length > 0) {
      const randomJoke = jokeList[Math.floor(Math.random() * jokeList.length)];
      return text + randomJoke;
    }

    return text;
  }

  /**
   * Helper: Formalize text
   */
  private formalize(text: string): string {
    const formalizations: Record<string, string> = {
      'yeah': 'yes',
      'nope': 'no',
      'gonna': 'will',
      'wanna': 'want to',
      "can't": 'cannot',
      "don't": 'do not',
      "won't": 'will not',
      'kinda': 'somewhat',
      'sorta': 'rather',
    };

    let result = text;

    for (const [informal, formal] of Object.entries(formalizations)) {
      const regex = new RegExp(`\\b${informal}\\b`, 'gi');
      result = result.replace(regex, formal);
    }

    return result;
  }

  /**
   * Helper: Casualize text
   */
  private casualize(text: string): string {
    const casualizations: Record<string, string> = {
      'yes': 'yeah',
      'no': 'nope',
      'will': "gonna",
      'want to': 'wanna',
      'cannot': "can't",
      'do not': "don't",
      'will not': "won't",
      'rather': 'kinda',
      'quite': 'pretty',
    };

    let result = text;

    for (const [formal, casual] of Object.entries(casualizations)) {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      result = result.replace(regex, casual);
    }

    return result;
  }

  /**
   * Helper: Make text bolder/more controversial
   */
  private makeBolder(text: string): string {
    return text
      .replace(/possibly/gi, 'definitely')
      .replace(/might/gi, 'will')
      .replace(/could/gi, 'should')
      .replace(/seems/gi, 'is')
      .replace(/may be/gi, 'is');
  }

  /**
   * Helper: Apply analyst style
   */
  private applyAnalystStyle(text: string): string {
    return `From an analytical perspective: ${text} This demonstrates clear strategic consideration.`;
  }

  /**
   * Helper: Apply hype style
   */
  private applyHypeStyle(text: string): string {
    return `OH MY! ${text.toUpperCase()}!!! That's INSANE!!!`;
  }

  /**
   * Helper: Apply storyteller style
   */
  private applyStorytellerStyle(text: string): string {
    return `And so the story continues... ${text} This moment will be remembered.`;
  }

  /**
   * Helper: Apply educator style
   */
  private applyEducatorStyle(text: string): string {
    return `Let me explain: ${text} This teaches us an important lesson about strategy.`;
  }

  /**
   * Helper: Apply comedian style
   */
  private applyComedianStyle(text: string): string {
    return `${text} ...classic! Well, that happened. 😄`;
  }

  /**
   * Helper: Create segments from text
   */
  private createSegments(text: string, personality: PersonalityProfile): CommentarySegment[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    return sentences.map((sentence, index) => ({
      segmentId: `seg_${index}_${Date.now()}`,
      text: sentence.trim(),
      emotion: this.inferEmotion(sentence, personality),
      intensity: Math.max(1, Math.min(10, personality.traits.enthusiasm / 10)),
    }));
  }

  /**
   * Helper: Infer emotion from text and personality
   */
  private inferEmotion(
    text: string,
    personality: PersonalityProfile
  ): 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' {
    if (personality.traits.enthusiasm > 80) return 'happy';
    if (personality.traits.controversial > 70) return 'angry';
    if (personality.traits.humor > 70) return 'happy';

    return 'neutral';
  }

  /**
   * Reset generator
   */
  reset(): void {
    this.commentaries.clear();
    this.commentaryCounter = 0;
  }
}
