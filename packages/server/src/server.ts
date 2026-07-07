/**
 * HTTP API Server — Remote tournament execution
 *
 * Endpoints:
 * POST /matches — Execute a match
 * POST /tournaments — Execute a tournament
 * GET /tournaments/:id — Get tournament status
 * GET /results/:id — Get results
 * GET /health — Server status
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { BrainManager } from '@ai-commander/brain';
import { TournamentEngine } from '@ai-commander/tournament-engine';
import { MatchRunner } from '@ai-commander/match-runner';
import { BenchmarkReporter } from '@ai-commander/benchmark-reporter';

interface TournamentJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: number;
}

export class AICommanderServer {
  private port: number;
  private tournamentJobs = new Map<string, TournamentJob>();

  constructor(port = 3000) {
    this.port = port;
  }

  start(): void {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const pathname = url.pathname;
      const method = req.method;

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        if (pathname === '/health' && method === 'GET') {
          await this.handleHealth(req, res);
        } else if (pathname === '/matches' && method === 'POST') {
          await this.handleMatch(req, res);
        } else if (pathname === '/tournaments' && method === 'POST') {
          await this.handleTournament(req, res);
        } else if (pathname.startsWith('/tournaments/') && method === 'GET') {
          const id = pathname.split('/')[2];
          await this.handleGetTournament(req, res, id);
        } else if (pathname.startsWith('/results/') && method === 'GET') {
          const id = pathname.split('/')[2];
          await this.handleGetResult(req, res, id);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    });

    server.listen(this.port, () => {
      console.log(`🚀 AI Commander Server running on http://localhost:${this.port}`);
    });
  }

  private async handleHealth(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
  }

  private async handleMatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseJSON(req);

    const redBrain = await BrainManager.create(body.redBrain);
    const blueBrain = await BrainManager.create(body.blueBrain);

    const replay = await MatchRunner.run({
      redBrain,
      blueBrain,
      mapSeed: body.mapSeed,
      maxTicks: body.maxTicks || 200,
      gameAdapterId: body.gameAdapterId || 'openra',
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(replay));
  }

  private async handleTournament(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseJSON(req);
    const id = `tournament-${Date.now()}`;

    // Enqueue tournament
    this.tournamentJobs.set(id, { id, status: 'pending', createdAt: Date.now() });

    // Execute in background
    setImmediate(async () => {
      try {
        const job = this.tournamentJobs.get(id)!;
        job.status = 'running';

        const brains = await Promise.all(body.brains.map((cfg: any) => BrainManager.create(cfg)));

        const result = await TournamentEngine[body.format]({
          ...body,
          brains,
        });

        job.status = 'completed';
        job.result = result;
      } catch (error) {
        const job = this.tournamentJobs.get(id)!;
        job.status = 'failed';
        job.error = (error as Error).message;
      }
    });

    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id, status: 'pending' }));
  }

  private async handleGetTournament(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
    const job = this.tournamentJobs.get(id);

    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tournament not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: job.id, status: job.status, error: job.error }));
  }

  private async handleGetResult(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
    const job = this.tournamentJobs.get(id);

    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Result not found' }));
      return;
    }

    if (job.status === 'pending' || job.status === 'running') {
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: job.status }));
      return;
    }

    if (job.status === 'failed') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: job.error }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(job.result));
  }

  private parseJSON(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }
}
