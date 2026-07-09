/**
 * Clip Editor
 * Post-match highlight clip editing and manipulation
 */

import { HighlightMoment } from './highlight-detector.js';

export interface EditPoint {
  pointId: string;
  timestamp: number;
  action: 'cut' | 'transition' | 'effect' | 'text_overlay';
  duration?: number;
  data?: any;
}

export interface TransitionConfig {
  type: 'fade' | 'slide' | 'dissolve' | 'wipe';
  duration: number; // ms
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TextOverlay {
  overlayId: string;
  text: string;
  startTime: number;
  endTime: number;
  position: 'top' | 'bottom' | 'center';
  fontSize: number;
  color: string;
  backgroundColor?: string;
}

export interface AudioTrack {
  trackId: string;
  type: 'music' | 'commentary' | 'sfx' | 'ambient';
  startTime: number;
  endTime: number;
  volume: number; // 0-100
  fade: {
    in?: { duration: number };
    out?: { duration: number };
  };
}

export interface ClipSegment {
  segmentId: string;
  sourceStartTime: number;
  sourceEndTime: number;
  duration: number; // in final clip
  playbackSpeed: number; // 0.25-2.0
  volume: number; // 0-100
  transitions: TransitionConfig[];
  textOverlays: TextOverlay[];
}

export interface EditedClip {
  clipId: string;
  title: string;
  description: string;
  sourceHighlights: HighlightMoment[];
  segments: ClipSegment[];
  audioTracks: AudioTrack[];
  totalDuration: number;
  created: number;
  modified: number;
  thumbnail?: {
    timestamp: number;
    frameData?: string;
  };
  metadata: {
    theme?: 'action' | 'strategy' | 'drama' | 'mixed';
    style?: 'cinematic' | 'documentary' | 'highlight_reel' | 'tutorial';
    targetAudience?: 'casual' | 'competitive' | 'education';
  };
}

export interface ExportConfig {
  format: 'mp4' | 'webm' | 'mov' | 'mkv';
  resolution: '720p' | '1080p' | '1440p' | '2160p';
  frameRate: 24 | 30 | 60;
  bitrate: number; // kbps
  audioCodec: 'aac' | 'opus' | 'vorbis';
  watermark?: {
    text: string;
    position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  };
}

/**
 * Clip editor for post-match highlight editing
 */
export class ClipEditor {
  private clips: Map<string, EditedClip> = new Map();
  private editPoints: Map<string, EditPoint[]> = new Map();
  private undoStack: Array<{ clipId: string; state: EditedClip }> = [];
  private redoStack: Array<{ clipId: string; state: EditedClip }> = [];
  private clipCounter: number = 0;

  constructor() {}

  /**
   * Create new clip from highlights
   */
  createClip(title: string, highlights: HighlightMoment[]): EditedClip {
    const clipId = `clip_${Date.now()}_${this.clipCounter++}`;
    const totalDuration = highlights.reduce((sum, h) => sum + h.duration, 0);

    const clip: EditedClip = {
      clipId,
      title,
      description: '',
      sourceHighlights: [...highlights],
      segments: highlights.map((h, index) => ({
        segmentId: `seg_${clipId}_${index}`,
        sourceStartTime: h.startTime,
        sourceEndTime: h.endTime,
        duration: h.duration,
        playbackSpeed: 1.0,
        volume: 100,
        transitions: [],
        textOverlays: [],
      })),
      audioTracks: [],
      totalDuration,
      created: Date.now(),
      modified: Date.now(),
      metadata: {
        theme: 'mixed',
        style: 'highlight_reel',
        targetAudience: 'casual',
      },
    };

    this.clips.set(clipId, clip);
    this.editPoints.set(clipId, []);

    return { ...clip };
  }

  /**
   * Add segment to clip
   */
  addSegment(
    clipId: string,
    sourceStart: number,
    sourceEnd: number,
    insertIndex?: number
  ): ClipSegment | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    const segment: ClipSegment = {
      segmentId: `seg_${clipId}_${clip.segments.length}`,
      sourceStartTime: sourceStart,
      sourceEndTime: sourceEnd,
      duration: sourceEnd - sourceStart,
      playbackSpeed: 1.0,
      volume: 100,
      transitions: [],
      textOverlays: [],
    };

    const insertPos = insertIndex !== undefined ? insertIndex : clip.segments.length;
    clip.segments.splice(insertPos, 0, segment);

    // Recalculate total duration
    clip.totalDuration = clip.segments.reduce((sum, s) => sum + s.duration / s.playbackSpeed, 0);
    clip.modified = Date.now();

    return { ...segment };
  }

  /**
   * Remove segment from clip
   */
  removeSegment(clipId: string, segmentIndex: number): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || segmentIndex < 0 || segmentIndex >= clip.segments.length) {
      return false;
    }

    // Save undo state before making change
    const originalClip = this.clips.get(clipId);
    if (originalClip) {
      this.undoStack.push({ clipId, state: JSON.parse(JSON.stringify(originalClip)) });
      this.redoStack = this.redoStack.filter((r) => r.clipId !== clipId);
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }
    }

    clip.segments.splice(segmentIndex, 1);

    // Recalculate total duration
    clip.totalDuration = clip.segments.reduce((sum, s) => sum + s.duration / s.playbackSpeed, 0);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Set playback speed for segment
   */
  setSegmentSpeed(clipId: string, segmentIndex: number, speed: number): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || segmentIndex < 0 || segmentIndex >= clip.segments.length) {
      return false;
    }

    const segment = clip.segments[segmentIndex];
    segment.playbackSpeed = Math.max(0.25, Math.min(2.0, speed));

    // Recalculate total duration
    clip.totalDuration = clip.segments.reduce((sum, s) => sum + s.duration / s.playbackSpeed, 0);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Reorder segments
   */
  reorderSegments(clipId: string, fromIndex: number, toIndex: number): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || fromIndex < 0 || toIndex < 0 || fromIndex >= clip.segments.length || toIndex >= clip.segments.length) {
      return false;
    }

    // Save undo state before making change
    const originalClip = this.clips.get(clipId);
    if (originalClip) {
      this.undoStack.push({ clipId, state: JSON.parse(JSON.stringify(originalClip)) });
      this.redoStack = this.redoStack.filter((r) => r.clipId !== clipId);
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }
    }

    const segment = clip.segments[fromIndex];
    clip.segments.splice(fromIndex, 1);
    clip.segments.splice(toIndex, 0, segment);

    clip.modified = Date.now();

    return true;
  }

  /**
   * Add transition between segments
   */
  addTransition(clipId: string, segmentIndex: number, transition: TransitionConfig): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || segmentIndex < 0 || segmentIndex >= clip.segments.length) {
      return false;
    }

    const segment = clip.segments[segmentIndex];
    segment.transitions.push(transition);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Remove transition
   */
  removeTransition(clipId: string, segmentIndex: number, transitionIndex: number): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || segmentIndex < 0 || segmentIndex >= clip.segments.length) {
      return false;
    }

    const segment = clip.segments[segmentIndex];
    if (transitionIndex < 0 || transitionIndex >= segment.transitions.length) {
      return false;
    }

    segment.transitions.splice(transitionIndex, 1);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Add text overlay
   */
  addTextOverlay(clipId: string, segmentIndex: number, overlay: TextOverlay): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || segmentIndex < 0 || segmentIndex >= clip.segments.length) {
      return false;
    }

    const segment = clip.segments[segmentIndex];
    segment.textOverlays.push(overlay);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Remove text overlay
   */
  removeTextOverlay(clipId: string, segmentIndex: number, overlayId: string): boolean {
    const clip = this.clips.get(clipId);
    if (!clip || segmentIndex < 0 || segmentIndex >= clip.segments.length) {
      return false;
    }

    const segment = clip.segments[segmentIndex];
    const index = segment.textOverlays.findIndex((o) => o.overlayId === overlayId);

    if (index === -1) return false;

    segment.textOverlays.splice(index, 1);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Add audio track
   */
  addAudioTrack(clipId: string, track: AudioTrack): boolean {
    const clip = this.clips.get(clipId);
    if (!clip) return false;

    clip.audioTracks.push(track);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Remove audio track
   */
  removeAudioTrack(clipId: string, trackId: string): boolean {
    const clip = this.clips.get(clipId);
    if (!clip) return false;

    const index = clip.audioTracks.findIndex((t) => t.trackId === trackId);
    if (index === -1) return false;

    clip.audioTracks.splice(index, 1);
    clip.modified = Date.now();

    return true;
  }

  /**
   * Set clip metadata
   */
  setMetadata(clipId: string, metadata: Partial<EditedClip['metadata']>): boolean {
    const clip = this.clips.get(clipId);
    if (!clip) return false;

    clip.metadata = { ...clip.metadata, ...metadata };
    clip.modified = Date.now();

    return true;
  }

  /**
   * Set clip description
   */
  setDescription(clipId: string, description: string): boolean {
    const clip = this.clips.get(clipId);
    if (!clip) return false;

    clip.description = description;
    clip.modified = Date.now();

    return true;
  }

  /**
   * Preview clip timeline
   */
  getTimeline(clipId: string): Array<{ segment: ClipSegment; timestamp: number; duration: number }> | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    const timeline: Array<{ segment: ClipSegment; timestamp: number; duration: number }> = [];
    let currentTime = 0;

    for (const segment of clip.segments) {
      timeline.push({
        segment: { ...segment },
        timestamp: currentTime,
        duration: segment.duration / segment.playbackSpeed,
      });

      currentTime += segment.duration / segment.playbackSpeed;
    }

    return timeline;
  }

  /**
   * Get clip for export
   */
  getClip(clipId: string): EditedClip | null {
    const clip = this.clips.get(clipId);
    return clip ? { ...clip } : null;
  }

  /**
   * Get all clips
   */
  getAllClips(): EditedClip[] {
    return Array.from(this.clips.values()).map((c) => ({ ...c }));
  }

  /**
   * Delete clip
   */
  deleteClip(clipId: string): boolean {
    const deleted = this.clips.delete(clipId);
    this.editPoints.delete(clipId);
    return deleted;
  }

  /**
   * Calculate export file size estimate
   */
  estimateFileSize(clipId: string, config: ExportConfig): number {
    const clip = this.clips.get(clipId);
    if (!clip) return 0;

    const resolutionMultiplier = {
      '720p': 1,
      '1080p': 2.25,
      '1440p': 4,
      '2160p': 9,
    };

    const baseBitrate = config.bitrate;
    const durationSeconds = clip.totalDuration;

    return Math.round((baseBitrate * 1000 * durationSeconds * resolutionMultiplier[config.resolution]) / 8 / 1024 / 1024); // MB
  }

  /**
   * Undo last edit
   */
  undo(clipId: string): boolean {
    const clipUndo = this.undoStack.find((u) => u.clipId === clipId);
    if (!clipUndo) return false;

    const current = this.clips.get(clipId);
    if (!current) return false;

    this.redoStack.push({ clipId, state: JSON.parse(JSON.stringify(current)) });
    this.clips.set(clipId, JSON.parse(JSON.stringify(clipUndo.state)));
    this.undoStack = this.undoStack.filter((u) => u.clipId !== clipId);

    return true;
  }

  /**
   * Redo last undone edit
   */
  redo(clipId: string): boolean {
    const clipRedo = this.redoStack.find((r) => r.clipId === clipId);
    if (!clipRedo) return false;

    const current = this.clips.get(clipId);
    if (!current) return false;

    this.undoStack.push({ clipId, state: JSON.parse(JSON.stringify(current)) });
    this.clips.set(clipId, JSON.parse(JSON.stringify(clipRedo.state)));
    this.redoStack = this.redoStack.filter((r) => r.clipId !== clipId);

    return true;
  }


  /**
   * Duplicate clip
   */
  duplicateClip(clipId: string, newTitle: string): EditedClip | null {
    const original = this.clips.get(clipId);
    if (!original) return null;

    const newClipId = `clip_${Date.now()}_${this.clipCounter++}`;
    const duplicated: EditedClip = {
      ...original,
      clipId: newClipId,
      title: newTitle,
      created: Date.now(),
      modified: Date.now(),
      segments: original.segments.map((s) => ({
        ...s,
        segmentId: `seg_${newClipId}_${s.segmentId.split('_').pop()}`,
      })),
      audioTracks: original.audioTracks.map((t) => ({
        ...t,
        trackId: `track_${newClipId}_${t.trackId.split('_').pop()}`,
      })),
    };

    this.clips.set(newClipId, duplicated);
    this.editPoints.set(newClipId, []);

    return { ...duplicated };
  }

  /**
   * Get clip statistics
   */
  getClipStats(clipId: string): {
    segmentCount: number;
    transitionCount: number;
    textOverlayCount: number;
    audioTrackCount: number;
    totalDuration: number;
    averageSegmentDuration: number;
  } | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    const transitionCount = clip.segments.reduce((sum, s) => sum + s.transitions.length, 0);
    const textOverlayCount = clip.segments.reduce((sum, s) => sum + s.textOverlays.length, 0);

    return {
      segmentCount: clip.segments.length,
      transitionCount,
      textOverlayCount,
      audioTrackCount: clip.audioTracks.length,
      totalDuration: clip.totalDuration,
      averageSegmentDuration: clip.segments.length > 0 ? clip.totalDuration / clip.segments.length : 0,
    };
  }

  /**
   * Reset editor
   */
  reset(): void {
    this.clips.clear();
    this.editPoints.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.clipCounter = 0;
  }
}
