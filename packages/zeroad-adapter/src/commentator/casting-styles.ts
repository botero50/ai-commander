/**
 * Casting Styles
 * Different commentary styles for different viewing preferences
 */

import { LiveCommentaryEngine, CommentaryLine } from './live-commentary-engine.js';
import { MatchStoryline, MatchPhaseData } from './match-storyline.js';
import { GameState } from '../state/state-types.js';

export type CastingStyle = 'professional' | 'energetic' | 'analytical' | 'beginner_friendly';

export interface StyleConfig {
  name: string;
  description: string;
  tone: 'neutral' | 'excited' | 'analytical' | 'instructional';
  pacing: 'slow' | 'normal' | 'fast';
  detailLevel: 'basic' | 'standard' | 'advanced' | 'expert';
  focusAreas: string[];
}

export interface StyledCommentaryLine extends CommentaryLine {
  style: CastingStyle;
  originalText: string;
  styledText: string;
}

export interface StyledStoryline {
  style: CastingStyle;
  originalStory: string;
  styledStory: string;
}

/**
 * Multi-style commentary system
 */
export class CastingStyleManager {
  private commentaryEngine: LiveCommentaryEngine;
  private storylineEngine: MatchStoryline;
  private currentStyle: CastingStyle = 'professional';
  private styleConfigs: Record<CastingStyle, StyleConfig>;

  constructor() {
    this.commentaryEngine = new LiveCommentaryEngine();
    this.storylineEngine = new MatchStoryline();

    // Define casting styles
    this.styleConfigs = {
      professional: {
        name: 'Professional',
        description: 'Neutral, analytical commentary like ESPN esports broadcast',
        tone: 'neutral',
        pacing: 'normal',
        detailLevel: 'standard',
        focusAreas: ['strategy', 'economy', 'military', 'key_moments'],
      },

      energetic: {
        name: 'Energetic',
        description: 'Excited, dramatic delivery with emphasis on climactic moments',
        tone: 'excited',
        pacing: 'fast',
        detailLevel: 'basic',
        focusAreas: ['battles', 'victories', 'comebacks', 'drama'],
      },

      analytical: {
        name: 'Analytical',
        description: 'Deep strategic analysis focusing on economy, tech, and decision-making',
        tone: 'analytical',
        pacing: 'slow',
        detailLevel: 'advanced',
        focusAreas: ['economy', 'tech_race', 'army_composition', 'strategy'],
      },

      beginner_friendly: {
        name: 'Beginner Friendly',
        description: 'Educational commentary that explains mechanics and terminology',
        tone: 'instructional',
        pacing: 'normal',
        detailLevel: 'basic',
        focusAreas: ['explanations', 'game_mechanics', 'unit_types', 'strategies'],
      },
    };
  }

  /**
   * Update both engines
   */
  update(state: GameState): void {
    this.commentaryEngine.update(state);
    this.storylineEngine.update(state);
  }

  /**
   * Set casting style
   */
  setStyle(style: CastingStyle): void {
    if (!this.styleConfigs[style]) {
      throw new Error(`Unknown casting style: ${style}`);
    }
    this.currentStyle = style;
  }

  /**
   * Get current style
   */
  getStyle(): CastingStyle {
    return this.currentStyle;
  }

  /**
   * Get all available styles
   */
  getAvailableStyles(): Array<{ id: CastingStyle; name: string; description: string }> {
    return Object.entries(this.styleConfigs).map(([id, config]) => ({
      id: id as CastingStyle,
      name: config.name,
      description: config.description,
    }));
  }

  /**
   * Get styled commentary
   */
  getStyledCommentary(): StyledCommentaryLine[] {
    const rawCommentary = this.commentaryEngine.getAllCommentary();
    const style = this.styleConfigs[this.currentStyle];

    return rawCommentary.map((line) => ({
      ...line,
      style: this.currentStyle,
      originalText: line.text,
      styledText: this.applyStyleToCommentary(line.text, style),
    }));
  }

  /**
   * Get recent styled commentary
   */
  getRecentStyledCommentary(count: number = 5): StyledCommentaryLine[] {
    return this.getStyledCommentary().slice(-count);
  }

  /**
   * Apply style transformations to commentary text
   */
  private applyStyleToCommentary(text: string, style: StyleConfig): string {
    let styledText = text;

    // Apply tone modifications
    switch (style.tone) {
      case 'excited':
        styledText = this.addExcitement(styledText);
        break;
      case 'analytical':
        styledText = this.addAnalysis(styledText);
        break;
      case 'instructional':
        styledText = this.addExplanation(styledText);
        break;
    }

    // Apply pacing modifications
    if (style.pacing === 'fast') {
      styledText = this.makeConcise(styledText);
    } else if (style.pacing === 'slow') {
      styledText = this.addDetails(styledText);
    }

    return styledText;
  }

  /**
   * Add excitement to text
   */
  private addExcitement(text: string): string {
    const excitedReplacements: Record<string, string> = {
      'clash!': 'CLASH!!!',
      'erupts': 'ERUPTS in an EXPLOSION of action',
      'engagement': 'EPIC engagement',
      'The armies have met': 'THE ARMIES COLLIDE!',
      'undergoes': 'undergoes a SPECTACULAR transformation',
      'advantage': 'CRUSHING advantage',
      'Victory': 'VICTORY!!!',
    };

    let result = text;
    for (const [original, replacement] of Object.entries(excitedReplacements)) {
      result = result.replace(new RegExp(original, 'gi'), replacement);
    }

    // Add exclamation marks
    if (!result.endsWith('!')) {
      result = result.replace(/\.$/g, '!');
    }

    return result;
  }

  /**
   * Add analytical depth
   */
  private addAnalysis(text: string): string {
    const analyticalAdditions: Record<string, string> = {
      'expands': 'strategically expands',
      'unlocks': 'gains access to',
      'attacks': 'executes coordinated attacks against',
      'advantage': 'significant economic or military advantage',
      'military force': 'optimized military composition',
    };

    let result = text;
    for (const [original, replacement] of Object.entries(analyticalAdditions)) {
      result = result.replace(new RegExp(original, 'gi'), replacement);
    }

    return result;
  }

  /**
   * Add educational explanation
   */
  private addExplanation(text: string): string {
    // Add helpful context for new players
    const explanations: Record<string, string> = {
      'cavalry': 'cavalry (mounted units that move fast)',
      'expansion': 'expansion (building new settlements for resources)',
      'technology': 'technology (unlocking new unit types)',
      'military advantage': 'military advantage (having more/better units)',
      'settlement': 'settlement (structure that generates resources)',
    };

    let result = text;
    for (const [term, explanation] of Object.entries(explanations)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      result = result.replace(regex, explanation);
    }

    return result;
  }

  /**
   * Make text more concise
   */
  private makeConcise(text: string): string {
    // Remove filler words for faster delivery
    const fillers = ['quite', 'really', 'certainly', 'indeed', 'rather', 'somewhat'];

    let result = text;
    for (const filler of fillers) {
      result = result.replace(new RegExp(`\\b${filler}\\s+`, 'gi'), '');
    }

    return result;
  }

  /**
   * Add more details for slower delivery
   */
  private addDetails(text: string): string {
    // Expand descriptions with additional context
    const expansions: Record<string, string> = {
      'advances': 'methodically advances',
      'moves': 'carefully moves',
      'builds': 'constructs',
      'gains': 'gradually gains',
    };

    let result = text;
    for (const [original, expansion] of Object.entries(expansions)) {
      result = result.replace(new RegExp(`\\b${original}\\b`, 'gi'), expansion);
    }

    return result;
  }

  /**
   * Get styled match story
   */
  getStyledStory(): StyledStoryline {
    const rawStory = this.storylineEngine.generateMatchStory();
    const style = this.styleConfigs[this.currentStyle];

    return {
      style: this.currentStyle,
      originalStory: rawStory,
      styledStory: this.applyStyleToStory(rawStory, style),
    };
  }

  /**
   * Apply style to match story
   */
  private applyStyleToStory(story: string, style: StyleConfig): string {
    let styledStory = story;

    switch (style.tone) {
      case 'excited':
        styledStory = this.makeStoryExciting(styledStory);
        break;
      case 'analytical':
        styledStory = this.makeStoryAnalytical(styledStory);
        break;
      case 'instructional':
        styledStory = this.makeStoryEducational(styledStory);
        break;
    }

    return styledStory;
  }

  /**
   * Make story more exciting
   */
  private makeStoryExciting(story: string): string {
    let result = story;

    // Capitalize key phrases
    result = result.replace(/Victory/g, 'VICTORY');
    result = result.replace(/clash/gi, 'CLASH');
    result = result.replace(/emerges/gi, 'BURSTS ONTO THE SCENE');

    // Add dramatic punctuation
    result = result.replace(/\.$/, '!!!');

    return result;
  }

  /**
   * Make story more analytical
   */
  private makeStoryAnalytical(story: string): string {
    let result = story;

    // Add strategic context
    result = result.replace(/expands/gi, 'strategically expands');
    result = result.replace(/unlocks/gi, 'gains technological access to');
    result = result.replace(/advantage/gi, 'strategic advantage');

    // Add analysis markers
    result = result.replace(/OPENING:/g, 'OPENING ANALYSIS:');
    result = result.replace(/VICTORY:/g, 'VICTORY ANALYSIS:');

    return result;
  }

  /**
   * Make story educational
   */
  private makeStoryEducational(story: string): string {
    let result = story;

    // Add explanations
    const educationalNotes = [
      '\n(Expansion = building new settlements to increase resource income)',
      '\n(Technology = unlocking advanced unit types)',
      '\n(Military advantage = having superior forces)',
    ];

    // Add teaching moments strategically
    if (result.includes('expands')) {
      result = result.replace(/expands/i, 'expands (builds new settlements for resources)');
    }

    return result;
  }

  /**
   * Get style-specific statistics
   */
  getStatsForCurrentStyle(): Record<string, unknown> {
    const style = this.styleConfigs[this.currentStyle];
    const commentary = this.commentaryEngine.getStatistics();

    return {
      style: this.currentStyle,
      styleConfig: style,
      commentaryStats: commentary,
      focusAreas: style.focusAreas,
    };
  }

  /**
   * Get all commentary engines for raw access
   */
  getCommentaryEngine(): LiveCommentaryEngine {
    return this.commentaryEngine;
  }

  /**
   * Get storyline engine for raw access
   */
  getStorylineEngine(): MatchStoryline {
    return this.storylineEngine;
  }

  /**
   * Reset all engines
   */
  reset(): void {
    this.commentaryEngine.reset();
    this.storylineEngine.reset();
    this.currentStyle = 'professional';
  }
}
