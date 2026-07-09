import { PersonalityProfileManager, PersonalityArchetype } from './personality-profile';

describe('PersonalityProfileManager', () => {
  let manager: PersonalityProfileManager;

  beforeEach(() => {
    manager = new PersonalityProfileManager();
  });

  test('initializes with default profiles', () => {
    const profiles = manager.getAllProfiles();
    expect(profiles.length).toBe(5);
  });

  test('has analyst profile', () => {
    const analyst = manager.getProfileByName('The Analyst');
    expect(analyst).toBeDefined();
    expect(analyst?.archetype).toBe('analyst');
  });

  test('has hype profile', () => {
    const hype = manager.getProfileByName('The Hype Beast');
    expect(hype).toBeDefined();
    expect(hype?.archetype).toBe('hype');
  });

  test('has storyteller profile', () => {
    const story = manager.getProfileByName('The Storyteller');
    expect(story).toBeDefined();
    expect(story?.archetype).toBe('storyteller');
  });

  test('has educator profile', () => {
    const educator = manager.getProfileByName('The Educator');
    expect(educator).toBeDefined();
    expect(educator?.archetype).toBe('educator');
  });

  test('has comedian profile', () => {
    const comedian = manager.getProfileByName('The Comedian');
    expect(comedian).toBeDefined();
    expect(comedian?.archetype).toBe('comedian');
  });

  test('retrieves profile by ID', () => {
    const all = manager.getAllProfiles();
    const profile = manager.getProfile(all[0].profileId);
    expect(profile).toBeDefined();
    expect(profile?.profileId).toBe(all[0].profileId);
  });

  test('returns null for missing profile', () => {
    const profile = manager.getProfile('nonexistent');
    expect(profile).toBeNull();
  });

  test('creates custom profile', () => {
    const profile = manager.createProfile(
      'Test Personality',
      'A test personality',
      'analyst',
      {
        voiceId: 'test_voice',
        name: 'Test Voice',
        gender: 'male',
        age: 30,
        pitch: 120,
        pace: 'normal',
        tone: 'professional',
      },
      {
        archetype: 'analyst',
        confidence: 80,
        humor: 50,
        enthusiasm: 60,
        verbosity: 70,
        expertise: 85,
        empathy: 60,
        controversial: 40,
      },
      {
        styleId: 'test_style',
        name: 'Test Style',
        description: 'Test description',
        keyPhrases: ['test phrase'],
        vocabulary: 'formal',
        metaphors: 'technical',
        reactionSpeed: 'normal',
        detailLevel: 'balanced',
      },
      {
        prefersQuietMoments: true,
        explainsReasoning: true,
        makesComparisons: false,
        usesNamesFrequently: false,
        celebratesMoments: false,
        admitsUncertainty: true,
        interactsWithCamera: false,
      }
    );

    expect(profile).toBeDefined();
    expect(profile.name).toBe('Test Personality');
    expect(manager.getAllProfiles().length).toBe(6);
  });

  test('filters profiles by archetype', () => {
    const analysts = manager.getProfilesByArchetype('analyst');
    expect(analysts.length).toBeGreaterThan(0);
    expect(analysts.every((p) => p.archetype === 'analyst')).toBe(true);
  });

  test('filters profiles by audience', () => {
    const profiles = manager.getProfilesForAudience('competitive');
    expect(Array.isArray(profiles)).toBe(true);
  });

  test('updates profile', () => {
    const original = manager.getAllProfiles()[0];
    const updated = manager.updateProfile(original.profileId, {
      description: 'Updated description',
    });

    expect(updated).toBe(true);

    const retrieved = manager.getProfile(original.profileId);
    expect(retrieved?.description).toBe('Updated description');
  });

  test('returns false for updating missing profile', () => {
    const updated = manager.updateProfile('nonexistent', { description: 'Test' });
    expect(updated).toBe(false);
  });

  test('deletes profile', () => {
    const profile = manager.createProfile(
      'Deletable',
      'Test',
      'analyst',
      {
        voiceId: 'v1',
        name: 'Test',
        gender: 'male',
        age: 30,
        pitch: 120,
        pace: 'normal',
        tone: 'professional',
      },
      {
        archetype: 'analyst',
        confidence: 50,
        humor: 50,
        enthusiasm: 50,
        verbosity: 50,
        expertise: 50,
        empathy: 50,
        controversial: 50,
      },
      {
        styleId: 'st',
        name: 'Test',
        description: 'Test',
        keyPhrases: [],
        vocabulary: 'formal',
        metaphors: 'technical',
        reactionSpeed: 'normal',
        detailLevel: 'balanced',
      },
      {
        prefersQuietMoments: false,
        explainsReasoning: false,
        makesComparisons: false,
        usesNamesFrequently: false,
        celebratesMoments: false,
        admitsUncertainty: false,
        interactsWithCamera: false,
      }
    );

    expect(manager.getAllProfiles().length).toBeGreaterThan(5);

    const deleted = manager.deleteProfile(profile.profileId);
    expect(deleted).toBe(true);
  });

  test('clones profile', () => {
    const original = manager.getAllProfiles()[0];
    const cloned = manager.cloneProfile(original.profileId, 'Cloned Name');

    expect(cloned).toBeDefined();
    expect(cloned?.profileId).not.toBe(original.profileId);
    expect(cloned?.name).toBe('Cloned Name');
    expect(cloned?.archetype).toBe(original.archetype);
  });

  test('returns null for cloning missing profile', () => {
    const cloned = manager.cloneProfile('nonexistent', 'New Name');
    expect(cloned).toBeNull();
  });

  test('gets similar profiles', () => {
    const profile = manager.getProfileByName('The Analyst')!;
    const similar = manager.getSimilarProfiles(profile.profileId, 2);

    expect(Array.isArray(similar)).toBe(true);
    expect(similar.length).toBeLessThanOrEqual(2);
  });

  test('similar profiles exclude the original', () => {
    const profile = manager.getProfileByName('The Analyst')!;
    const similar = manager.getSimilarProfiles(profile.profileId);

    expect(similar.every((p) => p.profileId !== profile.profileId)).toBe(true);
  });

  test('gets profile statistics', () => {
    const profile = manager.getProfileByName('The Analyst')!;
    const stats = manager.getProfileStats(profile.profileId);

    expect(stats).toBeDefined();
    expect(stats?.traitAverage).toBeGreaterThan(0);
    expect(stats?.dominantTrait).toBeDefined();
    expect(stats?.personalityMix).toBeDefined();
  });

  test('returns null for missing profile statistics', () => {
    const stats = manager.getProfileStats('nonexistent');
    expect(stats).toBeNull();
  });

  test('analyst traits are accurate', () => {
    const analyst = manager.getProfileByName('The Analyst')!;
    expect(analyst.traits.expertise).toBe(95);
    expect(analyst.traits.confidence).toBe(90);
    expect(analyst.traits.humor).toBe(20);
  });

  test('hype beast traits are accurate', () => {
    const hype = manager.getProfileByName('The Hype Beast')!;
    expect(hype.traits.enthusiasm).toBe(100);
    expect(hype.traits.humor).toBe(60);
    expect(hype.traits.expertise).toBe(60);
  });

  test('storyteller behavior is accurate', () => {
    const storyteller = manager.getProfileByName('The Storyteller')!;
    expect(storyteller.behavior.celebratesMoments).toBe(true);
    expect(storyteller.behavior.explainsReasoning).toBe(true);
    expect(storyteller.behavior.usesNamesFrequently).toBe(true);
  });

  test('educator voice characteristics', () => {
    const educator = manager.getProfileByName('The Educator')!;
    expect(educator.voice.pace).toBe('normal');
    expect(educator.voice.tone).toBe('professional');
  });

  test('comedian has high humor trait', () => {
    const comedian = manager.getProfileByName('The Comedian')!;
    expect(comedian.traits.humor).toBe(95);
  });

  test('profiles have unique voice IDs', () => {
    const profiles = manager.getAllProfiles();
    const voiceIds = profiles.map((p) => p.voice.voiceId);
    expect(new Set(voiceIds).size).toBe(voiceIds.length);
  });

  test('reset manager clears custom profiles', () => {
    manager.createProfile(
      'Custom',
      'Test',
      'analyst',
      {
        voiceId: 'v',
        name: 'Voice',
        gender: 'male',
        age: 30,
        pitch: 120,
        pace: 'normal',
        tone: 'professional',
      },
      {
        archetype: 'analyst',
        confidence: 50,
        humor: 50,
        enthusiasm: 50,
        verbosity: 50,
        expertise: 50,
        empathy: 50,
        controversial: 50,
      },
      {
        styleId: 's',
        name: 'Style',
        description: 'Desc',
        keyPhrases: [],
        vocabulary: 'formal',
        metaphors: 'technical',
        reactionSpeed: 'normal',
        detailLevel: 'balanced',
      },
      {
        prefersQuietMoments: false,
        explainsReasoning: false,
        makesComparisons: false,
        usesNamesFrequently: false,
        celebratesMoments: false,
        admitsUncertainty: false,
        interactsWithCamera: false,
      }
    );

    expect(manager.getAllProfiles().length).toBe(6);

    manager.reset();
    expect(manager.getAllProfiles().length).toBe(5);
  });

  test('profile descriptions are unique', () => {
    const profiles = manager.getAllProfiles();
    const descriptions = profiles.map((p) => p.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  test('all default profiles have valid traits', () => {
    const profiles = manager.getAllProfiles();
    for (const profile of profiles) {
      expect(profile.traits.confidence).toBeGreaterThan(0);
      expect(profile.traits.confidence).toBeLessThanOrEqual(100);
      expect(profile.traits.humor).toBeGreaterThanOrEqual(0);
      expect(profile.traits.humor).toBeLessThanOrEqual(100);
      expect(profile.traits.enthusiasm).toBeGreaterThanOrEqual(0);
      expect(profile.traits.enthusiasm).toBeLessThanOrEqual(100);
    }
  });

  test('profile metadata is optional', () => {
    const profile = manager.createProfile(
      'Minimal Profile',
      'Test',
      'analyst',
      {
        voiceId: 'v',
        name: 'Voice',
        gender: 'male',
        age: 30,
        pitch: 120,
        pace: 'normal',
        tone: 'professional',
      },
      {
        archetype: 'analyst',
        confidence: 50,
        humor: 50,
        enthusiasm: 50,
        verbosity: 50,
        expertise: 50,
        empathy: 50,
        controversial: 50,
      },
      {
        styleId: 's',
        name: 'Style',
        description: 'Desc',
        keyPhrases: [],
        vocabulary: 'formal',
        metaphors: 'technical',
        reactionSpeed: 'normal',
        detailLevel: 'balanced',
      },
      {
        prefersQuietMoments: false,
        explainsReasoning: false,
        makesComparisons: false,
        usesNamesFrequently: false,
        celebratesMoments: false,
        admitsUncertainty: false,
        interactsWithCamera: false,
      }
    );

    expect(profile.metadata).toBeDefined();
  });
});
