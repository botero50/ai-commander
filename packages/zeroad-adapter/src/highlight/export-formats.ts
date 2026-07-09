/**
 * Export Formats
 * Multi-format video export system for clip distribution
 */

import { EditedClip } from './clip-editor.js';

export type ExportFormatType = 'mp4' | 'webm' | 'mov' | 'mkv' | 'mxf' | 'avi';
export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'prores';
export type AudioCodec = 'aac' | 'opus' | 'vorbis' | 'flac' | 'pcm';
export type Resolution = '480p' | '720p' | '1080p' | '1440p' | '2160p' | '4320p';

export interface FormatSpecification {
  format: ExportFormatType;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  bitrate: number; // kbps
  resolution: Resolution;
  frameRate: number; // fps
  pixelFormat: 'yuv420' | 'yuv422' | 'yuv444' | 'rgb';
  colorSpace: 'bt601' | 'bt709' | 'bt2020';
  containerFormat: string;
  fastStart?: boolean; // For MP4
}

export interface ExportProfile {
  name: string;
  description: string;
  format: ExportFormatType;
  specs: FormatSpecification;
  fileExtension: string;
  mimeType: string;
  platforms: Array<'web' | 'mobile' | 'desktop' | 'broadcast' | 'social'>;
  maxFileSize?: number; // MB
  estimatedDuration?: number; // seconds
}

export interface ExportJob {
  jobId: string;
  clipId: string;
  profileName: string;
  outputPath: string;
  status: 'pending' | 'encoding' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startTime?: number;
  endTime?: number;
  fileSize?: number;
  error?: string;
}

export interface ExportPreset {
  presetId: string;
  name: string;
  description: string;
  profiles: string[]; // profile names
  autoOptimize: boolean;
  watermark?: {
    text: string;
    opacity: number; // 0-1
    position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  };
  metadata?: {
    title?: string;
    artist?: string;
    comment?: string;
  };
}

/**
 * Export format manager for multi-format video export
 */
export class ExportFormatter {
  private profiles: Map<string, ExportProfile> = new Map();
  private presets: Map<string, ExportPreset> = new Map();
  private jobs: Map<string, ExportJob> = new Map();
  private jobCounter: number = 0;

  constructor() {
    this.initializeProfiles();
    this.initializePresets();
  }

  /**
   * Initialize standard export profiles
   */
  private initializeProfiles(): void {
    // Web profiles
    this.profiles.set('web-h264-720p', {
      name: 'Web H.264 720p',
      description: 'Universal web-compatible video',
      format: 'mp4',
      specs: {
        format: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        bitrate: 5000,
        resolution: '720p',
        frameRate: 30,
        pixelFormat: 'yuv420',
        colorSpace: 'bt709',
        containerFormat: 'ISO Base Media',
        fastStart: true,
      },
      fileExtension: '.mp4',
      mimeType: 'video/mp4',
      platforms: ['web', 'mobile', 'social'],
    });

    this.profiles.set('web-vp9-1080p', {
      name: 'Web VP9 1080p',
      description: 'High-quality web video with VP9 codec',
      format: 'webm',
      specs: {
        format: 'webm',
        videoCodec: 'vp9',
        audioCodec: 'opus',
        bitrate: 8000,
        resolution: '1080p',
        frameRate: 30,
        pixelFormat: 'yuv420',
        colorSpace: 'bt709',
        containerFormat: 'WebM',
      },
      fileExtension: '.webm',
      mimeType: 'video/webm',
      platforms: ['web', 'desktop'],
    });

    this.profiles.set('mobile-h264-480p', {
      name: 'Mobile H.264 480p',
      description: 'Mobile-optimized video',
      format: 'mp4',
      specs: {
        format: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        bitrate: 2000,
        resolution: '480p',
        frameRate: 24,
        pixelFormat: 'yuv420',
        colorSpace: 'bt709',
        containerFormat: 'ISO Base Media',
        fastStart: true,
      },
      fileExtension: '.mp4',
      mimeType: 'video/mp4',
      platforms: ['mobile'],
      maxFileSize: 50,
    });

    this.profiles.set('broadcast-prores-2160p', {
      name: 'Broadcast ProRes 2160p',
      description: 'Professional broadcast quality',
      format: 'mxf',
      specs: {
        format: 'mxf',
        videoCodec: 'prores',
        audioCodec: 'pcm',
        bitrate: 150000,
        resolution: '2160p',
        frameRate: 60,
        pixelFormat: 'yuv422',
        colorSpace: 'bt2020',
        containerFormat: 'MXF',
      },
      fileExtension: '.mxf',
      mimeType: 'application/mxf',
      platforms: ['broadcast'],
    });

    this.profiles.set('social-h265-1080p', {
      name: 'Social Media H.265 1080p',
      description: 'Optimized for social platforms',
      format: 'mp4',
      specs: {
        format: 'mp4',
        videoCodec: 'h265',
        audioCodec: 'aac',
        bitrate: 6000,
        resolution: '1080p',
        frameRate: 30,
        pixelFormat: 'yuv420',
        colorSpace: 'bt709',
        containerFormat: 'ISO Base Media',
        fastStart: true,
      },
      fileExtension: '.mp4',
      mimeType: 'video/mp4',
      platforms: ['social', 'mobile'],
    });

    this.profiles.set('archive-av1-4320p', {
      name: 'Archive AV1 4K+',
      description: 'Long-term archival with maximum compression',
      format: 'mkv',
      specs: {
        format: 'mkv',
        videoCodec: 'av1',
        audioCodec: 'flac',
        bitrate: 20000,
        resolution: '4320p',
        frameRate: 60,
        pixelFormat: 'yuv444',
        colorSpace: 'bt2020',
        containerFormat: 'Matroska',
      },
      fileExtension: '.mkv',
      mimeType: 'video/x-matroska',
      platforms: ['desktop'],
    });
  }

  /**
   * Initialize standard export presets
   */
  private initializePresets(): void {
    this.presets.set('quick-share', {
      presetId: 'quick-share',
      name: 'Quick Share',
      description: 'Fast export for social media sharing',
      profiles: ['social-h265-1080p', 'web-h264-720p'],
      autoOptimize: true,
      watermark: {
        text: 'AI Commander',
        opacity: 0.3,
        position: 'bottomRight',
      },
    });

    this.presets.set('professional-broadcast', {
      presetId: 'professional-broadcast',
      name: 'Professional Broadcast',
      description: 'High-quality broadcast-ready export',
      profiles: ['broadcast-prores-2160p'],
      autoOptimize: false,
      metadata: {
        title: 'AI Commander Esports Broadcast',
      },
    });

    this.presets.set('mobile-optimized', {
      presetId: 'mobile-optimized',
      name: 'Mobile Optimized',
      description: 'Compressed for mobile viewing',
      profiles: ['mobile-h264-480p', 'social-h265-1080p'],
      autoOptimize: true,
    });

    this.presets.set('archive-all', {
      presetId: 'archive-all',
      name: 'Archive All Formats',
      description: 'Export in all available formats for archival',
      profiles: ['archive-av1-4320p', 'broadcast-prores-2160p', 'web-vp9-1080p'],
      autoOptimize: false,
      metadata: {
        comment: 'Archived from AI Commander',
      },
    });
  }

  /**
   * Get export profile
   */
  getProfile(profileName: string): ExportProfile | null {
    return this.profiles.get(profileName) || null;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ExportProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profiles for platform
   */
  getProfilesForPlatform(platform: string): ExportProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.platforms.includes(platform as any));
  }

  /**
   * Get export preset
   */
  getPreset(presetName: string): ExportPreset | null {
    return this.presets.get(presetName) || null;
  }

  /**
   * Get all presets
   */
  getAllPresets(): ExportPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Create export job
   */
  createExportJob(clipId: string, profileName: string, outputPath: string): ExportJob | null {
    const profile = this.profiles.get(profileName);
    if (!profile) return null;

    const jobId = `export_${Date.now()}_${this.jobCounter++}`;
    const job: ExportJob = {
      jobId,
      clipId,
      profileName,
      outputPath,
      status: 'pending',
      progress: 0,
    };

    this.jobs.set(jobId, job);
    return { ...job };
  }

  /**
   * Get export job
   */
  getExportJob(jobId: string): ExportJob | null {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobId: string, progress: number): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.progress = Math.max(0, Math.min(100, progress));

    if (progress >= 100) {
      job.status = 'completed';
      job.endTime = Date.now();
    } else if (progress > 0 && job.status === 'pending') {
      job.status = 'encoding';
      job.startTime = Date.now();
    }

    return true;
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'failed';
    job.error = error;
    job.endTime = Date.now();

    return true;
  }

  /**
   * Cancel export job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'cancelled';
    job.endTime = Date.now();

    return true;
  }

  /**
   * Get all jobs for clip
   */
  getClipExportJobs(clipId: string): ExportJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.clipId === clipId)
      .map((j) => ({ ...j }));
  }

  /**
   * Estimate file size for export
   */
  estimateFileSize(clipDurationSeconds: number, profileName: string): number {
    const profile = this.profiles.get(profileName);
    if (!profile) return 0;

    // bitrate is in kbps, convert to MB
    const bitrate = profile.specs.bitrate;
    const fileSizeBytes = (bitrate * 1000 * clipDurationSeconds) / 8;
    return Math.ceil(fileSizeBytes / 1024 / 1024); // MB
  }

  /**
   * Estimate export time (in seconds)
   */
  estimateExportTime(clipDurationSeconds: number, profileName: string): number {
    const profile = this.profiles.get(profileName);
    if (!profile) return 0;

    // Simple estimation: based on codec efficiency
    const codecMultiplier: Record<VideoCodec, number> = {
      h264: 1.0,
      h265: 0.5,
      vp8: 0.8,
      vp9: 0.6,
      av1: 0.3,
      prores: 0.2,
    };

    const baseTime = clipDurationSeconds * 0.5; // Base 0.5s per source second
    const codecFactor = codecMultiplier[profile.specs.videoCodec] || 1.0;

    return Math.ceil(baseTime * codecFactor);
  }

  /**
   * Validate export configuration
   */
  validateExport(clip: EditedClip, profileName: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!clip.segments || clip.segments.length === 0) {
      errors.push('Clip has no segments');
    }

    if (clip.totalDuration <= 0) {
      errors.push('Clip duration must be greater than 0');
    }

    const profile = this.profiles.get(profileName);
    if (!profile) {
      errors.push(`Profile not found: ${profileName}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get recommended profiles for clip duration
   */
  getRecommendedProfiles(clipDurationSeconds: number): ExportProfile[] {
    // For short clips, recommend web/social profiles
    // For medium clips, recommend mixed
    // For long clips, recommend broadcast
    const profiles = Array.from(this.profiles.values());

    if (clipDurationSeconds < 60) {
      return profiles.filter((p) => p.platforms.includes('social') || p.platforms.includes('web'));
    } else if (clipDurationSeconds < 600) {
      return profiles.filter((p) => p.platforms.includes('web') || p.platforms.includes('broadcast'));
    } else {
      return profiles.filter((p) => p.platforms.includes('broadcast') || p.platforms.includes('desktop'));
    }
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): ExportJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === 'pending' || j.status === 'encoding')
      .map((j) => ({ ...j }));
  }

  /**
   * Get job queue
   */
  getJobQueue(): ExportJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
      .map((j) => ({ ...j }));
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): number {
    const completedCount = Array.from(this.jobs.values()).filter((j) => j.status === 'completed').length;

    this.jobs = new Map(
      Array.from(this.jobs.entries()).filter(([, j]) => j.status !== 'completed')
    );

    return completedCount;
  }

  /**
   * Reset formatter
   */
  reset(): void {
    this.jobs.clear();
    this.jobCounter = 0;
  }
}
