import { PersonalityCommentaryGenerator } from './personality-commentary';
import { PersonalityProfileManager } from './personality-profile';

describe('PersonalityCommentaryGenerator', () => {
  let generator: PersonalityCommentaryGenerator;
  let profileManager: PersonalityProfileManager;

  beforeEach(() => {
    generator = new PersonalityCommentaryGenerator();
    profileManager = new PersonalityProfileManager();
  });

  test('initializes generator', () => {
    expect(generator).toBeDefined();
  });

  test('generates variant for single personality', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const commentary = generator.generateVariant('This is a test', personality);

    expect(commentary).toBeDefined();
    expect(commentary.personalityName).toBe('The Analyst');
    expect(commentary.variantText.length).toBeGreaterThan(0);
  });

  test('variant text differs from original for enthusiastic personality', () => {
    const personality = profileManager.getProfileByName('The Hype Beast')!;
    const original = 'This is a great play';
    const commentary = generator.generateVariant(original, personality);

    expect(commentary.variantText).not.toBe(original);
  });

  test('analyst creates detailed variants', () => {
    const analyst = profileManager.getProfileByName('The Analyst')!;
    const commentary = generator.generateVariant('Quick attack in the early game', analyst);

    expect(commentary.variantText.length).toBeGreaterThan(10);
  });

  test('hype generates energetic variants', () => {
    const hype = profileManager.getProfileByName('The Hype Beast')!;
    const commentary = generator.generateVariant('Nice move', hype);

    expect(commentary.metadata.energyLevel! > 5).toBe(true);
  });

  test('generates multiple variants', () => {
    const personalities = profileManager.getAllProfiles();
    const commentaries = generator.generateMultiVariants('Test text', personalities);

    expect(commentaries.length).toBe(personalities.length);
  });

  test('all variants have unique IDs', () => {
    const personalities = profileManager.getAllProfiles().slice(0, 3);
    const commentaries = generator.generateMultiVariants('Test', personalities);

    const ids = commentaries.map((c) => c.commentaryId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('retrieves commentary by ID', () => {
    const personality = profileManager.getProfileByName('The Storyteller')!;
    const created = generator.generateVariant('Test', personality);

    const retrieved = generator.getCommentary(created.commentaryId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.commentaryId).toBe(created.commentaryId);
  });

  test('returns null for missing commentary', () => {
    const commentary = generator.getCommentary('nonexistent');
    expect(commentary).toBeNull();
  });

  test('gets all commentaries', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    generator.generateVariant('Test 1', personality);
    generator.generateVariant('Test 2', personality);

    const all = generator.getAllCommentaries();
    expect(all.length).toBe(2);
  });

  test('compares variants', () => {
    const personalities = profileManager.getAllProfiles().slice(0, 2);
    const comparison = generator.compareVariants('Original text', personalities);

    expect(comparison.original).toBe('Original text');
    expect(comparison.variants.length).toBe(2);
    expect(comparison.variants[0]).toHaveProperty('personality');
    expect(comparison.variants[0]).toHaveProperty('text');
    expect(comparison.variants[0]).toHaveProperty('energyLevel');
  });

  test('applies analyst archetype', () => {
    const text = generator.applyArchetype('The game is intense', 'analyst');
    expect(text).toContain('analytical');
  });

  test('applies hype archetype', () => {
    const text = generator.applyArchetype('Nice play', 'hype');
    expect(text.toUpperCase()).toContain('INSANE');
  });

  test('applies storyteller archetype', () => {
    const text = generator.applyArchetype('Player attacked', 'storyteller');
    expect(text).toContain('story continues');
  });

  test('applies educator archetype', () => {
    const text = generator.applyArchetype('This shows strategy', 'educator');
    expect(text).toContain('Let me explain');
  });

  test('applies comedian archetype', () => {
    const text = generator.applyArchetype('Failed attempt', 'comedian');
    expect(text).toContain('classic');
  });

  test('commentary includes word count', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const commentary = generator.generateVariant('One two three four five', personality);

    expect(commentary.metadata.wordCount).toBeGreaterThan(0);
  });

  test('commentary has generated timestamp', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const commentary = generator.generateVariant('Test', personality);

    expect(commentary.metadata.generatedAt).toBeDefined();
    expect(commentary.metadata.generatedAt).toBeGreaterThan(0);
  });

  test('segments are created from text', () => {
    const personality = profileManager.getProfileByName('The Storyteller')!;
    const commentary = generator.generateVariant('First. Second. Third.', personality);

    expect(commentary.segments.length).toBeGreaterThan(0);
    expect(commentary.segments[0]).toHaveProperty('text');
    expect(commentary.segments[0]).toHaveProperty('intensity');
  });

  test('hype personality increases energy level', () => {
    const hype = profileManager.getProfileByName('The Hype Beast')!;
    const analyst = profileManager.getProfileByName('The Analyst')!;

    const hypeCommentary = generator.generateVariant('Test', hype);
    const analystCommentary = generator.generateVariant('Test', analyst);

    expect(hypeCommentary.metadata.energyLevel! > analystCommentary.metadata.energyLevel!).toBe(
      true
    );
  });

  test('formal vocabulary increases formality adjustment', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const commentary = generator.generateVariant('Test text', personality);

    expect(commentary.metadata.formalityAdjustment! > 0).toBe(true);
  });

  test('casual vocabulary decreases formality adjustment', () => {
    const personality = profileManager.getProfileByName('The Hype Beast')!;
    const commentary = generator.generateVariant('Test text', personality);

    expect(commentary.metadata.formalityAdjustment! < 0).toBe(true);
  });

  test('controversial personality shows sentiment shift', () => {
    const personality = profileManager.getProfileByName('The Comedian')!;
    const commentary = generator.generateVariant('This is debatable', personality);

    expect(commentary.metadata.sentimentShift! >= -100).toBe(true);
    expect(commentary.metadata.sentimentShift! <= 100).toBe(true);
  });

  test('different personalities produce different variants', () => {
    const text = 'Strategic decision made';
    const personalities = profileManager.getAllProfiles().slice(0, 3);

    const commentaries = generator.generateMultiVariants(text, personalities);
    const texts = commentaries.map((c) => c.variantText);

    // At least some should be different
    expect(new Set(texts).size).toBeGreaterThan(1);
  });

  test('reset clears commentaries', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    generator.generateVariant('Test', personality);

    expect(generator.getAllCommentaries().length).toBe(1);

    generator.reset();
    expect(generator.getAllCommentaries().length).toBe(0);
  });

  test('intensity is calculated from personality traits', () => {
    const personality = profileManager.getProfileByName('The Hype Beast')!;
    const commentary = generator.generateVariant('Test', personality);

    for (const segment of commentary.segments) {
      expect(segment.intensity).toBeGreaterThanOrEqual(1);
      expect(segment.intensity).toBeLessThanOrEqual(10);
    }
  });

  test('formality adjustment is bounded', () => {
    const personalities = profileManager.getAllProfiles();

    for (const personality of personalities) {
      const commentary = generator.generateVariant('Test', personality);
      expect(commentary.metadata.formalityAdjustment! >= -50).toBe(true);
      expect(commentary.metadata.formalityAdjustment! <= 50).toBe(true);
    }
  });

  test('sentiment shift is bounded', () => {
    const personalities = profileManager.getAllProfiles();

    for (const personality of personalities) {
      const commentary = generator.generateVariant('Test', personality);
      expect(commentary.metadata.sentimentShift! >= -100).toBe(true);
      expect(commentary.metadata.sentimentShift! <= 100).toBe(true);
    }
  });

  test('energy level is bounded', () => {
    const personalities = profileManager.getAllProfiles();

    for (const personality of personalities) {
      const commentary = generator.generateVariant('Test', personality);
      expect(commentary.metadata.energyLevel! >= 1).toBe(true);
      expect(commentary.metadata.energyLevel! <= 10).toBe(true);
    }
  });

  test('emotion is inferred for segments', () => {
    const personality = profileManager.getProfileByName('The Hype Beast')!;
    const commentary = generator.generateVariant('Amazing! Incredible! Fantastic!', personality);

    expect(commentary.segments.length).toBeGreaterThan(0);
    expect(['neutral', 'happy', 'sad', 'angry', 'fearful']).toContain(commentary.segments[0].emotion);
  });

  test('original text is preserved in commentary', () => {
    const personality = profileManager.getProfileByName('The Analyst')!;
    const original = 'This is the original text';
    const commentary = generator.generateVariant(original, personality);

    expect(commentary.originalText).toBe(original);
  });
});
