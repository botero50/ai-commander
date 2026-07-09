/**
 * Personality Profile
 * AI commentator personality definitions and traits
 */

export type PersonalityArchetype = 'analyst' | 'hype' | 'storyteller' | 'educator' | 'comedian';
export type VoiceGender = 'male' | 'female' | 'neutral';
export type SpeakingPace = 'slow' | 'normal' | 'fast' | 'variable';
export type EmotionalStyle = 'neutral' | 'enthusiastic' | 'cautious' | 'passionate' | 'humorous';

export interface VoiceCharacteristics {
  voiceId: string;
  name: string;
  gender: VoiceGender;
  age: number; // estimated
  pitch: number; // Hz, 80-300 range
  pace: SpeakingPace;
  accent?: string; // e.g., "British", "American", "Australian"
  tone: 'professional' | 'casual' | 'formal' | 'energetic';
  sampleUrl?: string; // URL to voice sample
}

export interface PersonalityTraits {
  archetype: PersonalityArchetype;
  confidence: number; // 0-100
  humor: number; // 0-100, how often jokes/puns
  enthusiasm: number; // 0-100, energy level
  verbosity: number; // 0-100, amount of talking
  expertise: number; // 0-100, depth of analysis
  empathy: number; // 0-100, player-focused commentary
  controversial: number; // 0-100, willingness to make bold claims
}

export interface CommentaryStyle {
  styleId: string;
  name: string;
  description: string;
  keyPhrases: string[]; // Signature phrases
  vocabulary: 'formal' | 'casual' | 'mixed';
  metaphors: 'technical' | 'sports' | 'gaming' | 'mixed';
  reactionSpeed: 'slow' | 'normal' | 'fast'; // How quickly responds to events
  detailLevel: 'summary' | 'balanced' | 'detailed'; // Amount of explanation
}

export interface PersonalityBehavior {
  prefersQuietMoments: boolean; // Let action speak for itself
  explainsReasoning: boolean; // Explain why decisions matter
  makesComparisons: boolean; // Compare to past events
  usesNamesFrequently: boolean; // Personalize to players
  celebratesMoments: boolean; // React emotionally
  admitsUncertainty: boolean; // "I'm not sure but..."
  interactsWithCamera: boolean; // Address audience directly
}

export interface PersonalityProfile {
  profileId: string;
  name: string;
  description: string;
  archetype: PersonalityArchetype;
  voice: VoiceCharacteristics;
  traits: PersonalityTraits;
  style: CommentaryStyle;
  behavior: PersonalityBehavior;
  created: number;
  metadata: {
    suitableGames?: string[]; // Game types this personality works well for
    targetAudience?: 'casual' | 'competitive' | 'educational' | 'mixed';
    compatibleWith?: string[]; // Other personalities it pairs well with
    rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  };
}

/**
 * Personality profile manager
 */
export class PersonalityProfileManager {
  private profiles: Map<string, PersonalityProfile> = new Map();
  private profileCounter: number = 0;

  constructor() {
    this.initializeDefaultProfiles();
  }

  /**
   * Initialize default personalities
   */
  private initializeDefaultProfiles(): void {
    // The Analyst
    this.createProfile(
      'The Analyst',
      'Deep game theory expert with methodical explanations',
      'analyst',
      {
        voiceId: 'voice_analyst_1',
        name: 'Professional Analyst',
        gender: 'male',
        age: 45,
        pitch: 120,
        pace: 'slow',
        accent: 'British',
        tone: 'professional',
      },
      {
        archetype: 'analyst',
        confidence: 90,
        humor: 20,
        enthusiasm: 60,
        verbosity: 75,
        expertise: 95,
        empathy: 50,
        controversial: 30,
      },
      {
        styleId: 'style_analyst',
        name: 'Technical Analysis',
        description: 'Deep dive into strategy and mechanics',
        keyPhrases: ['Notice how', 'Strategically speaking', 'The math shows', 'This is critical'],
        vocabulary: 'formal',
        metaphors: 'technical',
        reactionSpeed: 'slow',
        detailLevel: 'detailed',
      },
      {
        prefersQuietMoments: true,
        explainsReasoning: true,
        makesComparisons: true,
        usesNamesFrequently: false,
        celebratesMoments: false,
        admitsUncertainty: true,
        interactsWithCamera: false,
      }
    );

    // The Hype Beast
    this.createProfile(
      'The Hype Beast',
      'Energetic commentator who amplifies every moment',
      'hype',
      {
        voiceId: 'voice_hype_1',
        name: 'Energetic Hype',
        gender: 'male',
        age: 28,
        pitch: 140,
        pace: 'fast',
        accent: 'American',
        tone: 'energetic',
      },
      {
        archetype: 'hype',
        confidence: 95,
        humor: 60,
        enthusiasm: 100,
        verbosity: 90,
        expertise: 60,
        empathy: 80,
        controversial: 50,
      },
      {
        styleId: 'style_hype',
        name: 'Excitement Commentary',
        description: 'High energy reactions to every play',
        keyPhrases: ['THAT IS INSANE', 'Are you kidding me', 'What a play', 'LETS GO'],
        vocabulary: 'casual',
        metaphors: 'sports',
        reactionSpeed: 'fast',
        detailLevel: 'summary',
      },
      {
        prefersQuietMoments: false,
        explainsReasoning: false,
        makesComparisons: false,
        usesNamesFrequently: true,
        celebratesMoments: true,
        admitsUncertainty: false,
        interactsWithCamera: true,
      }
    );

    // The Storyteller
    this.createProfile(
      'The Storyteller',
      'Narrative-focused commentator weaving game into epic story',
      'storyteller',
      {
        voiceId: 'voice_story_1',
        name: 'Dramatic Storyteller',
        gender: 'female',
        age: 35,
        pitch: 180,
        pace: 'normal',
        accent: 'Neutral',
        tone: 'formal',
      },
      {
        archetype: 'storyteller',
        confidence: 85,
        humor: 40,
        enthusiasm: 75,
        verbosity: 85,
        expertise: 70,
        empathy: 90,
        controversial: 40,
      },
      {
        styleId: 'style_story',
        name: 'Narrative Focus',
        description: 'Turns gameplay into compelling story',
        keyPhrases: ['And so the story continues', 'A tale of', 'The drama unfolds', 'Once again'],
        vocabulary: 'mixed',
        metaphors: 'mixed',
        reactionSpeed: 'normal',
        detailLevel: 'balanced',
      },
      {
        prefersQuietMoments: true,
        explainsReasoning: true,
        makesComparisons: true,
        usesNamesFrequently: true,
        celebratesMoments: true,
        admitsUncertainty: false,
        interactsWithCamera: false,
      }
    );

    // The Educator
    this.createProfile(
      'The Educator',
      'Teaching-focused commentator explaining concepts',
      'educator',
      {
        voiceId: 'voice_edu_1',
        name: 'Professional Educator',
        gender: 'neutral',
        age: 40,
        pitch: 110,
        pace: 'normal',
        accent: 'Neutral',
        tone: 'professional',
      },
      {
        archetype: 'educator',
        confidence: 80,
        humor: 30,
        enthusiasm: 65,
        verbosity: 80,
        expertise: 85,
        empathy: 75,
        controversial: 20,
      },
      {
        styleId: 'style_edu',
        name: 'Educational',
        description: 'Learning-focused with clear explanations',
        keyPhrases: [
          "Let me explain",
          'This teaches us',
          'The key takeaway is',
          'For those learning at home',
        ],
        vocabulary: 'formal',
        metaphors: 'technical',
        reactionSpeed: 'slow',
        detailLevel: 'detailed',
      },
      {
        prefersQuietMoments: true,
        explainsReasoning: true,
        makesComparisons: true,
        usesNamesFrequently: false,
        celebratesMoments: false,
        admitsUncertainty: true,
        interactsWithCamera: true,
      }
    );

    // The Comedian
    this.createProfile(
      'The Comedian',
      'Humor-focused commentator with witty observations',
      'comedian',
      {
        voiceId: 'voice_comedy_1',
        name: 'Witty Comedian',
        gender: 'male',
        age: 32,
        pitch: 130,
        pace: 'variable',
        accent: 'American',
        tone: 'casual',
      },
      {
        archetype: 'comedian',
        confidence: 85,
        humor: 95,
        enthusiasm: 70,
        verbosity: 70,
        expertise: 65,
        empathy: 60,
        controversial: 60,
      },
      {
        styleId: 'style_comedy',
        name: 'Humorous',
        description: 'Entertainment-first with witty remarks',
        keyPhrases: ['Classic', 'Well that happened', 'Ouch', 'Smooth moves'],
        vocabulary: 'casual',
        metaphors: 'gaming',
        reactionSpeed: 'fast',
        detailLevel: 'summary',
      },
      {
        prefersQuietMoments: false,
        explainsReasoning: false,
        makesComparisons: true,
        usesNamesFrequently: true,
        celebratesMoments: true,
        admitsUncertainty: false,
        interactsWithCamera: true,
      }
    );
  }

  /**
   * Create custom profile
   */
  createProfile(
    name: string,
    description: string,
    archetype: PersonalityArchetype,
    voice: VoiceCharacteristics,
    traits: PersonalityTraits,
    style: CommentaryStyle,
    behavior: PersonalityBehavior,
    metadata?: any
  ): PersonalityProfile {
    const profileId = `personality_${Date.now()}_${this.profileCounter++}`;

    const profile: PersonalityProfile = {
      profileId,
      name,
      description,
      archetype,
      voice,
      traits,
      style,
      behavior,
      created: Date.now(),
      metadata: metadata || {},
    };

    this.profiles.set(profileId, profile);

    return { ...profile };
  }

  /**
   * Get profile
   */
  getProfile(profileId: string): PersonalityProfile | null {
    const profile = this.profiles.get(profileId);
    return profile ? { ...profile } : null;
  }

  /**
   * Get profile by name
   */
  getProfileByName(name: string): PersonalityProfile | null {
    const profile = Array.from(this.profiles.values()).find((p) => p.name === name);
    return profile ? { ...profile } : null;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): PersonalityProfile[] {
    return Array.from(this.profiles.values()).map((p) => ({ ...p }));
  }

  /**
   * Get profiles by archetype
   */
  getProfilesByArchetype(archetype: PersonalityArchetype): PersonalityProfile[] {
    return Array.from(this.profiles.values())
      .filter((p) => p.archetype === archetype)
      .map((p) => ({ ...p }));
  }

  /**
   * Get profiles for audience
   */
  getProfilesForAudience(audience: string): PersonalityProfile[] {
    return Array.from(this.profiles.values())
      .filter((p) => !p.metadata.targetAudience || p.metadata.targetAudience === audience || p.metadata.targetAudience === 'mixed')
      .map((p) => ({ ...p }));
  }

  /**
   * Update profile
   */
  updateProfile(profileId: string, updates: Partial<PersonalityProfile>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    const updated = { ...profile, ...updates, profileId, created: profile.created };
    this.profiles.set(profileId, updated);

    return true;
  }

  /**
   * Delete profile
   */
  deleteProfile(profileId: string): boolean {
    return this.profiles.delete(profileId);
  }

  /**
   * Clone profile with new name
   */
  cloneProfile(profileId: string, newName: string): PersonalityProfile | null {
    const original = this.profiles.get(profileId);
    if (!original) return null;

    const newId = `personality_${Date.now()}_${this.profileCounter++}`;

    const cloned: PersonalityProfile = {
      ...original,
      profileId: newId,
      name: newName,
      created: Date.now(),
    };

    this.profiles.set(newId, cloned);

    return { ...cloned };
  }

  /**
   * Get similar profiles
   */
  getSimilarProfiles(profileId: string, count: number = 3): PersonalityProfile[] {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];

    const similarity = (other: PersonalityProfile): number => {
      if (other.profileId === profileId) return -Infinity;

      let score = 0;

      // Same archetype bonus
      if (other.archetype === profile.archetype) score += 10;

      // Similar trait values
      const traitDiff =
        Math.abs(other.traits.confidence - profile.traits.confidence) +
        Math.abs(other.traits.enthusiasm - profile.traits.enthusiasm) +
        Math.abs(other.traits.expertise - profile.traits.expertise);

      score -= traitDiff;

      return score;
    };

    return Array.from(this.profiles.values())
      .sort((a, b) => similarity(b) - similarity(a))
      .slice(0, count)
      .map((p) => ({ ...p }));
  }

  /**
   * Get statistics for profile
   */
  getProfileStats(profileId: string): {
    traitAverage: number;
    dominantTrait: string;
    personalityMix: string;
  } | null {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const traits = profile.traits;
    const values = [
      traits.confidence,
      traits.humor,
      traits.enthusiasm,
      traits.verbosity,
      traits.expertise,
      traits.empathy,
      traits.controversial,
    ];

    const traitNames = [
      'confidence',
      'humor',
      'enthusiasm',
      'verbosity',
      'expertise',
      'empathy',
      'controversial',
    ];

    const average = values.reduce((a, b) => a + b) / values.length;
    const maxIndex = values.indexOf(Math.max(...values));
    const dominantTrait = traitNames[maxIndex];

    let personalityMix = `${profile.archetype}`;
    if (traits.humor > 70) personalityMix += '+humorous';
    if (traits.enthusiasm > 80) personalityMix += '+energetic';
    if (traits.expertise > 80) personalityMix += '+expert';

    return {
      traitAverage: Math.round(average),
      dominantTrait,
      personalityMix,
    };
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.profiles.clear();
    this.profileCounter = 0;
    this.initializeDefaultProfiles();
  }
}
