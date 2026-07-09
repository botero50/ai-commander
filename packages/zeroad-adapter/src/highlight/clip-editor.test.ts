import { ClipEditor, TransitionConfig } from './clip-editor';
import { HighlightMoment } from './highlight-detector';

describe('ClipEditor', () => {
  let editor: ClipEditor;

  const createMockHighlight = (id: number, startTime: number = 0, endTime: number = 10): HighlightMoment => ({
    momentId: `highlight_${id}`,
    type: 'battle',
    startTime,
    endTime,
    duration: endTime - startTime,
    importance: 8,
    description: `Highlight ${id}`,
    playerIds: [1, 2],
    tags: ['combat'],
    thumbnail: {
      timestamp: endTime,
      position: { x: 100, z: 100 },
    },
  });

  beforeEach(() => {
    editor = new ClipEditor();
  });

  test('initializes editor', () => {
    expect(editor).toBeDefined();
    expect(editor.getAllClips()).toHaveLength(0);
  });

  test('creates clip from highlights', () => {
    const highlights = [createMockHighlight(1, 0, 10), createMockHighlight(2, 10, 20)];

    const clip = editor.createClip('Test Clip', highlights);

    expect(clip.clipId).toBeDefined();
    expect(clip.title).toBe('Test Clip');
    expect(clip.segments.length).toBe(2);
    expect(clip.totalDuration).toBe(20);
  });

  test('adds segment to clip', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const segment = editor.addSegment(clip.clipId, 20, 30);

    expect(segment).toBeDefined();
    expect(segment?.duration).toBe(10);
    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments.length).toBe(2);
  });

  test('removes segment from clip', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2)];
    const clip = editor.createClip('Test', highlights);

    expect(clip.segments.length).toBe(2);

    const removed = editor.removeSegment(clip.clipId, 0);
    expect(removed).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments.length).toBe(1);
  });

  test('prevents removing invalid segment', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const removed = editor.removeSegment(clip.clipId, 10);
    expect(removed).toBe(false);
  });

  test('sets playback speed for segment', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const set = editor.setSegmentSpeed(clip.clipId, 0, 0.5);
    expect(set).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].playbackSpeed).toBe(0.5);
  });

  test('clamps playback speed to valid range', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    editor.setSegmentSpeed(clip.clipId, 0, 5);
    let updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].playbackSpeed).toBe(2.0); // Max speed

    editor.setSegmentSpeed(clip.clipId, 0, 0.1);
    updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].playbackSpeed).toBe(0.25); // Min speed
  });

  test('reorders segments', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2), createMockHighlight(3)];
    const clip = editor.createClip('Test', highlights);

    const seg0 = { ...clip.segments[0] };
    const seg2 = { ...clip.segments[2] };

    editor.reorderSegments(clip.clipId, 0, 2);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].sourceStartTime).toBe(seg2.sourceStartTime);
    expect(updated?.segments[2].sourceStartTime).toBe(seg0.sourceStartTime);
  });

  test('adds transition between segments', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const transition: TransitionConfig = {
      type: 'fade',
      duration: 500,
      easing: 'ease-in-out',
    };

    const added = editor.addTransition(clip.clipId, 0, transition);
    expect(added).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].transitions.length).toBe(1);
  });

  test('removes transition', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const transition: TransitionConfig = {
      type: 'fade',
      duration: 500,
    };

    editor.addTransition(clip.clipId, 0, transition);
    const removed = editor.removeTransition(clip.clipId, 0, 0);
    expect(removed).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].transitions.length).toBe(0);
  });

  test('adds text overlay', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const overlay = {
      overlayId: 'overlay_1',
      text: 'Epic Battle',
      startTime: 0,
      endTime: 5,
      position: 'bottom' as const,
      fontSize: 24,
      color: '#FFFFFF',
    };

    const added = editor.addTextOverlay(clip.clipId, 0, overlay);
    expect(added).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].textOverlays.length).toBe(1);
  });

  test('removes text overlay', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const overlay = {
      overlayId: 'overlay_1',
      text: 'Epic Battle',
      startTime: 0,
      endTime: 5,
      position: 'bottom' as const,
      fontSize: 24,
      color: '#FFFFFF',
    };

    editor.addTextOverlay(clip.clipId, 0, overlay);
    const removed = editor.removeTextOverlay(clip.clipId, 0, 'overlay_1');
    expect(removed).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].textOverlays.length).toBe(0);
  });

  test('adds audio track', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const track = {
      trackId: 'track_1',
      type: 'music' as const,
      startTime: 0,
      endTime: 10,
      volume: 80,
      fade: {
        in: { duration: 500 },
        out: { duration: 500 },
      },
    };

    const added = editor.addAudioTrack(clip.clipId, track);
    expect(added).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.audioTracks.length).toBe(1);
  });

  test('removes audio track', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    const track = {
      trackId: 'track_1',
      type: 'music' as const,
      startTime: 0,
      endTime: 10,
      volume: 80,
      fade: {},
    };

    editor.addAudioTrack(clip.clipId, track);
    const removed = editor.removeAudioTrack(clip.clipId, 'track_1');
    expect(removed).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.audioTracks.length).toBe(0);
  });

  test('sets clip metadata', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    editor.setMetadata(clip.clipId, {
      theme: 'action',
      style: 'cinematic',
      targetAudience: 'competitive',
    });

    const updated = editor.getClip(clip.clipId);
    expect(updated?.metadata.theme).toBe('action');
    expect(updated?.metadata.style).toBe('cinematic');
  });

  test('sets clip description', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    editor.setDescription(clip.clipId, 'This is an epic battle highlight');

    const updated = editor.getClip(clip.clipId);
    expect(updated?.description).toBe('This is an epic battle highlight');
  });

  test('gets timeline', () => {
    const highlights = [createMockHighlight(1, 0, 10), createMockHighlight(2, 10, 20)];
    const clip = editor.createClip('Test', highlights);

    const timeline = editor.getTimeline(clip.clipId);

    expect(timeline).toBeDefined();
    expect(timeline?.length).toBe(2);
    expect(timeline?.[0].timestamp).toBe(0);
    expect(timeline?.[1].timestamp).toBe(10);
  });

  test('calculates export file size', () => {
    const highlights = [createMockHighlight(1, 0, 30)];
    const clip = editor.createClip('Test', highlights);

    const size720 = editor.estimateFileSize(clip.clipId, {
      format: 'mp4',
      resolution: '720p',
      frameRate: 30,
      bitrate: 5000,
      audioCodec: 'aac',
    });

    expect(size720).toBeGreaterThan(0);

    const size1080 = editor.estimateFileSize(clip.clipId, {
      format: 'mp4',
      resolution: '1080p',
      frameRate: 30,
      bitrate: 8000,
      audioCodec: 'aac',
    });

    expect(size1080).toBeGreaterThan(size720);
  });

  test('performs undo operation', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2)];
    const clip = editor.createClip('Test', highlights);

    editor.removeSegment(clip.clipId, 0);
    let updated = editor.getClip(clip.clipId);
    expect(updated?.segments.length).toBe(1);

    const undone = editor.undo(clip.clipId);
    expect(undone).toBe(true);

    updated = editor.getClip(clip.clipId);
    expect(updated?.segments.length).toBe(2);
  });

  test('performs redo operation', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2)];
    const clip = editor.createClip('Test', highlights);

    editor.removeSegment(clip.clipId, 0);
    editor.undo(clip.clipId);

    const redone = editor.redo(clip.clipId);
    expect(redone).toBe(true);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments.length).toBe(1);
  });

  test('duplicates clip', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Original', highlights);

    editor.setDescription(clip.clipId, 'Original description');

    const duplicate = editor.duplicateClip(clip.clipId, 'Duplicate');

    expect(duplicate).toBeDefined();
    expect(duplicate?.title).toBe('Duplicate');
    expect(duplicate?.clipId).not.toBe(clip.clipId);
    expect(duplicate?.description).toBe('Original description');
  });

  test('gets clip statistics', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    editor.addTransition(clip.clipId, 0, { type: 'fade', duration: 500 });
    editor.addTextOverlay(clip.clipId, 0, {
      overlayId: 'ov1',
      text: 'Text',
      startTime: 0,
      endTime: 5,
      position: 'bottom',
      fontSize: 24,
      color: '#FFF',
    });

    const stats = editor.getClipStats(clip.clipId);

    expect(stats?.segmentCount).toBe(1);
    expect(stats?.transitionCount).toBe(1);
    expect(stats?.textOverlayCount).toBe(1);
    expect(stats?.totalDuration).toBe(10);
  });

  test('deletes clip', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    expect(editor.getAllClips().length).toBe(1);

    const deleted = editor.deleteClip(clip.clipId);
    expect(deleted).toBe(true);
    expect(editor.getAllClips().length).toBe(0);
  });

  test('gets all clips', () => {
    editor.createClip('Clip 1', [createMockHighlight(1)]);
    editor.createClip('Clip 2', [createMockHighlight(2)]);
    editor.createClip('Clip 3', [createMockHighlight(3)]);

    const clips = editor.getAllClips();
    expect(clips.length).toBe(3);
  });

  test('handles missing clip gracefully', () => {
    const segment = editor.addSegment('nonexistent', 0, 10);
    expect(segment).toBeNull();

    const speed = editor.setSegmentSpeed('nonexistent', 0, 0.5);
    expect(speed).toBe(false);

    const clip = editor.getClip('nonexistent');
    expect(clip).toBeNull();
  });

  test('updates total duration when speed changes', () => {
    const highlights = [createMockHighlight(1, 0, 10)];
    const clip = editor.createClip('Test', highlights);

    expect(clip.totalDuration).toBe(10);

    editor.setSegmentSpeed(clip.clipId, 0, 0.5);
    const updated = editor.getClip(clip.clipId);
    expect(updated?.totalDuration).toBe(20); // 10 / 0.5 = 20
  });

  test('resets editor', () => {
    editor.createClip('Clip 1', [createMockHighlight(1)]);
    editor.createClip('Clip 2', [createMockHighlight(2)]);

    expect(editor.getAllClips().length).toBe(2);

    editor.reset();
    expect(editor.getAllClips().length).toBe(0);
  });

  test('inserts segment at specific index', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2)];
    const clip = editor.createClip('Test', highlights);

    editor.addSegment(clip.clipId, 20, 30, 1);

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments.length).toBe(3);
    expect(updated?.segments[1].sourceStartTime).toBe(20);
  });

  test('tracks modification time', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);
    const initialMod = clip.modified;

    editor.setDescription(clip.clipId, 'Updated');

    const updated = editor.getClip(clip.clipId);
    expect(updated?.modified).toBeGreaterThanOrEqual(initialMod);
  });

  test('multiple audio tracks', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    editor.addAudioTrack(clip.clipId, {
      trackId: 'track_1',
      type: 'music',
      startTime: 0,
      endTime: 10,
      volume: 80,
      fade: {},
    });

    editor.addAudioTrack(clip.clipId, {
      trackId: 'track_2',
      type: 'commentary',
      startTime: 0,
      endTime: 10,
      volume: 100,
      fade: {},
    });

    const updated = editor.getClip(clip.clipId);
    expect(updated?.audioTracks.length).toBe(2);
  });

  test('multiple transitions per segment', () => {
    const highlights = [createMockHighlight(1)];
    const clip = editor.createClip('Test', highlights);

    editor.addTransition(clip.clipId, 0, { type: 'fade', duration: 500 });
    editor.addTransition(clip.clipId, 0, { type: 'slide', duration: 300 });
    editor.addTransition(clip.clipId, 0, { type: 'dissolve', duration: 400 });

    const updated = editor.getClip(clip.clipId);
    expect(updated?.segments[0].transitions.length).toBe(3);
  });
});
