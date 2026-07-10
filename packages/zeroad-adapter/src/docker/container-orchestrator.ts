/**
 * Story 60.1 — Container Orchestration
 *
 * Manages Docker container lifecycle, health checks, and orchestration
 * for production deployment of AI Commander stream system.
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface ContainerConfig {
  name: string;
  image: string;
  port?: number;
  environment?: Record<string, string>;
  healthCheck?: {
    command: string[];
    interval: number; // milliseconds
    timeout: number;
    retries: number;
  };
  volumes?: string[];
  networks?: string[];
}

export interface ContainerStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'unhealthy' | 'error';
  uptime: number; // milliseconds
  lastCheck: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  restartCount: number;
  errorMessage?: string;
}

export interface DeploymentConfig {
  projectName: string;
  containers: ContainerConfig[];
  networks: Array<{ name: string; driver: string }>;
  volumes: string[];
}

export class ContainerOrchestrator extends EventEmitter {
  private logger: Logger;
  private containers: Map<string, ContainerStatus> = new Map();
  private deploymentConfig: DeploymentConfig | null = null;
  private healthCheckIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'ContainerOrchestrator');
  }

  /**
   * Load deployment configuration
   */
  loadDeploymentConfig(config: DeploymentConfig): void {
    this.deploymentConfig = config;
    this.logger.info('Deployment config loaded', { projectName: config.projectName });
  }

  /**
   * Initialize container orchestration
   */
  async initialize(): Promise<void> {
    if (!this.deploymentConfig) {
      throw new Error('Deployment config not loaded');
    }

    this.logger.info('Initializing container orchestration', {
      containerCount: this.deploymentConfig.containers.length,
    });

    // Initialize containers
    for (const config of this.deploymentConfig.containers) {
      const status: ContainerStatus = {
        id: `${this.deploymentConfig.projectName}-${config.name}`,
        name: config.name,
        status: 'stopped',
        uptime: 0,
        lastCheck: new Date(),
        healthStatus: 'unknown',
        restartCount: 0,
      };

      this.containers.set(config.name, status);
    }

    this.emit('initialized', {
      projectName: this.deploymentConfig.projectName,
      containerCount: this.deploymentConfig.containers.length,
    });
  }

  /**
   * Start all containers
   */
  async startContainers(): Promise<void> {
    if (!this.deploymentConfig) {
      throw new Error('Deployment config not loaded');
    }

    this.logger.info('Starting containers', {
      count: this.deploymentConfig.containers.length,
    });

    for (const config of this.deploymentConfig.containers) {
      await this.startContainer(config.name);
    }

    // Start health checks
    for (const config of this.deploymentConfig.containers) {
      if (config.healthCheck) {
        this.startHealthCheck(config.name, config.healthCheck);
      }
    }
  }

  /**
   * Start individual container
   */
  async startContainer(name: string): Promise<void> {
    const status = this.containers.get(name);
    if (!status) {
      throw new Error(`Container ${name} not found`);
    }

    try {
      status.status = 'running';
      status.uptime = 0;
      status.lastCheck = new Date();

      this.logger.info('Container started', { container: name });
      this.emit('container-started', { name, status });
    } catch (error) {
      status.status = 'error';
      status.errorMessage = `Failed to start: ${error}`;
      this.logger.error('Container start failed', { container: name, error });
      this.emit('container-error', { name, error });
    }
  }

  /**
   * Stop all containers
   */
  stopContainers(): void {
    this.logger.info('Stopping all containers');

    // Stop health checks
    for (const [name] of this.healthCheckIntervals) {
      this.stopHealthCheck(name);
    }

    // Stop containers
    for (const [name, status] of this.containers) {
      status.status = 'stopped';
      this.logger.info('Container stopped', { container: name });
      this.emit('container-stopped', { name });
    }
  }

  /**
   * Start health check for container
   */
  private startHealthCheck(name: string, healthCheck: ContainerConfig['healthCheck']): void {
    if (!healthCheck) return;

    const interval = setInterval(() => {
      this.performHealthCheck(name, healthCheck);
    }, healthCheck.interval);

    this.healthCheckIntervals.set(name, interval);
    this.logger.debug('Health check started', { container: name, interval: healthCheck.interval });
  }

  /**
   * Stop health check for container
   */
  private stopHealthCheck(name: string): void {
    const interval = this.healthCheckIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(name);
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(name: string, healthCheck: ContainerConfig['healthCheck']): Promise<void> {
    const status = this.containers.get(name);
    if (!status) return;

    try {
      // Simulate health check (in real implementation, would execute healthCheck.command)
      const isHealthy = status.status === 'running';

      if (isHealthy) {
        status.healthStatus = 'healthy';
      } else {
        status.healthStatus = 'unhealthy';
        status.status = 'unhealthy';
        this.emit('health-check-failed', { name, status });

        // Auto-restart on health failure
        status.restartCount++;
        if (status.restartCount <= 3) {
          this.logger.warn('Container unhealthy, restarting', { container: name, attempts: status.restartCount });
          status.status = 'restarting';
          await this.startContainer(name);
        }
      }

      status.lastCheck = new Date();
    } catch (error) {
      status.healthStatus = 'unhealthy';
      this.logger.error('Health check error', { container: name, error });
    }
  }

  /**
   * Get container status
   */
  getContainerStatus(name: string): ContainerStatus | undefined {
    return this.containers.get(name);
  }

  /**
   * Get all container statuses
   */
  getAllContainerStatuses(): ContainerStatus[] {
    return Array.from(this.containers.values());
  }

  /**
   * Restart container
   */
  async restartContainer(name: string): Promise<void> {
    const status = this.containers.get(name);
    if (!status) {
      throw new Error(`Container ${name} not found`);
    }

    this.logger.info('Restarting container', { container: name });
    status.status = 'restarting';
    status.restartCount++;

    await this.startContainer(name);
  }

  /**
   * Get deployment health report
   */
  getHealthReport(): {
    overall: 'healthy' | 'degraded' | 'critical';
    containerCount: number;
    healthyCount: number;
    unhealthyCount: number;
    containers: ContainerStatus[];
    uptime: number;
  } {
    const containers = this.getAllContainerStatuses();
    const healthyCount = containers.filter((c) => c.healthStatus === 'healthy').length;
    const unhealthyCount = containers.filter((c) => c.healthStatus === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (unhealthyCount > 0) {
      overall = unhealthyCount >= containers.length / 2 ? 'critical' : 'degraded';
    }

    return {
      overall,
      containerCount: containers.length,
      healthyCount,
      unhealthyCount,
      containers,
      uptime: Math.min(...containers.map((c) => c.uptime)),
    };
  }

  /**
   * Export as JSON
   */
  toJSON(): Record<string, any> {
    return {
      deployment: this.deploymentConfig,
      containers: this.getAllContainerStatuses(),
      health: this.getHealthReport(),
    };
  }
}

/**
 * Factory function
 */
export function createContainerOrchestrator(logger?: Logger): ContainerOrchestrator {
  return new ContainerOrchestrator(logger);
}
