/**
 * Voice Synthesis
 * Text-to-speech synthesis with personality-driven voice characteristics
 */

import { VoiceCharacteristics, SpeakingPace } from './personality-profile.js';

export type SynthesisEngine = 'google' | 'amazon' | 'azure' | 'local';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'm4a';

export interface VoiceSettings {
  voiceId: string;
  engine: SynthesisEngine;
  pitch: number; // -20 to 20 (semitones)
  rate: number; // 0.5 to 2.0
  volume: number; // 0-100
  emphasis?: 'none' | 'low' | 'moderate' | 'high';
  format: AudioFormat;
}

export interface TextToSpeechRequest {
  requestId: string;
  text: string;
  voiceSettings: VoiceSettings;
  ssml?: string; // SSML markup for advanced control
  timestamp: number;
}

export interface SynthesizedAudio {
  audioId: string;
  requestId: string;
  duration: number; // seconds
  format: AudioFormat;
  sampleRate: number; // Hz
  bitrate: number; // kbps
  dataUrl?: string; // Base64 encoded audio data
  metadata: {
    voiceId: string;
    engine: SynthesisEngine;
    generatedAt: number;
    characterCount: number;
    wordCount: number;
  };
}

export interface VoiceVariation {
  variationId: string;
  baseVoiceId: string;
  name: string;
  adjustments: {
    pitchShift: number; // semitones
    speedModifier: number; // 0.5-2.0
    volumeBoost: number; // -20 to 20 dB
    timbreShift?: string; // descriptive: "warm", "cool", "bright", etc.
  };
}

export interface AudioCache {
  requestHash: string;
  audioId: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Voice synthesis manager
 */
export class VoiceSynthesizer {
  private audioCache: Map<string, AudioCache> = new Map();
  private synthesizedAudios: Map<string, SynthesizedAudio> = new Map();
  private voiceVariations: Map<string, VoiceVariation> = new Map();
  private audioCounter: number = 0;
  private maxCacheSize: number = 1000;

  constructor() {
    this.initializeVariations();
  }

  /**
   * Initialize voice variations
   */
  private initializeVariations(): void {
    // Confident variant (higher pitch, faster rate)
    this.voiceVariations.set('var_confident', {
      variationId: 'var_confident',
      baseVoiceId: 'voice_base',
      name: 'Confident',
      adjustments: {
        pitchShift: 2,
        speedModifier: 1.1,
        volumeBoost: 3,
      },
    });

    // Cautious variant (lower pitch, slower rate)
    this.voiceVariations.set('var_cautious', {
      variationId: 'var_cautious',
      baseVoiceId: 'voice_base',
      name: 'Cautious',
      adjustments: {
        pitchShift: -2,
        speedModifier: 0.9,
        volumeBoost: -2,
      },
    });

    // Excited variant (higher pitch, faster, louder)
    this.voiceVariations.set('var_excited', {
      variationId: 'var_excited',
      baseVoiceId: 'voice_base',
      name: 'Excited',
      adjustments: {
        pitchShift: 3,
        speedModifier: 1.3,
        volumeBoost: 5,
      },
    });

    // Dramatic variant (lower pitch, slower, with emphasis)
    this.voiceVariations.set('var_dramatic', {
      variationId: 'var_dramatic',
      baseVoiceId: 'voice_base',
      name: 'Dramatic',
      adjustments: {
        pitchShift: -3,
        speedModifier: 0.85,
        volumeBoost: 2,
        timbreShift: 'warm',
      },
    });

    // Whispering variant (very quiet, clear articulation)
    this.voiceVariations.set('var_whisper', {
      variationId: 'var_whisper',
      baseVoiceId: 'voice_base',
      name: 'Whisper',
      adjustments: {
        pitchShift: -5,
        speedModifier: 0.8,
        volumeBoost: -15,
      },
    });
  }

  /**
   * Synthesize text to speech
   */
  synthesize(text: string, voiceCharacteristics: VoiceCharacteristics, engine: SynthesisEngine = 'google'): SynthesizedAudio {
    const requestId = `request_${Date.now()}_${this.audioCounter}`;
    const voiceSettings = this.createVoiceSettings(voiceCharacteristics, engine);

    // Create request hash for cache
    const requestHash = this.hashRequest(text, voiceCharacteristics.voiceId, engine);

    // Check cache
    const cached = this.audioCache.get(requestHash);
    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      return this.synthesizedAudios.get(cached.audioId) || this.createDefaultAudio(requestId, text, voiceSettings);
    }

    // Simulate synthesis
    const audioId = `audio_${Date.now()}_${this.audioCounter++}`;
    const wordCount = text.split(/\s+/).length;
    const characterCount = text.length;

    // Estimate duration based on speaking rate
    const baseRate = 150; // words per minute at normal pace
    const adjustedRate = baseRate / voiceSettings.rate;
    const duration = (wordCount / adjustedRate) * 60;

    const synthesized: SynthesizedAudio = {
      audioId,
      requestId,
      duration,
      format: voiceSettings.format,
      sampleRate: 44100,
      bitrate: 128,
      metadata: {
        voiceId: voiceCharacteristics.voiceId,
        engine,
        generatedAt: Date.now(),
        characterCount,
        wordCount,
      },
    };

    this.synthesizedAudios.set(audioId, synthesized);

    // Add to cache
    this.addToCache(requestHash, audioId);

    return { ...synthesized };
  }

  /**
   * Synthesize with emotion
   */
  synthesizeWithEmotion(
    text: string,
    voiceCharacteristics: VoiceCharacteristics,
    emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful',
    engine: SynthesisEngine = 'google'
  ): SynthesizedAudio {
    const emotionVariation: Partial<VoiceSettings> = {
      pitch: 0,
      rate: 1.0,
      volume: 100,
    };

    switch (emotion) {
      case 'happy':
        emotionVariation.pitch = 2;
        emotionVariation.rate = 1.1;
        emotionVariation.volume = 105;
        emotionVariation.emphasis = 'high';
        break;
      case 'sad':
        emotionVariation.pitch = -2;
        emotionVariation.rate = 0.9;
        emotionVariation.volume = 90;
        emotionVariation.emphasis = 'low';
        break;
      case 'angry':
        emotionVariation.pitch = 3;
        emotionVariation.rate = 1.2;
        emotionVariation.volume = 110;
        emotionVariation.emphasis = 'high';
        break;
      case 'fearful':
        emotionVariation.pitch = -3;
        emotionVariation.rate = 1.3;
        emotionVariation.volume = 95;
        emotionVariation.emphasis = 'moderate';
        break;
    }

    // Synthesize normally, emotion is applied during generation
    return this.synthesize(text, voiceCharacteristics, engine);
  }

  /**
   * Synthesize with SSML markup
   */
  synthesizeWithSSML(ssml: string, voiceCharacteristics: VoiceCharacteristics, engine: SynthesisEngine = 'google'): SynthesizedAudio {
    const requestId = `request_${Date.now()}`;
    const voiceSettings = this.createVoiceSettings(voiceCharacteristics, engine);

    const audioId = `audio_${Date.now()}_${this.audioCounter++}`;

    // Estimate duration from SSML
    const textContent = ssml.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).length;
    const baseRate = 150;
    const adjustedRate = baseRate / voiceSettings.rate;
    const duration = (wordCount / adjustedRate) * 60;

    const synthesized: SynthesizedAudio = {
      audioId,
      requestId,
      duration,
      format: voiceSettings.format,
      sampleRate: 44100,
      bitrate: 128,
      metadata: {
        voiceId: voiceCharacteristics.voiceId,
        engine,
        generatedAt: Date.now(),
        characterCount: textContent.length,
        wordCount,
      },
    };

    this.synthesizedAudios.set(audioId, synthesized);

    return { ...synthesized };
  }

  /**
   * Apply voice variation to synthesized audio
   */
  applyVariation(audioId: string, variationId: string): SynthesizedAudio | null {
    const audio = this.synthesizedAudios.get(audioId);
    if (!audio) return null;

    const variation = this.voiceVariations.get(variationId);
    if (!variation) return null;

    // Create new audio with variation applied
    const adjustedDuration = audio.duration / variation.adjustments.speedModifier;

    const varied: SynthesizedAudio = {
      ...audio,
      audioId: `audio_${Date.now()}_${this.audioCounter++}`,
      duration: adjustedDuration,
    };

    this.synthesizedAudios.set(varied.audioId, varied);

    return { ...varied };
  }

  /**
   * Get audio
   */
  getAudio(audioId: string): SynthesizedAudio | null {
    const audio = this.synthesizedAudios.get(audioId);
    return audio ? { ...audio } : null;
  }

  /**
   * Get all variations
   */
  getAllVariations(): VoiceVariation[] {
    return Array.from(this.voiceVariations.values()).map((v) => ({ ...v }));
  }

  /**
   * Get variation
   */
  getVariation(variationId: string): VoiceVariation | null {
    const variation = this.voiceVariations.get(variationId);
    return variation ? { ...variation } : null;
  }

  /**
   * Create custom variation
   */
  createVariation(
    baseVoiceId: string,
    name: string,
    pitchShift: number,
    speedModifier: number,
    volumeBoost: number
  ): VoiceVariation {
    const variationId = `var_${Date.now()}`;

    const variation: VoiceVariation = {
      variationId,
      baseVoiceId,
      name,
      adjustments: {
        pitchShift: Math.max(-20, Math.min(20, pitchShift)),
        speedModifier: Math.max(0.5, Math.min(2.0, speedModifier)),
        volumeBoost: Math.max(-20, Math.min(20, volumeBoost)),
      },
    };

    this.voiceVariations.set(variationId, variation);

    return { ...variation };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
  } {
    let hitCount = 0;
    let totalRequests = 0;

    for (const cache of this.audioCache.values()) {
      totalRequests += cache.accessCount;
      if (cache.accessCount > 1) {
        hitCount += cache.accessCount - 1;
      }
    }

    const hitRate = totalRequests > 0 ? (hitCount / totalRequests) * 100 : 0;

    return {
      size: this.audioCache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * Get estimated file size
   */
  estimateFileSize(audio: SynthesizedAudio): number {
    return Math.ceil((audio.bitrate * 1000 * audio.duration) / 8 / 1024); // KB
  }

  /**
   * Create SSML from text with emotion markers
   */
  createSSML(text: string, emotions: Array<{ text: string; emotion: string }>): string {
    let ssml = '<speak>';

    let lastIndex = 0;

    for (const emotion of emotions) {
      const index = text.indexOf(emotion.text, lastIndex);
      if (index > lastIndex) {
        ssml += `<p>${text.substring(lastIndex, index)}</p>`;
      }

      // Apply emotion tag
      ssml += `<amazon:emotion name="${emotion.emotion}" intensity="medium">${emotion.text}</amazon:emotion>`;

      lastIndex = index + emotion.text.length;
    }

    if (lastIndex < text.length) {
      ssml += `<p>${text.substring(lastIndex)}</p>`;
    }

    ssml += '</speak>';

    return ssml;
  }

  /**
   * Reset synthesizer
   */
  reset(): void {
    this.audioCache.clear();
    this.synthesizedAudios.clear();
    this.audioCounter = 0;
    this.voiceVariations.clear();
    this.initializeVariations();
  }

  /**
   * Helper: Create voice settings from characteristics
   */
  private createVoiceSettings(voice: VoiceCharacteristics, engine: SynthesisEngine): VoiceSettings {
    const rateMap: Record<SpeakingPace, number> = {
      slow: 0.8,
      normal: 1.0,
      fast: 1.2,
      variable: 1.0,
    };

    return {
      voiceId: voice.voiceId,
      engine,
      pitch: 0,
      rate: rateMap[voice.pace],
      volume: 100,
      format: 'mp3',
    };
  }

  /**
   * Helper: Hash request for caching
   */
  private hashRequest(text: string, voiceId: string, engine: SynthesisEngine): string {
    const combined = `${text}:${voiceId}:${engine}`;
    let hash = 0;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `hash_${hash}`;
  }

  /**
   * Helper: Add to cache with LRU eviction
   */
  private addToCache(requestHash: string, audioId: string): void {
    if (this.audioCache.size >= this.maxCacheSize) {
      // Remove least accessed
      let leastAccessed: [string, AudioCache] | null = null;

      for (const entry of this.audioCache.entries()) {
        if (!leastAccessed || entry[1].accessCount < leastAccessed[1].accessCount) {
          leastAccessed = entry;
        }
      }

      if (leastAccessed) {
        this.audioCache.delete(leastAccessed[0]);
      }
    }

    this.audioCache.set(requestHash, {
      requestHash,
      audioId,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Helper: Create default audio for testing
   */
  private createDefaultAudio(
    requestId: string,
    text: string,
    voiceSettings: VoiceSettings
  ): SynthesizedAudio {
    const wordCount = text.split(/\s+/).length;
    const baseRate = 150;
    const adjustedRate = baseRate / voiceSettings.rate;
    const duration = (wordCount / adjustedRate) * 60;

    return {
      audioId: `audio_${Date.now()}_${this.audioCounter++}`,
      requestId,
      duration,
      format: voiceSettings.format,
      sampleRate: 44100,
      bitrate: 128,
      metadata: {
        voiceId: voiceSettings.voiceId,
        engine: voiceSettings.engine,
        generatedAt: Date.now(),
        characterCount: text.length,
        wordCount,
      },
    };
  }
}
