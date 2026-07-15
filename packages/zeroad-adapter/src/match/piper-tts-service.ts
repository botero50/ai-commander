/**
 * Piper TTS Service
 *
 * Converts trash talk text to speech using Piper TTS (offline, local)
 * - 180x faster than real-time (10-second clip in ~55ms)
 * - 100+ voices in 30+ languages
 * - No GPU needed, runs on CPU
 */

import { spawn, ChildProcess } from 'child_process';
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
  private voiceDataDir: string;
  private isInitialized: boolean = false;
  private synthesisQueue: Array<{
    text: string;
    voice?: string;
    resolve: (path: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing: boolean = false;

  constructor(logger: Logger, config: PiperConfig = {}) {
    this.logger = logger;
    this.outputDir = config.outputDir || '.data/audio/trash_talk';
    this.voice = config.voice || 'en_US-lessac-medium';
    this.rate = config.rate || 1.0;
    // Voice models stored in project: packages/zeroad-adapter/voices/
    this.voiceDataDir = path.join(process.cwd(), 'packages', 'zeroad-adapter', 'voices');
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
   * Queue text for synthesis (non-blocking)
   * Returns path to generated WAV file once synthesized
   * On error, returns empty string (graceful fallback)
   */
  async synthesize(text: string, voice?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.synthesisQueue.push({
        text,
        voice,
        resolve: (path: string) => resolve(path),
        reject: (error: Error) => {
          // Log error but don't fail - synthesis is optional
          this.logger.warn('Skipping TTS synthesis due to error', {
            error: error.message,
            textPreview: text.substring(0, 50),
          });
          resolve(''); // Return empty string on error
        },
      });
      this.processQueue();
    });
  }

  /**
   * Process synthesis queue one at a time
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.synthesisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.synthesisQueue.shift();

    if (!item) {
      this.isProcessing = false;
      return;
    }

    try {
      const result = await this.performSynthesis(item.text, item.voice);
      item.resolve(result);
    } catch (error) {
      item.reject(error as Error);
    } finally {
      this.isProcessing = false;
      // Process next item in queue
      if (this.synthesisQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Actually perform the synthesis via piper command
   */
  private performSynthesis(text: string, voice?: string): Promise<string> {
    const selectedVoice = voice || this.voice;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const filename = `trash_talk_${timestamp}_${random}.wav`;
    const outputPath = path.join(this.outputDir, filename);

    this.logger.debug('Piper voice data directory', {
      voiceDataDir: this.voiceDataDir,
    });

    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('Synthesizing trash talk', {
          textLength: text.length,
          voice: selectedVoice,
          outputFile: filename,
          queueLength: this.synthesisQueue.length,
        });

        // Spawn Piper TTS process with proper arguments
        const piperProcess = spawn('piper', [
          '--model', selectedVoice,
          '--data-dir', this.voiceDataDir,
          '--output-file', outputPath,
        ], {
          stdio: ['pipe', 'inherit', 'inherit'],
        });

        // Send text to stdin
        if (piperProcess.stdin) {
          piperProcess.stdin.write(text);
          piperProcess.stdin.end();
        }

        let stderr = '';

        const timeout = setTimeout(() => {
          piperProcess.kill();
          reject(new Error(`Piper TTS timeout after 30 seconds for: ${text.substring(0, 50)}`));
        }, 30000);

        piperProcess.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0) {
            this.logger.info(`✓ Synthesized trash talk: ${filename}`, {
              textLength: text.length,
            });
            resolve(outputPath);
          } else {
            const error = `Piper TTS failed (code ${code}): ${stderr}`;
            this.logger.warn('Piper TTS synthesis failed', { error, textPreview: text.substring(0, 50) });
            reject(new Error(error));
          }
        });

        piperProcess.on('error', (err) => {
          clearTimeout(timeout);
          this.logger.warn('Failed to spawn Piper TTS', {
            error: err.message,
            voice: selectedVoice,
          });
          reject(err);
        });
      } catch (error) {
        this.logger.error('Error in performSynthesis', { error });
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
   * Cleanup old audio files - keep only the last N files
   */
  async cleanup(maxFiles: number = 2): Promise<void> {
    try {
      if (!this.isInitialized) return;

      const files = await fs.readdir(this.outputDir);
      if (files.length <= maxFiles) return;

      // Get file stats with modification times
      const filesWithStats = await Promise.all(
        files.map(async (file) => ({
          file,
          path: path.join(this.outputDir, file),
          mtime: (await fs.stat(path.join(this.outputDir, file))).mtimeMs,
        }))
      );

      // Sort by modification time (newest first)
      filesWithStats.sort((a, b) => b.mtime - a.mtime);

      // Remove files beyond the max
      for (let i = maxFiles; i < filesWithStats.length; i++) {
        await fs.unlink(filesWithStats[i].path);
        this.logger.debug('Cleaned up old audio file', { file: filesWithStats[i].file });
      }
    } catch (error) {
      this.logger.warn('Cleanup failed', { error });
      // Don't throw - cleanup is not critical
    }
  }
}
