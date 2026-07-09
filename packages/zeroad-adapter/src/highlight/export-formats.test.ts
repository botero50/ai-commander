import { ExportFormatter } from './export-formats';
import { ClipEditor } from './clip-editor';
import { HighlightDetector } from './highlight-detector';

describe('ExportFormatter', () => {
  let formatter: ExportFormatter;

  beforeEach(() => {
    formatter = new ExportFormatter();
  });

  test('initializes formatter with default profiles', () => {
    const profiles = formatter.getAllProfiles();
    expect(profiles.length).toBeGreaterThan(0);
  });

  test('initializes formatter with default presets', () => {
    const presets = formatter.getAllPresets();
    expect(presets.length).toBeGreaterThan(0);
  });

  test('retrieves export profile', () => {
    const profile = formatter.getProfile('web-h264-720p');
    expect(profile).toBeDefined();
    expect(profile?.format).toBe('mp4');
    expect(profile?.specs.resolution).toBe('720p');
  });

  test('returns null for missing profile', () => {
    const profile = formatter.getProfile('nonexistent');
    expect(profile).toBeNull();
  });

  test('gets all profiles', () => {
    const profiles = formatter.getAllProfiles();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThan(0);
  });

  test('filters profiles by platform', () => {
    const webProfiles = formatter.getProfilesForPlatform('web');
    expect(webProfiles.length).toBeGreaterThan(0);
    expect(webProfiles.every((p) => p.platforms.includes('web'))).toBe(true);

    const socialProfiles = formatter.getProfilesForPlatform('social');
    expect(socialProfiles.length).toBeGreaterThan(0);
  });

  test('retrieves export preset', () => {
    const preset = formatter.getPreset('quick-share');
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('Quick Share');
  });

  test('gets all presets', () => {
    const presets = formatter.getAllPresets();
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(0);
  });

  test('creates export job', () => {
    const job = formatter.createExportJob('clip_123', 'web-h264-720p', '/output/video.mp4');

    expect(job).toBeDefined();
    expect(job?.clipId).toBe('clip_123');
    expect(job?.status).toBe('pending');
    expect(job?.progress).toBe(0);
  });

  test('returns null for invalid profile in job creation', () => {
    const job = formatter.createExportJob('clip_123', 'nonexistent', '/output/video.mp4');
    expect(job).toBeNull();
  });

  test('retrieves export job', () => {
    const created = formatter.createExportJob('clip_123', 'web-h264-720p', '/output/video.mp4');
    const retrieved = formatter.getExportJob(created!.jobId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.jobId).toBe(created?.jobId);
  });

  test('updates job progress', () => {
    const job = formatter.createExportJob('clip_123', 'web-h264-720p', '/output/video.mp4');
    formatter.updateJobProgress(job!.jobId, 50);

    const updated = formatter.getExportJob(job!.jobId);
    expect(updated?.progress).toBe(50);
    expect(updated?.status).toBe('encoding');
  });

  test('completes job when progress reaches 100', () => {
    const job = formatter.createExportJob('clip_123', 'web-h264-720p', '/output/video.mp4');
    formatter.updateJobProgress(job!.jobId, 100);

    const updated = formatter.getExportJob(job!.jobId);
    expect(updated?.status).toBe('completed');
    expect(updated?.endTime).toBeDefined();
  });

  test('marks job as failed', () => {
    const job = formatter.createExportJob('clip_123', 'web-h264-720p', '/output/video.mp4');
    formatter.failJob(job!.jobId, 'Codec not available');

    const updated = formatter.getExportJob(job!.jobId);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toBe('Codec not available');
  });

  test('cancels export job', () => {
    const job = formatter.createExportJob('clip_123', 'web-h264-720p', '/output/video.mp4');
    formatter.updateJobProgress(job!.jobId, 25);
    const cancelled = formatter.cancelJob(job!.jobId);

    expect(cancelled).toBe(true);
    const updated = formatter.getExportJob(job!.jobId);
    expect(updated?.status).toBe('cancelled');
  });

  test('gets all jobs for clip', () => {
    formatter.createExportJob('clip_123', 'web-h264-720p', '/output/1.mp4');
    formatter.createExportJob('clip_123', 'mobile-h264-480p', '/output/2.mp4');
    formatter.createExportJob('clip_456', 'web-vp9-1080p', '/output/3.webm');

    const jobs123 = formatter.getClipExportJobs('clip_123');
    expect(jobs123.length).toBe(2);
    expect(jobs123.every((j) => j.clipId === 'clip_123')).toBe(true);
  });

  test('estimates file size correctly', () => {
    const size = formatter.estimateFileSize(60, 'web-h264-720p');
    expect(size).toBeGreaterThan(0);
  });

  test('estimates larger file for higher bitrate profile', () => {
    const size480 = formatter.estimateFileSize(60, 'mobile-h264-480p');
    const size1080 = formatter.estimateFileSize(60, 'broadcast-prores-2160p');

    expect(size1080).toBeGreaterThan(size480);
  });

  test('estimates export time', () => {
    const time = formatter.estimateExportTime(120, 'web-h264-720p');
    expect(time).toBeGreaterThan(0);
  });

  test('av1 codec has lower export time multiplier', () => {
    const timeH264 = formatter.estimateExportTime(120, 'web-h264-720p');
    const timeAV1 = formatter.estimateExportTime(120, 'archive-av1-4320p');

    // AV1 with longer duration should still be less time than H264 due to codec
    // This is a relative comparison
    expect(timeAV1).toBeLessThan(timeH264);
  });

  test('validates export with valid clip', () => {
    const detector = new HighlightDetector();
    const highlight = {
      momentId: 'h1',
      type: 'battle' as const,
      startTime: 0,
      endTime: 10,
      duration: 10,
      importance: 8,
      description: 'Battle',
      playerIds: [1],
      tags: [],
      thumbnail: { timestamp: 10, position: { x: 0, z: 0 } },
    };

    const editor = new ClipEditor();
    const clip = editor.createClip('Test', [highlight]);

    const validation = formatter.validateExport(clip, 'web-h264-720p');
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  test('validates export fails with empty clip', () => {
    const editor = new ClipEditor();
    const clip = {
      clipId: 'clip_1',
      title: 'Empty',
      description: '',
      sourceHighlights: [],
      segments: [],
      audioTracks: [],
      totalDuration: 0,
      created: Date.now(),
      modified: Date.now(),
      metadata: {},
    };

    const validation = formatter.validateExport(clip, 'web-h264-720p');
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('validates export fails with invalid profile', () => {
    const editor = new ClipEditor();
    const detector = new HighlightDetector();
    const highlight = {
      momentId: 'h1',
      type: 'battle' as const,
      startTime: 0,
      endTime: 10,
      duration: 10,
      importance: 8,
      description: 'Battle',
      playerIds: [1],
      tags: [],
      thumbnail: { timestamp: 10, position: { x: 0, z: 0 } },
    };

    const clip = editor.createClip('Test', [highlight]);

    const validation = formatter.validateExport(clip, 'nonexistent');
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Profile not found'))).toBe(true);
  });

  test('recommends profiles for short clips', () => {
    const profiles = formatter.getRecommendedProfiles(30); // 30 seconds
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some((p) => p.platforms.includes('social') || p.platforms.includes('web'))).toBe(true);
  });

  test('recommends profiles for medium clips', () => {
    const profiles = formatter.getRecommendedProfiles(300); // 5 minutes
    expect(profiles.length).toBeGreaterThan(0);
  });

  test('recommends profiles for long clips', () => {
    const profiles = formatter.getRecommendedProfiles(3600); // 1 hour
    expect(profiles.length).toBeGreaterThan(0);
  });

  test('gets active jobs', () => {
    const job1 = formatter.createExportJob('clip_1', 'web-h264-720p', '/out1.mp4');
    const job2 = formatter.createExportJob('clip_2', 'web-h264-720p', '/out2.mp4');

    formatter.updateJobProgress(job1!.jobId, 50);

    const active = formatter.getActiveJobs();
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((j) => j.status === 'pending' || j.status === 'encoding')).toBe(true);
  });

  test('gets job queue in order', () => {
    const job1 = formatter.createExportJob('clip_1', 'web-h264-720p', '/out1.mp4');
    const job2 = formatter.createExportJob('clip_2', 'web-h264-720p', '/out2.mp4');

    const queue = formatter.getJobQueue();
    expect(queue.length).toBe(2);
  });

  test('clears completed jobs', () => {
    const job1 = formatter.createExportJob('clip_1', 'web-h264-720p', '/out1.mp4');
    const job2 = formatter.createExportJob('clip_2', 'web-h264-720p', '/out2.mp4');

    formatter.updateJobProgress(job1!.jobId, 100);
    formatter.updateJobProgress(job2!.jobId, 100);

    const clearedCount = formatter.clearCompletedJobs();
    expect(clearedCount).toBe(2);

    const remaining = formatter.getActiveJobs();
    expect(remaining.length).toBe(0);
  });

  test('profile has correct mime type', () => {
    const profile = formatter.getProfile('web-h264-720p');
    expect(profile?.mimeType).toBe('video/mp4');

    const webmProfile = formatter.getProfile('web-vp9-1080p');
    expect(webmProfile?.mimeType).toBe('video/webm');
  });

  test('profile has file extension', () => {
    const profile = formatter.getProfile('web-h264-720p');
    expect(profile?.fileExtension).toBe('.mp4');

    const webmProfile = formatter.getProfile('web-vp9-1080p');
    expect(webmProfile?.fileExtension).toBe('.webm');
  });

  test('preset contains valid profile names', () => {
    const preset = formatter.getPreset('quick-share');
    expect(preset).toBeDefined();
    expect(Array.isArray(preset?.profiles)).toBe(true);
    expect(preset!.profiles.length).toBeGreaterThan(0);
  });

  test('resets formatter', () => {
    formatter.createExportJob('clip_1', 'web-h264-720p', '/out.mp4');
    expect(formatter.getActiveJobs().length).toBeGreaterThan(0);

    formatter.reset();
    expect(formatter.getActiveJobs().length).toBe(0);
  });

  test('broadcast profile uses highest quality', () => {
    const profile = formatter.getProfile('broadcast-prores-2160p');
    expect(profile?.specs.resolution).toBe('2160p');
    expect(profile?.specs.frameRate).toBe(60);
  });

  test('mobile profile uses lower bitrate', () => {
    const mobileProfile = formatter.getProfile('mobile-h264-480p');
    const webProfile = formatter.getProfile('web-h264-720p');

    expect(mobileProfile!.specs.bitrate).toBeLessThan(webProfile!.specs.bitrate);
  });

  test('different jobs have different IDs', () => {
    const job1 = formatter.createExportJob('clip_1', 'web-h264-720p', '/out1.mp4');
    const job2 = formatter.createExportJob('clip_1', 'web-h264-720p', '/out2.mp4');

    expect(job1!.jobId).not.toBe(job2!.jobId);
  });

  test('preset has optional watermark', () => {
    const preset = formatter.getPreset('quick-share');
    expect(preset?.watermark).toBeDefined();
    expect(preset?.watermark?.text).toBe('AI Commander');
  });
});
