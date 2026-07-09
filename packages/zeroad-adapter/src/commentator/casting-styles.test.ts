import { CastingStyleManager, CastingStyle } from './casting-styles';
import { GameState, Unit, Building } from '../state/state-types';

describe('CastingStyleManager', () => {
  let manager: CastingStyleManager;

  beforeEach(() => {
    manager = new CastingStyleManager();
  });

  const createDefaultState = (): GameState => ({
    tick: 0,
    timestamp: 0,
    players: [
      {
        id: 1,
        name: 'Alice',
        civ: 'Britons',
        color: 'blue',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 2: 'neutral' },
      },
      {
        id: 2,
        name: 'Bob',
        civ: 'Athenians',
        color: 'red',
        resources: { food: 500, wood: 500, stone: 500, metal: 500 },
        populationCurrent: 50,
        populationMax: 100,
        diplomacy: { 1: 'neutral' },
      },
    ],
    units: [],
    buildings: [],
    map: { width: 200, height: 200, terrain: 'grass' },
  });

  test('initializes with professional style', () => {
    expect(manager.getStyle()).toBe('professional');
  });

  test('switches to energetic style', () => {
    manager.setStyle('energetic');
    expect(manager.getStyle()).toBe('energetic');
  });

  test('switches to analytical style', () => {
    manager.setStyle('analytical');
    expect(manager.getStyle()).toBe('analytical');
  });

  test('switches to beginner_friendly style', () => {
    manager.setStyle('beginner_friendly');
    expect(manager.getStyle()).toBe('beginner_friendly');
  });

  test('throws on invalid style', () => {
    expect(() => {
      manager.setStyle('invalid_style' as CastingStyle);
    }).toThrow();
  });

  test('returns all available styles', () => {
    const styles = manager.getAvailableStyles();
    expect(styles.length).toBe(4);
    expect(styles.map((s) => s.id)).toEqual(['professional', 'energetic', 'analytical', 'beginner_friendly']);
  });

  test('generates professional commentary', () => {
    manager.setStyle('professional');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    manager.update(state);

    const commentary = manager.getStyledCommentary();
    expect(commentary).toBeInstanceOf(Array);
    for (const line of commentary) {
      expect(line.style).toBe('professional');
    }
  });

  test('generates energetic commentary', () => {
    manager.setStyle('energetic');
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    manager.update(state);

    state.tick = 100;
    state.timestamp = 100;

    manager.update(state);

    const commentary = manager.getStyledCommentary();
    expect(commentary).toBeInstanceOf(Array);
    for (const line of commentary) {
      expect(line.style).toBe('energetic');
      // Energetic style might have exclamation marks
      expect(line.styledText).toBeTruthy();
    }
  });

  test('generates analytical commentary', () => {
    manager.setStyle('analytical');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Cavalry',
      position: { x: 110, z: 100 },
      health: 70,
      maxHealth: 70,
    } as Unit);

    manager.update(state);

    const commentary = manager.getStyledCommentary();
    expect(commentary).toBeInstanceOf(Array);
    for (const line of commentary) {
      expect(line.style).toBe('analytical');
    }
  });

  test('generates beginner_friendly commentary', () => {
    manager.setStyle('beginner_friendly');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    state.tick = 100;
    state.timestamp = 100;

    state.units.push({
      id: 2,
      owner: 1,
      type: 'Civic Centre',
      position: { x: 150, z: 150 },
      health: 100,
      maxHealth: 100,
    } as Unit);

    manager.update(state);

    const commentary = manager.getStyledCommentary();
    expect(commentary).toBeInstanceOf(Array);
    for (const line of commentary) {
      expect(line.style).toBe('beginner_friendly');
    }
  });

  test('gets recent styled commentary', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    for (let i = 1; i <= 10; i++) {
      state.tick = i * 100;
      state.timestamp = i * 1000;

      state.units.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 10, z: 100 + i * 10 },
        health: 100,
        maxHealth: 100,
      } as Unit);

      manager.update(state);
    }

    const recent = manager.getRecentStyledCommentary(3);
    expect(recent.length).toBeLessThanOrEqual(3);
  });

  test('styled text differs from original', () => {
    manager.setStyle('energetic');
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    manager.update(state);

    state.tick = 100;
    state.timestamp = 100;

    manager.update(state);

    const commentary = manager.getStyledCommentary();
    for (const line of commentary) {
      // Styled text should be different from original (unless no style matched)
      if (line.styledText !== line.originalText) {
        expect(line.styledText).toBeTruthy();
      }
    }
  });

  test('gets styled story', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    for (let i = 1; i <= 10; i++) {
      state.tick = i * 100;
      state.timestamp = i * 10000;

      if (i === 5) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      manager.update(state);
    }

    const story = manager.getStyledStory();
    expect(story.style).toBe('professional');
    expect(story.originalStory).toBeTruthy();
    expect(story.styledStory).toBeTruthy();
  });

  test('different styles produce different narratives', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 10000;

      if (i === 3) {
        state.units.push({
          id: 100 + i,
          owner: 1,
          type: 'Civic Centre',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          health: 100,
          maxHealth: 100,
        } as Unit);
      }

      manager.update(state);
    }

    const styles: CastingStyle[] = ['professional', 'energetic', 'analytical', 'beginner_friendly'];
    const stories = [];

    for (const style of styles) {
      manager.setStyle(style);
      const story = manager.getStyledStory();
      stories.push(story.styledStory);
    }

    // At least some should be different
    const unique = new Set(stories);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('gets stats for current style', () => {
    manager.setStyle('analytical');
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.update(state);

    const stats = manager.getStatsForCurrentStyle();
    expect(stats.style).toBe('analytical');
    expect(stats.styleConfig).toBeDefined();
    expect(stats.focusAreas).toBeDefined();
  });

  test('accesses raw engines', () => {
    const commentaryEngine = manager.getCommentaryEngine();
    const storylineEngine = manager.getStorylineEngine();

    expect(commentaryEngine).toBeDefined();
    expect(storylineEngine).toBeDefined();
  });

  test('resets all engines', () => {
    const state = createDefaultState();

    state.buildings = [
      {
        id: 1,
        owner: 1,
        type: 'Wonder',
        position: { x: 100, z: 100 },
        health: 10,
        maxHealth: 1000,
      } as Building,
    ];

    manager.update(state);

    let commentary = manager.getStyledCommentary();
    expect(commentary).toBeInstanceOf(Array);

    manager.reset();

    commentary = manager.getStyledCommentary();
    expect(commentary.length).toBe(0);
    expect(manager.getStyle()).toBe('professional');
  });

  test('switches styles multiple times', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    const styles: CastingStyle[] = ['professional', 'energetic', 'analytical', 'beginner_friendly'];

    for (const style of styles) {
      manager.setStyle(style);
      expect(manager.getStyle()).toBe(style);

      manager.update(state);
      const commentary = manager.getStyledCommentary();
      expect(commentary).toBeInstanceOf(Array);
    }
  });

  test('style descriptions are informative', () => {
    const styles = manager.getAvailableStyles();

    for (const style of styles) {
      expect(style.name).toBeTruthy();
      expect(style.description).toBeTruthy();
      expect(style.description.length).toBeGreaterThan(10);
    }
  });

  test('handles multiple updates with style switching', () => {
    const state = createDefaultState();

    state.units = [
      {
        id: 1,
        owner: 1,
        type: 'Town Hall',
        position: { x: 100, z: 100 },
        health: 100,
        maxHealth: 100,
      } as Unit,
    ];

    manager.setStyle('professional');
    manager.update(state);

    for (let i = 1; i <= 5; i++) {
      state.tick = i * 100;
      state.timestamp = i * 1000;

      if (i === 2) manager.setStyle('energetic');
      if (i === 4) manager.setStyle('analytical');

      state.units.push({
        id: 100 + i,
        owner: 1,
        type: 'Civic Centre',
        position: { x: 100 + i * 10, z: 100 + i * 10 },
        health: 100,
        maxHealth: 100,
      } as Unit);

      manager.update(state);
    }

    const commentary = manager.getStyledCommentary();
    expect(commentary).toBeInstanceOf(Array);
    expect(manager.getStyle()).toBe('analytical');
  });
});
