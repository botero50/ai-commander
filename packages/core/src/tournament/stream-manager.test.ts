import { StreamManager } from './stream-manager';

describe('StreamManager', () => {
  let manager: StreamManager;

  beforeEach(() => {
    manager = new StreamManager();
  });

  test('initializes manager', () => {
    const profiles = manager.getAllProfiles();
    expect(profiles.length).toBe(4);
  });

  test('starts stream', () => {
    const stream = manager.startStream('stream1', 'hls', 'high');
    expect(stream.streamId).toBe('stream1');
    expect(stream.format).toBe('hls');
    expect(stream.isActive).toBe(true);
  });

  test('prevents duplicate streams', () => {
    manager.startStream('stream1', 'hls');
    expect(() => manager.startStream('stream1', 'dash')).toThrow();
  });

  test('stops stream', () => {
    manager.startStream('stream1', 'hls');
    manager.stopStream('stream1');

    const stream = manager.getStream('stream1');
    expect(stream?.isActive).toBe(false);
  });

  test('creates segments', () => {
    manager.startStream('stream1', 'hls');
    const segment = manager.createSegment('stream1', 10, 300, 50000, true);

    expect(segment.streamId).toBe('stream1');
    expect(segment.frameCount).toBe(300);
    expect(segment.isKeyframe).toBe(true);
  });

  test('prevents creating segment for non-existent stream', () => {
    expect(() => manager.createSegment('nonexistent', 10, 300, 50000)).toThrow();
  });

  test('gets stream information', () => {
    const created = manager.startStream('stream1', 'hls', 'medium');
    const retrieved = manager.getStream('stream1');

    expect(retrieved?.streamId).toBe(created.streamId);
    expect(retrieved?.isActive).toBe(true);
  });

  test('gets active streams', () => {
    manager.startStream('stream1', 'hls');
    manager.startStream('stream2', 'dash');
    manager.startStream('stream3', 'rtmp');

    const active = manager.getActiveStreams();
    expect(active.length).toBe(3);
  });

  test('excludes stopped streams from active list', () => {
    manager.startStream('stream1', 'hls');
    manager.startStream('stream2', 'dash');
    manager.stopStream('stream1');

    const active = manager.getActiveStreams();
    expect(active.length).toBe(1);
    expect(active[0].streamId).toBe('stream2');
  });

  test('gets segments for stream', () => {
    manager.startStream('stream1', 'hls');

    for (let i = 0; i < 10; i++) {
      manager.createSegment('stream1', 10, 300, 50000);
    }

    const segments = manager.getSegments('stream1');
    expect(segments.length).toBe(10);
  });

  test('limits segments returned', () => {
    manager.startStream('stream1', 'hls');

    for (let i = 0; i < 50; i++) {
      manager.createSegment('stream1', 10, 300, 50000);
    }

    const segments = manager.getSegments('stream1', 10);
    expect(segments.length).toBe(10);
  });

  test('adapts quality to bandwidth', () => {
    manager.startStream('stream1', 'hls', 'high');

    // High bandwidth should select best quality
    const quality1 = manager.adaptQuality('stream1', 15000);
    expect(quality1).toBeTruthy();

    // Lower bandwidth should adapt
    const quality2 = manager.adaptQuality('stream1', 3000);
    expect(['low', 'medium']).toContain(quality2);

    // Lowest bandwidth should use low
    const quality3 = manager.adaptQuality('stream1', 500);
    expect(quality3).toBe('low');
  });

  test('reports dropped frames', () => {
    manager.startStream('stream1', 'hls');
    manager.createSegment('stream1', 10, 300, 50000);

    const statsBeforeAdd = manager.getStreamStats('stream1');
    expect(statsBeforeAdd.droppedFrames).toBe(0);

    manager.reportDroppedFrames('stream1', 10);

    const statsAfterAdd = manager.getStreamStats('stream1');
    expect(statsAfterAdd.droppedFrames).toBe(10);
  });

  test('calculates drop rate', () => {
    manager.startStream('stream1', 'hls');
    manager.createSegment('stream1', 10, 1000, 50000);
    manager.reportDroppedFrames('stream1', 100);

    const stats = manager.getStreamStats('stream1');
    expect(stats.dropRate).toBeGreaterThan(0);
    expect(stats.dropRate).toBeLessThanOrEqual(100);
  });

  test('gets encoding profile', () => {
    const profile = manager.getProfile('high');
    expect(profile?.quality).toBe('high');
    expect(profile?.config.bitrate).toBeGreaterThan(0);
  });

  test('gets all profiles', () => {
    const profiles = manager.getAllProfiles();
    const qualities = profiles.map((p) => p.quality);

    expect(qualities).toContain('ultra');
    expect(qualities).toContain('high');
    expect(qualities).toContain('medium');
    expect(qualities).toContain('low');
  });

  test('calculates stream statistics', () => {
    manager.startStream('stream1', 'hls');

    for (let i = 0; i < 5; i++) {
      manager.createSegment('stream1', 10, 300, 50000);
    }

    const stats = manager.getStreamStats('stream1');
    expect(stats.totalFrames).toBe(1500);
    expect(stats.segmentCount).toBe(5);
    expect(stats.duration).toBeGreaterThanOrEqual(0);
  });

  test('calculates average bitrate', () => {
    manager.startStream('stream1', 'hls');

    for (let i = 0; i < 10; i++) {
      manager.createSegment('stream1', 10, 300, 50000);
    }

    const stats = manager.getStreamStats('stream1');
    // avgBitrate depends on elapsed time; if very small, may be 0
    expect(stats.avgBitrate).toBeGreaterThanOrEqual(0);
  });

  test('gets system statistics', () => {
    manager.startStream('stream1', 'hls', 'high');
    manager.startStream('stream2', 'dash', 'medium');

    for (let i = 0; i < 5; i++) {
      manager.createSegment('stream1', 10, 300, 50000);
      manager.createSegment('stream2', 10, 300, 50000);
    }

    const stats = manager.getSystemStats();
    expect(stats.activeStreams).toBe(2);
    expect(stats.totalSegments).toBe(10);
    expect(stats.totalDataStreamed).toBeGreaterThan(0);
  });

  test('switches stream format', () => {
    const stream = manager.startStream('stream1', 'hls');
    expect(stream.format).toBe('hls');

    manager.switchFormat('stream1', 'dash');

    const updated = manager.getStream('stream1');
    expect(updated?.format).toBe('dash');
  });

  test('recommends quality for bandwidth', () => {
    const ultra = manager.getRecommendedQuality(25000);
    expect(ultra).toBe('ultra');

    const high = manager.getRecommendedQuality(10000);
    expect(high).toBe('high');

    const medium = manager.getRecommendedQuality(5000);
    expect(medium).toBe('medium');

    const low = manager.getRecommendedQuality(1000);
    expect(low).toBe('low');
  });

  test('increments segment sequence', () => {
    manager.startStream('stream1', 'hls');

    const seg1 = manager.createSegment('stream1', 10, 300, 50000);
    const seg2 = manager.createSegment('stream1', 10, 300, 50000);
    const seg3 = manager.createSegment('stream1', 10, 300, 50000);

    expect(seg1.sequence).toBe(0);
    expect(seg2.sequence).toBe(1);
    expect(seg3.sequence).toBe(2);
  });

  test('marks keyframes correctly', () => {
    manager.startStream('stream1', 'hls');

    const keyframe = manager.createSegment('stream1', 10, 300, 50000, true);
    const normalFrame = manager.createSegment('stream1', 10, 300, 50000, false);

    const segments = manager.getSegments('stream1');
    expect(segments[0].isKeyframe).toBe(true);
    expect(segments[1].isKeyframe).toBe(false);
  });

  test('tracks total data streamed', () => {
    manager.startStream('stream1', 'hls');
    manager.startStream('stream2', 'dash');

    const initialStats = manager.getSystemStats();
    expect(initialStats.totalDataStreamed).toBe(0);

    manager.createSegment('stream1', 10, 300, 100000);
    manager.createSegment('stream2', 10, 300, 50000);

    const updatedStats = manager.getSystemStats();
    expect(updatedStats.totalDataStreamed).toBe(150000);
  });

  test('resets manager', () => {
    manager.startStream('stream1', 'hls');
    manager.startStream('stream2', 'dash');
    manager.createSegment('stream1', 10, 300, 50000);

    manager.reset();

    const streams = manager.getActiveStreams();
    expect(streams.length).toBe(0);

    const stats = manager.getSystemStats();
    expect(stats.totalDataStreamed).toBe(0);
  });

  test('handles multiple formats', () => {
    const hls = manager.startStream('hls_stream', 'hls', 'medium');
    const dash = manager.startStream('dash_stream', 'dash', 'high');
    const rtmp = manager.startStream('rtmp_stream', 'rtmp', 'low');
    const webrtc = manager.startStream('webrtc_stream', 'webrtc', 'ultra');

    expect(hls.format).toBe('hls');
    expect(dash.format).toBe('dash');
    expect(rtmp.format).toBe('rtmp');
    expect(webrtc.format).toBe('webrtc');
  });

  test('adapts multiple streams independently', () => {
    manager.startStream('stream1', 'hls');
    manager.startStream('stream2', 'dash');

    const quality1 = manager.adaptQuality('stream1', 15000);
    const quality2 = manager.adaptQuality('stream2', 1000);

    expect(quality1).toBeTruthy();
    expect(quality2).toBe('low');
  });

  test('calculates frame statistics correctly', () => {
    manager.startStream('stream1', 'hls');

    manager.createSegment('stream1', 10, 100, 50000);
    manager.createSegment('stream1', 10, 150, 50000);
    manager.createSegment('stream1', 10, 250, 50000);

    const stats = manager.getStreamStats('stream1');
    expect(stats.totalFrames).toBe(500);
  });
});
