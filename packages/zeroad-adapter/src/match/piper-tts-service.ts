/**
 * Piper TTS Service
 *
 * Converts trash talk text to speech using Piper TTS (offline, local)
 * - 180x faster than real-time (10-second clip in ~55ms)
 * - 100+ voices in 30+ languages
 * - No GPU needed, runs on CPU
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../config/logger.js';

export interface PiperConfig {
  outputDir?: string;
  voice?: string; // Model name like 'en_US-hfc_female-medium'
  rate?: number; // Speech rate (default 1.0)
}

export class PiperTTSService {
  private logger: Logger;
  private outputDir: string;
  private voice: string;
  private rate: number;
  private isInitialized: boolean = false;

  constructor(logger: Logger, config: PiperConfig = {}) {
    this.logger = logger;
    this.outputDir = config.outputDir || '.data/audio/trash_talk';
    this.voice = config.voice || 'en_US-hfc_female-medium';
    this.rate = config.rate || 1.0;
  }

  /**
   * Initialize the service - create output directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.isInitialized = true;
      this.logger.info('✓ PiperTTS service initialized', {
        outputDir: this.outputDir,
        voice: this.voice,
      });
    } catch (error) {
      this.logger.error('Failed to initialize PiperTTS', { error });
      throw error;
    }
  }

  /**
   * Convert text to speech using Piper TTS
   * Returns path to generated WAV file
   */
  async synthesize(text: string, voice?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const selectedVoice = voice || this.voice;
    const timestamp = Date.now();
    const filename = `trash_talk_${timestamp}.wav`;
    const outputPath = path.join(this.outputDir, filename);

    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('Synthesizing trash talk', {
          textLength: text.length,
          voice: selectedVoice,
          outputFile: filename,
        });

        // Spawn Piper TTS process
        const piperProcess = spawn('piper', [
          '--model', selectedVoice,
          '--output-file', outputPath,
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Send text to stdin
        piperProcess.stdin?.write(text);
        piperProcess.stdin?.end();

        let stderr = '';

        piperProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        piperProcess.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`✓ Synthesized trash talk: ${filename}`, {
              textLength: text.length,
              outputFile: filename,
            });
            resolve(outputPath);
          } else {
            const error = `Piper TTS failed (code ${code}): ${stderr}`;
            this.logger.error('Piper TTS synthesis failed', { error, text });
            reject(new Error(error));
          }
        });

        piperProcess.on('error', (err) => {
          this.logger.error('Failed to spawn Piper TTS', {
            error: err.message,
            voice: selectedVoice,
          });
          reject(err);
        });
      } catch (error) {
        this.logger.error('Error in synthesize', { error });
        reject(error);
      }
    });
  }

  /**
   * Get relative path for HTTP serving
   */
  getHttpPath(filePath: string): string {
    const filename = path.basename(filePath);
    return `/api/broadcast/audio/${filename}`;
  }

  /**
   * Set default voice
   */
  setVoice(voice: string): void {
    this.voice = voice;
    this.logger.info('✓ Piper voice changed', { voice });
  }

  /**
   * Cleanup old audio files (older than 1 hour)
   */
  async cleanup(maxAgeMs: number = 3600000): Promise<void> {
    try {
      if (!this.isInitialized) return;

      const files = await fs.readdir(this.outputDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stat = await fs.stat(filePath);
        const age = now - stat.mtimeMs;

        if (age > maxAgeMs) {
          await fs.unlink(filePath);
          this.logger.debug('Cleaned up old audio file', { file, ageHours: Math.round(age / 3600000) });
        }
      }
    } catch (error) {
      this.logger.warn('Cleanup failed', { error });
      // Don't throw - cleanup is not critical
    }
  }
}
