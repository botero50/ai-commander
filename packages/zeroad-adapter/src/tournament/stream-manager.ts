/**
 * Stream Manager
 * Multi-format streaming and codec management for broadcast delivery
 */

import { GameState } from '../state/state-types.js';

export type StreamFormat = 'hls' | 'dash' | 'rtmp' | 'webrtc';
export type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1';
export type AudioCodec = 'aac' | 'opus' | 'vorbis';
export type StreamQuality = 'ultra' | 'high' | 'medium' | 'low';

export interface StreamConfiguration {
  format: StreamFormat;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  bitrate: number; // kbps
  resolution: { width: number; height: number };
  frameRate: number; // fps
  keyframeInterval: number; // seconds
}

export interface StreamOutput {
  streamId: string;
  format: StreamFormat;
  url: string;
  isActive: boolean;
  startTime: number;
  currentBitrate: number;
  droppedFrames: number;
  totalFrames: number;
}

export interface StreamSegment {
  segmentId: string;
  streamId: string;
  sequence: number;
  timestamp: number;
  duration: number; // seconds
  frameCount: number;
  byteSize: number;
  isKeyframe: boolean;
}

export interface EncodingProfile {
  quality: StreamQuality;
  config: StreamConfiguration;
  maxBandwidth: number; // kbps
  autoAdapt: boolean;
}

/**
 * Manages multi-format streaming and codec optimization
 */
export class StreamManager {
  private streams: Map<string, StreamOutput> = new Map();
  private segments: Map<string, StreamSegment[]> = new Map();
  private profiles: Map<StreamQuality, EncodingProfile>;
  private activeStreams: number = 0;
  private totalDataStreamed: number = 0;
  private segmentSequence: Map<string, number> = new Map();

  constructor() {
    this.profiles = this.initializeProfiles();
  }

  /**
   * Initialize quality profiles
   */
  private initializeProfiles(): Map<StreamQuality, EncodingProfile> {
    const profiles = new Map<StreamQuality, EncodingProfile>();

    profiles.set('ultra', {
      quality: 'ultra',
      config: {
        format: 'webrtc',
        videoCodec: 'h265',
        audioCodec: 'opus',
        bitrate: 20000,
        resolution: { width: 3840, height: 2160 },
        frameRate: 60,
        keyframeInterval: 2,
      },
      maxBandwidth: 25000,
      autoAdapt: true,
    });

    profiles.set('high', {
      quality: 'high',
      config: {
        format: 'dash',
        videoCodec: 'h264',
        audioCodec: 'aac',
        bitrate: 8000,
        resolution: { width: 1920, height: 1080 },
        frameRate: 60,
        keyframeInterval: 2,
      },
      maxBandwidth: 10000,
      autoAdapt: true,
    });

    profiles.set('medium', {
      quality: 'medium',
      config: {
        format: 'hls',
        videoCodec: 'h264',
        audioCodec: 'aac',
        bitrate: 4000,
        resolution: { width: 1280, height: 720 },
        frameRate: 30,
        keyframeInterval: 3,
      },
      maxBandwidth: 5000,
      autoAdapt: true,
    });

    profiles.set('low', {
      quality: 'low',
      config: {
        format: 'hls',
        videoCodec: 'h264',
        audioCodec: 'aac',
        bitrate: 1000,
        resolution: { width: 640, height: 360 },
        frameRate: 24,
        keyframeInterval: 5,
      },
      maxBandwidth: 1500,
      autoAdapt: true,
    });

    return profiles;
  }

  /**
   * Start new stream
   */
  startStream(streamId: string, format: StreamFormat, quality: StreamQuality = 'high'): StreamOutput {
    if (this.streams.has(streamId)) {
      throw new Error(`Stream ${streamId} already exists`);
    }

    const profile = this.profiles.get(quality);
    if (!profile) {
      throw new Error(`Unknown quality: ${quality}`);
    }

    const stream: StreamOutput = {
      streamId,
      format,
      url: `${format}://stream/${streamId}`,
      isActive: true,
      startTime: Date.now(),
      currentBitrate: profile.config.bitrate,
      droppedFrames: 0,
      totalFrames: 0,
    };

    this.streams.set(streamId, stream);
    this.segments.set(streamId, []);
    this.segmentSequence.set(streamId, 0);
    this.activeStreams++;

    return stream;
  }

  /**
   * Stop stream
   */
  stopStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    stream.isActive = false;
    this.activeStreams--;
  }

  /**
   * Create stream segment
   */
  createSegment(
    streamId: string,
    duration: number,
    frameCount: number,
    byteSize: number,
    isKeyframe: boolean = false
  ): StreamSegment {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const sequence = this.segmentSequence.get(streamId) || 0;

    const segment: StreamSegment = {
      segmentId: `seg_${streamId}_${sequence}`,
      streamId,
      sequence,
      timestamp: Date.now(),
      duration,
      frameCount,
      byteSize,
      isKeyframe,
    };

    const streamSegments = this.segments.get(streamId) || [];
    streamSegments.push(segment);
    this.segments.set(streamId, streamSegments);
    this.segmentSequence.set(streamId, sequence + 1);

    // Update stream stats
    stream.totalFrames += frameCount;
    this.totalDataStreamed += byteSize;

    return segment;
  }

  /**
   * Get stream information
   */
  getStream(streamId: string): StreamOutput | null {
    const stream = this.streams.get(streamId);
    return stream ? { ...stream } : null;
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamOutput[] {
    return Array.from(this.streams.values())
      .filter((s) => s.isActive)
      .map((s) => ({ ...s }));
  }

  /**
   * Get segments for stream
   */
  getSegments(streamId: string, limit: number = 100): StreamSegment[] {
    const segments = this.segments.get(streamId) || [];
    return segments.slice(-limit).map((s) => ({ ...s }));
  }

  /**
   * Adapt stream quality based on bandwidth
   */
  adaptQuality(streamId: string, availableBandwidth: number): StreamQuality {
    const stream = this.streams.get(streamId);
    if (!stream) {
      return 'medium';
    }

    let bestQuality: StreamQuality = 'low';

    for (const [quality, profile] of this.profiles) {
      if (profile.maxBandwidth <= availableBandwidth) {
        bestQuality = quality;
      }
    }

    const newProfile = this.profiles.get(bestQuality);
    if (newProfile) {
      stream.currentBitrate = newProfile.config.bitrate;
    }

    return bestQuality;
  }

  /**
   * Report dropped frames
   */
  reportDroppedFrames(streamId: string, count: number): void {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    stream.droppedFrames += count;
  }

  /**
   * Get encoding profile for quality
   */
  getProfile(quality: StreamQuality): EncodingProfile | null {
    const profile = this.profiles.get(quality);
    return profile ? { ...profile } : null;
  }

  /**
   * Get all available profiles
   */
  getAllProfiles(): EncodingProfile[] {
    return Array.from(this.profiles.values()).map((p) => ({ ...p }));
  }

  /**
   * Calculate stream statistics
   */
  getStreamStats(streamId: string): {
    duration: number;
    totalFrames: number;
    droppedFrames: number;
    dropRate: number; // percentage
    avgBitrate: number;
    totalData: number;
    segmentCount: number;
  } {
    const stream = this.streams.get(streamId);
    const segments = this.segments.get(streamId) || [];

    if (!stream) {
      return {
        duration: 0,
        totalFrames: 0,
        droppedFrames: 0,
        dropRate: 0,
        avgBitrate: 0,
        totalData: 0,
        segmentCount: 0,
      };
    }

    const duration = (Date.now() - stream.startTime) / 1000; // seconds
    const totalFrames = stream.totalFrames;
    const droppedFrames = stream.droppedFrames;
    const dropRate = totalFrames > 0 ? (droppedFrames / (totalFrames + droppedFrames)) * 100 : 0;

    const totalData = segments.reduce((sum, s) => sum + s.byteSize, 0);
    const avgBitrate = duration > 0 ? Math.round((totalData * 8) / (duration * 1000)) : 0; // kbps

    return {
      duration: Math.round(duration),
      totalFrames,
      droppedFrames,
      dropRate: Math.round(dropRate * 100) / 100,
      avgBitrate,
      totalData,
      segmentCount: segments.length,
    };
  }

  /**
   * Get system-wide statistics
   */
  getSystemStats(): {
    activeStreams: number;
    totalDataStreamed: number;
    totalSegments: number;
    averageQuality: string;
  } {
    const activeStreams = this.getActiveStreams();
    const totalSegments = Array.from(this.segments.values()).reduce((sum, segs) => sum + segs.length, 0);

    const qualities: number[] = [];
    const qualityMap = { ultra: 4, high: 3, medium: 2, low: 1 };

    for (const [quality] of this.profiles) {
      qualities.push(qualityMap[quality as StreamQuality] || 0);
    }

    const avgQualityScore = qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
    const qualityNames: StreamQuality[] = ['low', 'medium', 'high', 'ultra'];
    const averageQuality = qualityNames[Math.round(avgQualityScore) - 1] || 'medium';

    return {
      activeStreams: activeStreams.length,
      totalDataStreamed: this.totalDataStreamed,
      totalSegments,
      averageQuality,
    };
  }

  /**
   * Switch stream format
   */
  switchFormat(streamId: string, newFormat: StreamFormat): void {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    stream.format = newFormat;
    stream.url = `${newFormat}://stream/${streamId}`;
  }

  /**
   * Get recommended quality for bandwidth
   */
  getRecommendedQuality(bandwidthKbps: number): StreamQuality {
    if (bandwidthKbps >= 20000) return 'ultra';
    if (bandwidthKbps >= 8000) return 'high';
    if (bandwidthKbps >= 4000) return 'medium';
    return 'low';
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.streams.clear();
    this.segments.clear();
    this.segmentSequence.clear();
    this.activeStreams = 0;
    this.totalDataStreamed = 0;
  }
}
