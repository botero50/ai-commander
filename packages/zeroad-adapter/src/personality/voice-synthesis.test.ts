import { VoiceSynthesizer } from './voice-synthesis';
import { VoiceCharacteristics } from './personality-profile';

describe('VoiceSynthesizer', () => {
  let synthesizer: VoiceSynthesizer;

  const createMockVoice = (): VoiceCharacteristics => ({
    voiceId: 'voice_test_1',
    name: 'Test Voice',
    gender: 'male',
    age: 35,
    pitch: 120,
    pace: 'normal',
    tone: 'professional',
  });

  beforeEach(() => {
    synthesizer = new VoiceSynthesizer();
  });

  test('initializes synthesizer with variations', () => {
    const variations = synthesizer.getAllVariations();
    expect(variations.length).toBeGreaterThan(0);
  });

  test('synthesizes text to speech', () => {
    const voice = createMockVoice();
    const audio = synthesizer.synthesize('Hello, this is a test.', voice);

    expect(audio).toBeDefined();
    expect(audio.audioId).toBeDefined();
    expect(audio.duration).toBeGreaterThan(0);
    expect(audio.metadata.wordCount).toBe(5);
    expect(audio.metadata.characterCount).toBeGreaterThan(0);
  });

  test('estimates duration based on text length', () => {
    const voice = createMockVoice();
    const short = synthesizer.synthesize('Hi', voice);
    const long = synthesizer.synthesize('This is a much longer sentence with many more words.', voice);

    expect(long.duration).toBeGreaterThan(short.duration);
  });

  test('synthesizes with emotion', () => {
    const voice = createMockVoice();
    const audio = synthesizer.synthesizeWithEmotion('That was amazing!', voice, 'happy');

    expect(audio).toBeDefined();
    expect(audio.duration).toBeGreaterThan(0);
  });

  test('synthesizes different emotions', () => {
    const voice = createMockVoice();
    const emotions: Array<'neutral' | 'happy' | 'sad' | 'angry' | 'fearful'> = [
      'neutral',
      'happy',
      'sad',
      'angry',
      'fearful',
    ];

    for (const emotion of emotions) {
      const audio = synthesizer.synthesizeWithEmotion('Test text', voice, emotion);
      expect(audio).toBeDefined();
    }
  });

  test('synthesizes with SSML markup', () => {
    const voice = createMockVoice();
    const ssml = '<speak><p>Hello</p><p>World</p></speak>';
    const audio = synthesizer.synthesizeWithSSML(ssml, voice);

    expect(audio).toBeDefined();
    expect(audio.duration).toBeGreaterThan(0);
  });

  test('applies voice variation', () => {
    const voice = createMockVoice();
    const original = synthesizer.synthesize('Test sentence', voice);
    const varied = synthesizer.applyVariation(original.audioId, 'var_excited');

    expect(varied).toBeDefined();
    expect(varied?.audioId).not.toBe(original.audioId);
    expect(varied?.duration).toBeGreaterThan(0);
  });

  test('returns null for non-existent audio variation', () => {
    const varied = synthesizer.applyVariation('nonexistent', 'var_excited');
    expect(varied).toBeNull();
  });

  test('gets audio', () => {
    const voice = createMockVoice();
    const created = synthesizer.synthesize('Test', voice);
    const retrieved = synthesizer.getAudio(created.audioId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.audioId).toBe(created.audioId);
  });

  test('returns null for missing audio', () => {
    const audio = synthesizer.getAudio('nonexistent');
    expect(audio).toBeNull();
  });

  test('gets all variations', () => {
    const variations = synthesizer.getAllVariations();
    expect(Array.isArray(variations)).toBe(true);
    expect(variations.length).toBeGreaterThan(0);
  });

  test('gets specific variation', () => {
    const variation = synthesizer.getVariation('var_confident');
    expect(variation).toBeDefined();
    expect(variation?.name).toBe('Confident');
  });

  test('creates custom variation', () => {
    const custom = synthesizer.createVariation('voice_base', 'Custom Voice', 2, 1.1, 3);

    expect(custom).toBeDefined();
    expect(custom.name).toBe('Custom Voice');
    expect(custom.adjustments.pitchShift).toBe(2);
    expect(custom.adjustments.speedModifier).toBe(1.1);
  });

  test('clamps pitch shift values', () => {
    const clamped = synthesizer.createVariation('voice_base', 'Clamped', 50, 1.0, 0);
    expect(clamped.adjustments.pitchShift).toBeLessThanOrEqual(20);
  });

  test('clamps speed modifier values', () => {
    const clamped = synthesizer.createVariation('voice_base', 'Clamped', 0, 5, 0);
    expect(clamped.adjustments.speedModifier).toBeLessThanOrEqual(2.0);
  });

  test('gets cache statistics', () => {
    const voice = createMockVoice();

    synthesizer.synthesize('Test 1', voice);
    synthesizer.synthesize('Test 2', voice);
    synthesizer.synthesize('Test 1', voice); // Cache hit

    const stats = synthesizer.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.totalRequests).toBeGreaterThanOrEqual(3);
  });

  test('cache hit improves hit rate', () => {
    const voice = createMockVoice();
    const text = 'Repeated text for cache testing';

    synthesizer.synthesize(text, voice);
    const statsAfterFirst = synthesizer.getCacheStats();

    synthesizer.synthesize(text, voice);
    synthesizer.synthesize(text, voice);
    const statsAfterRepeats = synthesizer.getCacheStats();

    expect(statsAfterRepeats.hitRate).toBeGreaterThan(statsAfterFirst.hitRate);
  });

  test('clears cache', () => {
    const voice = createMockVoice();
    synthesizer.synthesize('Test', voice);

    let stats = synthesizer.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);

    synthesizer.clearCache();
    stats = synthesizer.getCacheStats();
    expect(stats.size).toBe(0);
  });

  test('estimates file size', () => {
    const voice = createMockVoice();
    const audio = synthesizer.synthesize('This is a test sentence', voice);

    const size = synthesizer.estimateFileSize(audio);
    expect(size).toBeGreaterThan(0);
  });

  test('longer audio has larger estimated file size', () => {
    const voice = createMockVoice();
    const short = synthesizer.synthesize('Hi', voice);
    const long = synthesizer.synthesize('This is a much longer sentence with significantly more text', voice);

    const shortSize = synthesizer.estimateFileSize(short);
    const longSize = synthesizer.estimateFileSize(long);

    expect(longSize).toBeGreaterThan(shortSize);
  });

  test('creates SSML from text with emotions', () => {
    const text = 'I am happy and sad';
    const emotions = [
      { text: 'happy', emotion: 'joy' },
      { text: 'sad', emotion: 'sorrow' },
    ];

    const ssml = synthesizer.createSSML(text, emotions);
    expect(ssml).toContain('<speak>');
    expect(ssml).toContain('</speak>');
    expect(ssml).toContain('happy');
    expect(ssml).toContain('sad');
  });

  test('different voices generate different audio IDs', () => {
    const voice = createMockVoice();
    const audio1 = synthesizer.synthesize('Test One', voice);
    const audio2 = synthesizer.synthesize('Test Two', voice);

    expect(audio1.audioId).not.toBe(audio2.audioId);
  });

  test('variation with excited modifier has faster rate', () => {
    const excited = synthesizer.getVariation('var_excited');
    expect(excited?.adjustments.speedModifier).toBeGreaterThan(1.0);
  });

  test('variation with cautious modifier has slower rate', () => {
    const cautious = synthesizer.getVariation('var_cautious');
    expect(cautious?.adjustments.speedModifier).toBeLessThan(1.0);
  });

  test('audio metadata includes word and character count', () => {
    const voice = createMockVoice();
    const text = 'One two three four five';
    const audio = synthesizer.synthesize(text, voice);

    expect(audio.metadata.wordCount).toBe(5);
    expect(audio.metadata.characterCount).toBe(text.length);
  });

  test('audio duration varies with speaking pace', () => {
    const voice: VoiceCharacteristics = {
      voiceId: 'voice_pace_test',
      name: 'Pace Test Voice',
      gender: 'male',
      age: 35,
      pitch: 120,
      pace: 'slow',
      tone: 'professional',
    };

    const text = 'One two three four five six seven eight nine ten';

    // Create synthesizer with slow pace voice
    const slowAudio = synthesizer.synthesize(text, voice);

    // Change voice to fast pace
    const fastVoice = { ...voice, voiceId: 'voice_pace_test_fast', pace: 'fast' as const };
    const fastAudio = synthesizer.synthesize(text, fastVoice);

    // Durations should differ based on pace
    expect(slowAudio.duration).not.toBe(fastAudio.duration);
    expect(slowAudio.duration).toBeGreaterThan(0);
    expect(fastAudio.duration).toBeGreaterThan(0);
  });

  test('synthesize with different engines', () => {
    const voice = createMockVoice();
    const googleAudio = synthesizer.synthesize('Test', voice, 'google');
    const amazonAudio = synthesizer.synthesize('Test', voice, 'amazon');

    expect(googleAudio.metadata.engine).toBe('google');
    expect(amazonAudio.metadata.engine).toBe('amazon');
  });

  test('resets synthesizer', () => {
    const voice = createMockVoice();
    synthesizer.synthesize('Test', voice);

    let stats = synthesizer.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);

    synthesizer.reset();
    stats = synthesizer.getCacheStats();
    expect(stats.size).toBe(0);
  });

  test('audio format defaults to mp3', () => {
    const voice = createMockVoice();
    const audio = synthesizer.synthesize('Test', voice);

    expect(audio.format).toBe('mp3');
  });

  test('sample rate is standard', () => {
    const voice = createMockVoice();
    const audio = synthesizer.synthesize('Test', voice);

    expect(audio.sampleRate).toBe(44100);
  });

  test('bitrate is set', () => {
    const voice = createMockVoice();
    const audio = synthesizer.synthesize('Test', voice);

    expect(audio.bitrate).toBe(128);
  });

  test('variation adjustments are bounded', () => {
    const variation = synthesizer.createVariation('v', 'Test', 100, 10, 100);

    expect(variation.adjustments.pitchShift).toBeLessThanOrEqual(20);
    expect(variation.adjustments.speedModifier).toBeLessThanOrEqual(2.0);
    expect(variation.adjustments.volumeBoost).toBeLessThanOrEqual(20);
  });
});
