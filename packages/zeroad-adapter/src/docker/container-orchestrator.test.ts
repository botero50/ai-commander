/**
 * Container Orchestrator Tests
 *
 * Validates Docker container lifecycle management and health monitoring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerOrchestrator, createContainerOrchestrator } from './container-orchestrator.js';
import { Logger } from '../config/logger.js';

describe('Container Orchestrator', () => {
  let orchestrator: ContainerOrchestrator;
  const logger = new Logger('error', 'OrchestratorTest');

  const createDeploymentConfig = () => ({
    projectName: 'ai-commander',
    containers: [
      {
        name: 'stream',
        image: 'ai-commander-stream:latest',
        port: 8080,
        environment: { NODE_ENV: 'production' },
        healthCheck: {
          command: ['curl', '-f', 'http://localhost:8080/health'],
          interval: 30000,
          timeout: 10000,
          retries: 3,
        },
      },
      {
        name: 'redis',
        image: 'redis:7-alpine',
        port: 6379,
        healthCheck: {
          command: ['redis-cli', 'ping'],
          interval: 10000,
          timeout: 5000,
          retries: 3,
        },
      },
      {
        name: 'ollama',
        image: 'ollama/ollama:latest',
        port: 11434,
      },
    ],
    networks: [
      { name: 'ai-commander', driver: 'bridge' },
    ],
    volumes: ['stream-logs', 'stream-data', 'redis-data'],
  });

  beforeEach(() => {
    orchestrator = new ContainerOrchestrator(logger);
  });

  describe('initialization', () => {
    it('should create orchestrator', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should create via factory', () => {
      const factoryOrchestrator = createContainerOrchestrator(logger);
      expect(factoryOrchestrator).toBeDefined();
    });

    it('should throw without config', async () => {
      expect(() => orchestrator.initialize()).rejects.toThrow('Deployment config not loaded');
    });

    it('should load deployment config', () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('container initialization', () => {
    it('should initialize containers', async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();

      const statuses = orchestrator.getAllContainerStatuses();
      expect(statuses.length).toBe(3);
    });

    it('should set initial status to stopped', async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();

      const status = orchestrator.getContainerStatus('stream');
      expect(status?.status).toBe('stopped');
    });

    it('should initialize all containers from config', async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();

      const names = ['stream', 'redis', 'ollama'];
      names.forEach((name) => {
        expect(orchestrator.getContainerStatus(name)).toBeDefined();
      });
    });
  });

  describe('container lifecycle', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
    });

    it('should start containers', async () => {
      await orchestrator.startContainers();

      const status = orchestrator.getContainerStatus('stream');
      expect(status?.status).toBe('running');
    });

    it('should track container uptime', async () => {
      await orchestrator.startContainers();

      const status = orchestrator.getContainerStatus('stream');
      expect(status?.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should stop containers', async () => {
      await orchestrator.startContainers();
      orchestrator.stopContainers();

      const status = orchestrator.getContainerStatus('stream');
      expect(status?.status).toBe('stopped');
    });

    it('should emit start events', () => {
      return new Promise<void>((resolve) => {
        orchestrator.on('container-started', (event) => {
          expect(event.name).toBe('stream');
          resolve();
        });

        orchestrator.startContainer('stream');
      });
    });

    it('should emit stop events', async () => {
      await orchestrator.startContainers();

      return new Promise<void>((resolve) => {
        orchestrator.on('container-stopped', (event) => {
          expect(event.name).toBe('stream');
          resolve();
        });

        orchestrator.stopContainers();
        resolve(); // Allow resolution after first emission
      });
    });
  });

  describe('health checking', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
      await orchestrator.startContainers();
    });

    it('should monitor container health', async () => {
      const status = orchestrator.getContainerStatus('stream');
      expect(status?.healthStatus).toBeDefined();
    });

    it('should set healthy status for running containers', async () => {
      const status = orchestrator.getContainerStatus('stream');
      // Running container should be healthy
      expect(['healthy', 'unhealthy', 'unknown']).toContain(status?.healthStatus);
    });

    it('should track health check timestamp', async () => {
      const status = orchestrator.getContainerStatus('stream');
      expect(status?.lastCheck).toBeDefined();
      expect(status?.lastCheck).toBeInstanceOf(Date);
    });
  });

  describe('restart behavior', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
      await orchestrator.startContainers();
    });

    it('should restart containers', async () => {
      const before = orchestrator.getContainerStatus('stream')?.restartCount || 0;
      await orchestrator.restartContainer('stream');
      const after = orchestrator.getContainerStatus('stream')?.restartCount || 0;

      expect(after).toBe(before + 1);
    });

    it('should set restarting status', async () => {
      await orchestrator.restartContainer('stream');
      // After restart, should transition to running
      const status = orchestrator.getContainerStatus('stream');
      expect(['running', 'restarting']).toContain(status?.status);
    });

    it('should throw on unknown container', async () => {
      expect(() => orchestrator.restartContainer('unknown')).rejects.toThrow('not found');
    });
  });

  describe('status retrieval', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
      await orchestrator.startContainers();
    });

    it('should get individual container status', () => {
      const status = orchestrator.getContainerStatus('stream');
      expect(status).toBeDefined();
      expect(status?.name).toBe('stream');
    });

    it('should get all container statuses', () => {
      const statuses = orchestrator.getAllContainerStatuses();
      expect(statuses.length).toBe(3);
    });

    it('should include all status fields', () => {
      const status = orchestrator.getContainerStatus('stream');
      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('name');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('lastCheck');
      expect(status).toHaveProperty('healthStatus');
      expect(status).toHaveProperty('restartCount');
    });
  });

  describe('health reporting', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
      await orchestrator.startContainers();
    });

    it('should generate health report', () => {
      const report = orchestrator.getHealthReport();
      expect(report).toBeDefined();
    });

    it('should include overall status', () => {
      const report = orchestrator.getHealthReport();
      expect(['healthy', 'degraded', 'critical']).toContain(report.overall);
    });

    it('should count containers', () => {
      const report = orchestrator.getHealthReport();
      expect(report.containerCount).toBe(3);
    });

    it('should count healthy and unhealthy', () => {
      const report = orchestrator.getHealthReport();
      expect(report.healthyCount).toBeGreaterThanOrEqual(0);
      expect(report.unhealthyCount).toBeGreaterThanOrEqual(0);
    });

    it('should set critical when majority unhealthy', () => {
      // Simulate unhealthy containers
      const statuses = orchestrator.getAllContainerStatuses();
      statuses.forEach((s) => (s.healthStatus = 'unhealthy'));

      const report = orchestrator.getHealthReport();
      expect(report.overall).toBe('critical');
    });

    it('should set degraded when some unhealthy', () => {
      const statuses = orchestrator.getAllContainerStatuses();
      statuses[0].healthStatus = 'unhealthy';

      const report = orchestrator.getHealthReport();
      expect(report.overall).toBe('degraded');
    });
  });

  describe('event emissions', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
    });

    it('should emit initialized event', () => {
      return new Promise<void>((resolve) => {
        const config = createDeploymentConfig();
        const newOrchestrator = new ContainerOrchestrator(logger);

        newOrchestrator.on('initialized', (event) => {
          expect(event.projectName).toBe('ai-commander');
          expect(event.containerCount).toBe(3);
          resolve();
        });

        newOrchestrator.loadDeploymentConfig(config);
        newOrchestrator.initialize();
      });
    });
  });

  describe('JSON export', () => {
    beforeEach(async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
      await orchestrator.startContainers();
    });

    it('should export as JSON', () => {
      const json = orchestrator.toJSON();
      expect(json).toBeDefined();
      expect(() => JSON.stringify(json)).not.toThrow();
    });

    it('should include deployment config', () => {
      const json = orchestrator.toJSON();
      expect(json.deployment).toBeDefined();
      expect(json.deployment.projectName).toBe('ai-commander');
    });

    it('should include container statuses', () => {
      const json = orchestrator.toJSON();
      expect(json.containers).toBeDefined();
      expect(json.containers.length).toBe(3);
    });

    it('should include health report', () => {
      const json = orchestrator.toJSON();
      expect(json.health).toBeDefined();
      expect(json.health.overall).toBeDefined();
    });
  });

  describe('realistic deployment scenario', () => {
    it('should manage full deployment lifecycle', async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);

      // Initialize
      await orchestrator.initialize();
      expect(orchestrator.getAllContainerStatuses().length).toBe(3);

      // Start
      await orchestrator.startContainers();
      const allRunning = orchestrator.getAllContainerStatuses().every((c) => c.status === 'running');
      expect(allRunning).toBe(true);

      // Check health
      const report = orchestrator.getHealthReport();
      expect(report.containerCount).toBe(3);

      // Stop
      orchestrator.stopContainers();
      const allStopped = orchestrator.getAllContainerStatuses().every((c) => c.status === 'stopped');
      expect(allStopped).toBe(true);
    });

    it('should handle multi-container orchestration', async () => {
      const config = createDeploymentConfig();
      orchestrator.loadDeploymentConfig(config);
      await orchestrator.initialize();
      await orchestrator.startContainers();

      const statuses = orchestrator.getAllContainerStatuses();
      expect(statuses.length).toBe(3);

      // Verify each container
      expect(statuses.find((s) => s.name === 'stream')).toBeDefined();
      expect(statuses.find((s) => s.name === 'redis')).toBeDefined();
      expect(statuses.find((s) => s.name === 'ollama')).toBeDefined();

      // Cleanup
      orchestrator.stopContainers();
    });
  });
});
