/**
 * Highlight Reel Generator
 * Automated highlight reel creation and composition
 */

import { HighlightMoment } from './highlight-detector.js';
import { EditedClip, ClipSegment } from './clip-editor.js';

export type ReelTheme = 'action' | 'strategy' | 'drama' | 'mixed';
export type ReelStyle = 'cinematic' | 'documentary' | 'highlight_reel' | 'tutorial';
export type ReelPacing = 'slow' | 'normal' | 'fast' | 'extreme';

export interface ReelTemplate {
  templateId: string;
  name: string;
  theme: ReelTheme;
  style: ReelStyle;
  pacing: ReelPacing;
  transitionDuration: number; // ms
  musicTempo: number; // bpm
  targetDuration: number; // seconds
  minSegmentDuration: number; // seconds
  maxSegmentDuration: number; // seconds
}

export interface MusicSelection {
  trackId: string;
  title: string;
  artist: string;
  duration: number; // seconds
  bpm: number;
  mood: 'intense' | 'epic' | 'calm' | 'emotional' | 'uplifting';
  genre: string;
}

export interface ReelComposition {
  compositionId: string;
  title: string;
  description: string;
  template: ReelTemplate;
  highlights: HighlightMoment[];
  selectedSegments: Array<HighlightMoment & { weight: number; duration: number }>;
  musicTrack?: MusicSelection;
  totalDuration: number;
  segmentCount: number;
  importance: number; // 1-10
  metadata: {
    generatedAt: number;
    generationMethod: 'auto' | 'manual' | 'ai';
    matchContext?: {
      matchId: string;
      players: string[];
      winner?: string;
    };
  };
}

export interface GenerationOptions {
  template: ReelTemplate;
  maxDuration: number; // seconds
  minImportance?: number;
  includeMusic?: boolean;
  autoEqualizeLength?: boolean;
  focusPlayers?: number[];
}

/**
 * Highlight reel generator for automated clip composition
 */
export class HighlightReelGenerator {
  private templates: Map<string, ReelTemplate> = new Map();
  private musicLibrary: MusicSelection[] = [];
  private compositions: Map<string, ReelComposition> = new Map();
  private compositionCounter: number = 0;

  constructor() {
    this.initializeTemplates();
    this.initializeMusicLibrary();
  }

  /**
   * Initialize standard reel templates
   */
  private initializeTemplates(): void {
    this.templates.set('cinematic-action', {
      templateId: 'cinematic-action',
      name: 'Cinematic Action',
      theme: 'action',
      style: 'cinematic',
      pacing: 'fast',
      transitionDuration: 300,
      musicTempo: 140,
      targetDuration: 90,
      minSegmentDuration: 2,
      maxSegmentDuration: 15,
    });

    this.templates.set('epic-highlight', {
      templateId: 'epic-highlight',
      name: 'Epic Highlight',
      theme: 'drama',
      style: 'highlight_reel',
      pacing: 'normal',
      transitionDuration: 500,
      musicTempo: 100,
      targetDuration: 120,
      minSegmentDuration: 3,
      maxSegmentDuration: 20,
    });

    this.templates.set('strategic-analysis', {
      templateId: 'strategic-analysis',
      name: 'Strategic Analysis',
      theme: 'strategy',
      style: 'documentary',
      pacing: 'slow',
      transitionDuration: 800,
      musicTempo: 70,
      targetDuration: 180,
      minSegmentDuration: 5,
      maxSegmentDuration: 30,
    });

    this.templates.set('quick-recap', {
      templateId: 'quick-recap',
      name: 'Quick Recap',
      theme: 'mixed',
      style: 'highlight_reel',
      pacing: 'extreme',
      transitionDuration: 200,
      musicTempo: 160,
      targetDuration: 30,
      minSegmentDuration: 1,
      maxSegmentDuration: 8,
    });

    this.templates.set('emotional-journey', {
      templateId: 'emotional-journey',
      name: 'Emotional Journey',
      theme: 'drama',
      style: 'cinematic',
      pacing: 'normal',
      transitionDuration: 600,
      musicTempo: 90,
      targetDuration: 150,
      minSegmentDuration: 4,
      maxSegmentDuration: 25,
    });
  }

  /**
   * Initialize music library
   */
  private initializeMusicLibrary(): void {
    this.musicLibrary.push({
      trackId: 'music_1',
      title: 'Intense Battle',
      artist: 'Composer One',
      duration: 300,
      bpm: 140,
      mood: 'intense',
      genre: 'Epic',
    });

    this.musicLibrary.push({
      trackId: 'music_2',
      title: 'Uplifting Victory',
      artist: 'Composer One',
      duration: 240,
      bpm: 120,
      mood: 'uplifting',
      genre: 'Electronic',
    });

    this.musicLibrary.push({
      trackId: 'music_3',
      title: 'Calm Strategy',
      artist: 'Composer Two',
      duration: 480,
      bpm: 70,
      mood: 'calm',
      genre: 'Ambient',
    });

    this.musicLibrary.push({
      trackId: 'music_4',
      title: 'Epic Journey',
      artist: 'Composer Two',
      duration: 360,
      bpm: 100,
      mood: 'epic',
      genre: 'Orchestral',
    });

    this.musicLibrary.push({
      trackId: 'music_5',
      title: 'Emotional Drive',
      artist: 'Composer Three',
      duration: 300,
      bpm: 90,
      mood: 'emotional',
      genre: 'Dramatic',
    });
  }

  /**
   * Generate reel composition
   */
  generateComposition(
    title: string,
    highlights: HighlightMoment[],
    options: GenerationOptions
  ): ReelComposition | null {
    if (highlights.length === 0) return null;

    // Filter highlights by importance
    let filtered = highlights;
    if (options.minImportance) {
      filtered = highlights.filter((h) => h.importance >= options.minImportance!);
    }

    // Filter by player focus if specified
    if (options.focusPlayers && options.focusPlayers.length > 0) {
      const focusSet = new Set(options.focusPlayers);
      filtered = filtered.filter((h) => h.playerIds.some((p) => focusSet.has(p)));
    }

    if (filtered.length === 0) return null;

    // Calculate weighted selection
    const weighted = filtered.map((h) => ({
      ...h,
      weight: this.calculateHighlightWeight(h, options.template),
    }));

    // Sort by weight and select top segments
    weighted.sort((a, b) => b.weight - a.weight);

    // Build segment composition
    let totalDuration = 0;
    const selectedSegments: Array<HighlightMoment & { weight: number; duration: number }> = [];

    for (const segment of weighted) {
      const duration = Math.min(options.template.maxSegmentDuration, segment.duration);

      if (totalDuration + duration <= options.maxDuration) {
        selectedSegments.push({
          ...segment,
          duration,
        });
        totalDuration += duration;
      }

      if (selectedSegments.length >= 20) break; // Max 20 segments per reel
    }

    // Calculate importance score
    const avgImportance =
      selectedSegments.reduce((sum, s) => sum + s.importance, 0) / selectedSegments.length;

    // Select music
    let musicTrack: MusicSelection | undefined;
    if (options.includeMusic) {
      musicTrack = this.selectMusic(options.template);
    }

    const compositionId = `reel_${Date.now()}_${this.compositionCounter++}`;

    const composition: ReelComposition = {
      compositionId,
      title,
      description: `Auto-generated ${options.template.name} reel with ${selectedSegments.length} highlights`,
      template: options.template,
      highlights: filtered,
      selectedSegments,
      musicTrack,
      totalDuration,
      segmentCount: selectedSegments.length,
      importance: Math.min(10, Math.ceil(avgImportance)),
      metadata: {
        generatedAt: Date.now(),
        generationMethod: 'auto',
      },
    };

    this.compositions.set(compositionId, composition);

    return { ...composition };
  }

  /**
   * Calculate weight for highlight based on template
   */
  private calculateHighlightWeight(moment: HighlightMoment, template: ReelTemplate): number {
    let weight = moment.importance;

    // Apply theme-based weighting
    if (template.theme === 'action' && ['battle', 'comeback'].includes(moment.type)) {
      weight *= 1.5;
    } else if (template.theme === 'strategy' && ['expansion', 'technology'].includes(moment.type)) {
      weight *= 1.5;
    } else if (template.theme === 'drama' && ['comeback', 'victory_push'].includes(moment.type)) {
      weight *= 1.3;
    }

    // Apply pacing modifier
    const pacingMultiplier = {
      slow: 1.0,
      normal: 1.1,
      fast: 1.2,
      extreme: 1.3,
    };

    weight *= pacingMultiplier[template.pacing];

    return weight;
  }

  /**
   * Select music based on template
   */
  private selectMusic(template: ReelTemplate): MusicSelection {
    const moodMap: Record<ReelTheme, string> = {
      action: 'intense',
      strategy: 'calm',
      drama: 'emotional',
      mixed: 'epic',
    };

    const targetMood = moodMap[template.theme];
    const candidates = this.musicLibrary.filter((m) => m.mood === targetMood);

    if (candidates.length === 0) {
      return this.musicLibrary[0];
    }

    // Return music with closest BPM to template
    return candidates.reduce((best, current) => {
      const bestDiff = Math.abs(best.bpm - template.musicTempo);
      const currentDiff = Math.abs(current.bpm - template.musicTempo);
      return currentDiff < bestDiff ? current : best;
    });
  }

  /**
   * Convert composition to clip
   */
  compositionToClip(compositionId: string): EditedClip | null {
    const composition = this.compositions.get(compositionId);
    if (!composition) return null;

    const segments: ClipSegment[] = composition.selectedSegments.map((seg, index) => ({
      segmentId: `seg_${compositionId}_${index}`,
      sourceStartTime: seg.startTime,
      sourceEndTime: seg.startTime + seg.duration,
      duration: seg.duration,
      playbackSpeed: 1.0,
      volume: 100,
      transitions: index > 0 ? [{ type: 'fade', duration: composition.template.transitionDuration }] : [],
      textOverlays: [],
    }));

    const clip: EditedClip = {
      clipId: `clip_${compositionId}`,
      title: composition.title,
      description: composition.description,
      sourceHighlights: composition.highlights,
      segments,
      audioTracks: composition.musicTrack
        ? [
            {
              trackId: composition.musicTrack.trackId,
              type: 'music',
              startTime: 0,
              endTime: composition.totalDuration,
              volume: 80,
              fade: {
                in: { duration: 1000 },
                out: { duration: 1000 },
              },
            },
          ]
        : [],
      totalDuration: composition.totalDuration,
      created: Date.now(),
      modified: Date.now(),
      metadata: {
        theme: composition.template.theme,
        style: composition.template.style,
        targetAudience: 'casual',
      },
    };

    return clip;
  }

  /**
   * Get template
   */
  getTemplate(templateId: string): ReelTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ReelTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get composition
   */
  getComposition(compositionId: string): ReelComposition | null {
    const comp = this.compositions.get(compositionId);
    return comp ? { ...comp } : null;
  }

  /**
   * Get all compositions
   */
  getAllCompositions(): ReelComposition[] {
    return Array.from(this.compositions.values()).map((c) => ({ ...c }));
  }

  /**
   * Delete composition
   */
  deleteComposition(compositionId: string): boolean {
    return this.compositions.delete(compositionId);
  }

  /**
   * Duplicate composition with new title
   */
  duplicateComposition(compositionId: string, newTitle: string): ReelComposition | null {
    const original = this.compositions.get(compositionId);
    if (!original) return null;

    const newCompositionId = `reel_${Date.now()}_${this.compositionCounter++}`;

    const duplicated: ReelComposition = {
      ...original,
      compositionId: newCompositionId,
      title: newTitle,
      metadata: {
        ...original.metadata,
        generatedAt: Date.now(),
      },
    };

    this.compositions.set(newCompositionId, duplicated);

    return { ...duplicated };
  }

  /**
   * Get music track
   */
  getMusicTrack(trackId: string): MusicSelection | null {
    return this.musicLibrary.find((m) => m.trackId === trackId) || null;
  }

  /**
   * Get music tracks for mood
   */
  getMusicForMood(mood: string): MusicSelection[] {
    return this.musicLibrary.filter((m) => m.mood === mood);
  }

  /**
   * Get all music tracks
   */
  getAllMusicTracks(): MusicSelection[] {
    return [...this.musicLibrary];
  }

  /**
   * Get composition statistics
   */
  getCompositionStats(compositionId: string): {
    segmentCount: number;
    totalDuration: number;
    averageSegmentDuration: number;
    averageImportance: number;
    typeDistribution: Record<string, number>;
  } | null {
    const composition = this.compositions.get(compositionId);
    if (!composition) return null;

    const typeDistribution: Record<string, number> = {};
    for (const segment of composition.selectedSegments) {
      typeDistribution[segment.type] = (typeDistribution[segment.type] || 0) + 1;
    }

    return {
      segmentCount: composition.segmentCount,
      totalDuration: composition.totalDuration,
      averageSegmentDuration: composition.totalDuration / composition.segmentCount,
      averageImportance:
        composition.selectedSegments.reduce((sum, s) => sum + s.importance, 0) / composition.segmentCount,
      typeDistribution,
    };
  }

  /**
   * Regenerate composition with different template
   */
  regenerateWithTemplate(compositionId: string, templateId: string, maxDuration: number): ReelComposition | null {
    const original = this.compositions.get(compositionId);
    if (!original) return null;

    const newTemplate = this.templates.get(templateId);
    if (!newTemplate) return null;

    return this.generateComposition(original.title, original.highlights, {
      template: newTemplate,
      maxDuration,
      includeMusic: !!original.musicTrack,
    });
  }

  /**
   * Reset generator
   */
  reset(): void {
    this.compositions.clear();
    this.compositionCounter = 0;
  }
}
