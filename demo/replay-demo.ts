/**
 * AI Commander Replay Viewer
 *
 * Loads and displays a saved match replay with timeline visualization
 *
 * Usage:
 *   npx ts-node demo/replay-demo.ts <replay-file.json>
 */

import * as fs from 'fs';
import * as path from 'path';

interface ReplayFrame {
  tickNumber: number;
  timestamp: number;
  player1State: any;
  player2State: any;
  player1Decision: any;
  player2Decision: any;
}

interface ReplayData {
  config: {
    player1Model: string;
    player2Model: string;
    mapSeed: number;
    maxTicks: number;
  };
  metrics: {
    matchId: string;
    winner: 'player1' | 'player2' | 'draw';
    totalTicks: number;
    duration: number;
    player1Score: number;
    player2Score: number;
  };
  frames: ReplayFrame[];
}

class ReplayViewer {
  private replay: ReplayData;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.replay = this.loadReplay();
  }

  private loadReplay(): ReplayData {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`Replay file not found: ${this.filePath}`);
    }

    const content = fs.readFileSync(this.filePath, 'utf-8');
    try {
      return JSON.parse(content) as ReplayData;
    } catch (error) {
      throw new Error(`Invalid replay file format: ${this.filePath}`);
    }
  }

  private log(message: string, emoji: string = '→'): void {
    console.log(`${emoji} ${message}`);
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  private createTimeline(): void {
    const totalTicks = this.replay.metrics.totalTicks;
    const width = 60;
    const ticksPerChar = Math.ceil(totalTicks / width);

    let timeline = '📊 MATCH TIMELINE: [';

    for (let i = 0; i < width; i++) {
      const tickStart = i * ticksPerChar;
      const tickEnd = Math.min((i + 1) * ticksPerChar, totalTicks);

      // Find any significant events in this period
      let char = '─';

      // Check for activity
      const hasActivity = this.replay.frames.some(
        f => f.tickNumber >= tickStart && f.tickNumber < tickEnd
      );

      if (hasActivity) {
        char = '█';
      }

      timeline += char;
    }

    timeline += '] 100%';
    console.log(timeline);
  }

  display(): void {
    console.log('\n' + '='.repeat(70));
    console.log('  🎬 AI COMMANDER REPLAY VIEWER');
    console.log('='.repeat(70) + '\n');

    const { config, metrics, frames } = this.replay;

    // Header
    this.log(
      `Match ID: ${metrics.matchId}`,
      '🎮'
    );

    this.log(`Player 1: ${config.player1Model}`, '🤖');
    this.log(`Player 2: ${config.player2Model}`, '🤖');

    // Winner
    console.log();
    if (metrics.winner === 'player1') {
      this.log(`🏆 WINNER: Player 1 (${config.player1Model})`, '🎉');
    } else if (metrics.winner === 'player2') {
      this.log(`🏆 WINNER: Player 2 (${config.player2Model})`, '🎉');
    } else {
      this.log('Match ended in a draw', '🤝');
    }

    // Metrics
    console.log('\n📊 MATCH METRICS:');
    this.log(`  Total Ticks: ${metrics.totalTicks}`);
    this.log(`  Duration: ${this.formatTime(metrics.duration)}`);
    this.log(`  Speed: ${(metrics.totalTicks / (metrics.duration / 1000)).toFixed(1)} ticks/sec`);

    this.log(`  Player 1 Score: ${metrics.player1Score}`, '🔵');
    this.log(`  Player 2 Score: ${metrics.player2Score}`, '🔴');

    // Timeline
    console.log();
    this.createTimeline();

    // Frame summary
    console.log(`\n📈 REPLAY FRAMES: ${frames.length} frames captured`);
    if (frames.length > 0) {
      const firstFrame = frames[0];
      const lastFrame = frames[frames.length - 1];

      this.log(`  First frame: tick ${firstFrame.tickNumber}`, '📍');
      this.log(`  Last frame: tick ${lastFrame.tickNumber}`, '📍');
      this.log(`  Frame interval: ~${Math.round(metrics.totalTicks / frames.length)} ticks`, '⏱️');
    }

    // Footer
    console.log('\n' + '='.repeat(70));
    console.log(`File: ${this.filePath}`);
    console.log(`Size: ${(fs.statSync(this.filePath).size / 1024).toFixed(1)} KB`);
    console.log('='.repeat(70) + '\n');
  }

  exportSummary(outputPath: string): void {
    const summary = {
      matchId: this.replay.metrics.matchId,
      players: [this.replay.config.player1Model, this.replay.config.player2Model],
      winner: this.replay.metrics.winner,
      duration: this.replay.metrics.duration,
      totalTicks: this.replay.metrics.totalTicks,
      scores: {
        player1: this.replay.metrics.player1Score,
        player2: this.replay.metrics.player2Score,
      },
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    this.log(`Summary exported to: ${outputPath}`, '💾');
  }
}

// Main
async function main(): Promise<void> {
  const replayFile = process.argv[2];

  if (!replayFile) {
    console.error('Usage: npx ts-node demo/replay-demo.ts <replay-file.json>');
    process.exit(1);
  }

  try {
    const viewer = new ReplayViewer(replayFile);
    viewer.display();

    // Export summary
    const summaryPath = replayFile.replace('.json', '-summary.json');
    viewer.exportSummary(summaryPath);

  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error('❌ Unknown error');
    }
    process.exit(1);
  }
}

main();
