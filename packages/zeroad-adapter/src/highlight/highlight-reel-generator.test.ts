import { HighlightReelGenerator } from './highlight-reel-generator';
import { HighlightMoment } from './highlight-detector';

describe('HighlightReelGenerator', () => {
  let generator: HighlightReelGenerator;

  const createMockHighlight = (
    id: number,
    type: HighlightMoment['type'] = 'battle',
    importance: number = 8
  ): HighlightMoment => ({
    momentId: `highlight_${id}`,
    type,
    startTime: id * 10,
    endTime: id * 10 + 10,
    duration: 10,
    importance,
    description: `Highlight ${id}`,
    playerIds: [1, 2],
    tags: ['test'],
    thumbnail: {
      timestamp: id * 10 + 10,
      position: { x: 100, z: 100 },
    },
  });

  beforeEach(() => {
    generator = new HighlightReelGenerator();
  });

  test('initializes generator with default templates', () => {
    const templates = generator.getAllTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  test('initializes generator with music library', () => {
    const tracks = generator.getAllMusicTracks();
    expect(tracks.length).toBeGreaterThan(0);
  });

  test('generates composition from highlights', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2), createMockHighlight(3)];

    const composition = generator.generateComposition('Test Reel', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: true,
    });

    expect(composition).toBeDefined();
    expect(composition?.title).toBe('Test Reel');
    expect(composition?.segmentCount).toBeGreaterThan(0);
    expect(composition?.musicTrack).toBeDefined();
  });

  test('returns null for empty highlights', () => {
    const composition = generator.generateComposition('Test', [], {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
    });

    expect(composition).toBeNull();
  });

  test('filters highlights by importance', () => {
    const highlights = [
      createMockHighlight(1, 'battle', 2),
      createMockHighlight(2, 'battle', 8),
      createMockHighlight(3, 'battle', 9),
    ];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      minImportance: 7,
      includeMusic: false,
    });

    expect(composition).toBeDefined();
    expect(composition?.highlights.length).toBe(2);
  });

  test('respects maximum duration', () => {
    const highlights = [
      createMockHighlight(1, 'battle', 10),
      createMockHighlight(2, 'battle', 10),
      createMockHighlight(3, 'battle', 10),
      createMockHighlight(4, 'battle', 10),
    ];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 30,
      includeMusic: false,
    });

    expect(composition).toBeDefined();
    expect(composition!.totalDuration).toBeLessThanOrEqual(30);
  });

  test('retrieves template', () => {
    const template = generator.getTemplate('cinematic-action');
    expect(template).toBeDefined();
    expect(template?.name).toBe('Cinematic Action');
  });

  test('returns null for missing template', () => {
    const template = generator.getTemplate('nonexistent');
    expect(template).toBeNull();
  });

  test('converts composition to clip', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2)];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: true,
    })!;

    const clip = generator.compositionToClip(composition.compositionId);

    expect(clip).toBeDefined();
    expect(clip?.title).toBe(composition.title);
    expect(clip?.segments.length).toBeGreaterThan(0);
    expect(clip?.audioTracks.length).toBeGreaterThan(0);
  });

  test('returns null for invalid composition in clip conversion', () => {
    const clip = generator.compositionToClip('nonexistent');
    expect(clip).toBeNull();
  });

  test('gets composition', () => {
    const highlights = [createMockHighlight(1)];

    const created = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    const retrieved = generator.getComposition(created.compositionId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.compositionId).toBe(created.compositionId);
  });

  test('gets all compositions', () => {
    const highlights = [createMockHighlight(1)];

    generator.generateComposition('Reel 1', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    });

    generator.generateComposition('Reel 2', highlights, {
      template: generator.getTemplate('epic-highlight')!,
      maxDuration: 120,
      includeMusic: false,
    });

    const compositions = generator.getAllCompositions();
    expect(compositions.length).toBe(2);
  });

  test('deletes composition', () => {
    const highlights = [createMockHighlight(1)];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    expect(generator.getAllCompositions().length).toBe(1);

    const deleted = generator.deleteComposition(composition.compositionId);
    expect(deleted).toBe(true);
    expect(generator.getAllCompositions().length).toBe(0);
  });

  test('duplicates composition', () => {
    const highlights = [createMockHighlight(1)];

    const original = generator.generateComposition('Original', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    const duplicate = generator.duplicateComposition(original.compositionId, 'Duplicate');

    expect(duplicate).toBeDefined();
    expect(duplicate?.compositionId).not.toBe(original.compositionId);
    expect(duplicate?.title).toBe('Duplicate');
    expect(duplicate?.segmentCount).toBe(original.segmentCount);
  });

  test('gets music track', () => {
    const track = generator.getMusicTrack('music_1');
    expect(track).toBeDefined();
    expect(track?.title).toBe('Intense Battle');
  });

  test('returns null for missing music track', () => {
    const track = generator.getMusicTrack('nonexistent');
    expect(track).toBeNull();
  });

  test('gets music tracks by mood', () => {
    const tracks = generator.getMusicForMood('intense');
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.every((t) => t.mood === 'intense')).toBe(true);
  });

  test('gets all music tracks', () => {
    const tracks = generator.getAllMusicTracks();
    expect(tracks.length).toBeGreaterThan(0);
  });

  test('selects action-themed music for cinematic action template', () => {
    const highlights = [createMockHighlight(1)];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: true,
    })!;

    expect(composition.musicTrack).toBeDefined();
    expect(['intense', 'epic']).toContain(composition.musicTrack?.mood);
  });

  test('gets composition statistics', () => {
    const highlights = [
      createMockHighlight(1, 'battle', 8),
      createMockHighlight(2, 'expansion', 6),
      createMockHighlight(3, 'battle', 9),
    ];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    const stats = generator.getCompositionStats(composition.compositionId);

    expect(stats).toBeDefined();
    expect(stats?.segmentCount).toBeGreaterThan(0);
    expect(stats?.totalDuration).toBeLessThanOrEqual(120);
    expect(stats?.averageSegmentDuration).toBeGreaterThan(0);
    expect(stats?.averageImportance).toBeGreaterThan(0);
    expect(Object.keys(stats?.typeDistribution || {}).length).toBeGreaterThan(0);
  });

  test('regenerates composition with different template', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2), createMockHighlight(3)];

    const original = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    const regenerated = generator.regenerateWithTemplate(
      original.compositionId,
      'strategic-analysis',
      120
    );

    expect(regenerated).toBeDefined();
    expect(regenerated?.template.name).toBe('Strategic Analysis');
  });

  test('focuses on specific players', () => {
    const highlights = [
      { ...createMockHighlight(1), playerIds: [1] },
      { ...createMockHighlight(2), playerIds: [2] },
      { ...createMockHighlight(3), playerIds: [1, 2] },
    ];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      focusPlayers: [1],
      includeMusic: false,
    });

    expect(composition).toBeDefined();
    expect(composition!.selectedSegments.every((s) => s.playerIds.includes(1))).toBe(true);
  });

  test('applies template theme weighting', () => {
    const highlights = [
      createMockHighlight(1, 'battle', 5),
      createMockHighlight(2, 'expansion', 8),
    ];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    });

    // Action template should prioritize battles
    expect(composition?.selectedSegments.some((s) => s.type === 'battle')).toBe(true);
  });

  test('composition has correct metadata', () => {
    const highlights = [createMockHighlight(1)];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    expect(composition.metadata.generatedAt).toBeDefined();
    expect(composition.metadata.generationMethod).toBe('auto');
  });

  test('resets generator', () => {
    const highlights = [createMockHighlight(1)];

    generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    });

    expect(generator.getAllCompositions().length).toBe(1);

    generator.reset();

    expect(generator.getAllCompositions().length).toBe(0);
  });

  test('different compositions have different IDs', () => {
    const highlights = [createMockHighlight(1)];

    const comp1 = generator.generateComposition('Test 1', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    });

    const comp2 = generator.generateComposition('Test 2', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    });

    expect(comp1?.compositionId).not.toBe(comp2?.compositionId);
  });

  test('composition segments have correct properties', () => {
    const highlights = [
      createMockHighlight(1, 'battle', 8),
      createMockHighlight(2, 'battle', 9),
    ];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    for (const segment of composition.selectedSegments) {
      expect(segment.duration).toBeGreaterThan(0);
      expect(segment.weight).toBeGreaterThan(0);
    }
  });

  test('quick recap template targets short duration', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2), createMockHighlight(3)];

    const composition = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('quick-recap')!,
      maxDuration: 30,
      includeMusic: false,
    });

    expect(composition).toBeDefined();
    expect(composition!.totalDuration).toBeLessThanOrEqual(30);
  });

  test('different templates generate different compositions', () => {
    const highlights = [createMockHighlight(1), createMockHighlight(2), createMockHighlight(3)];

    const comp1 = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('cinematic-action')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    const comp2 = generator.generateComposition('Test', highlights, {
      template: generator.getTemplate('strategic-analysis')!,
      maxDuration: 120,
      includeMusic: false,
    })!;

    expect(comp1.template.name).not.toBe(comp2.template.name);
  });
});
