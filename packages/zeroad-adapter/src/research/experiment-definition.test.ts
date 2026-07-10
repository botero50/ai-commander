import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentDefinitionManager, type ExperimentDefinition } from './experiment-definition.js';
import { Logger } from '../config/logger.js';

describe('ExperimentDefinitionManager', () => {
  let manager: ExperimentDefinitionManager;
  const logger = new Logger('error');

  const createDefinition = (overrides: Partial<ExperimentDefinition> = {}): ExperimentDefinition => ({
    id: `exp-${Date.now()}`,
    title: 'Test Experiment',
    createdAt: new Date().toISOString(),
    goal: {
      objective: 'Test objective',
      hypothesis: 'Test hypothesis',
      successCriteria: [
        {
          metric: 'winRate',
          threshold: 0.05,
          operator: '>',
        },
      ],
    },
    baselineVariant: {
      id: 'control',
      name: 'Control',
      parameters: {},
    },
    treatmentVariants: [
      {
        id: 'treatment',
        name: 'Treatment',
        parameters: {},
      },
    ],
    parameters: [],
    minSampleSize: 30,
    status: 'draft',
    ...overrides,
  });

  beforeEach(() => {
    manager = new ExperimentDefinitionManager(logger);
  });

  describe('experiment creation', () => {
    it('should create an experiment', () => {
      const def = createDefinition();
      const created = manager.createExperiment(def);

      expect(created.id).toBe(def.id);
      expect(created.status).toBe('draft');
    });

    it('should retrieve experiment by ID', () => {
      const def = createDefinition({ id: 'test-exp-1' });
      manager.createExperiment(def);

      const retrieved = manager.getExperiment('test-exp-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Experiment');
    });

    it('should return null for non-existent experiment', () => {
      const retrieved = manager.getExperiment('nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('experiment listing', () => {
    it('should list all experiments', () => {
      manager.createExperiment(createDefinition({ id: 'exp1', status: 'draft' }));
      manager.createExperiment(createDefinition({ id: 'exp2', status: 'running' }));

      const all = manager.listExperiments();
      expect(all.length).toBe(2);
    });

    it('should filter by status', () => {
      manager.createExperiment(createDefinition({ id: 'exp1', status: 'draft' }));
      manager.createExperiment(createDefinition({ id: 'exp2', status: 'running' }));

      const running = manager.listExperiments({ status: 'running' });
      expect(running.length).toBe(1);
      expect(running[0].status).toBe('running');
    });

    it('should filter by tag', () => {
      manager.createExperiment(
        createDefinition({ id: 'exp1', tags: ['prompt-tuning'] })
      );
      manager.createExperiment(createDefinition({ id: 'exp2', tags: ['model-selection'] }));

      const tagged = manager.listExperiments({ tag: 'prompt-tuning' });
      expect(tagged.length).toBe(1);
    });
  });

  describe('experiment updates', () => {
    it('should update experiment', () => {
      const def = createDefinition({ id: 'update-test' });
      manager.createExperiment(def);

      const updated = manager.updateExperiment('update-test', { title: 'Updated Title' });

      expect(updated).toBe(true);
      expect(manager.getExperiment('update-test')?.title).toBe('Updated Title');
    });

    it('should change status', () => {
      const def = createDefinition({ id: 'status-test', status: 'draft' });
      manager.createExperiment(def);

      const changed = manager.setStatus('status-test', 'running');

      expect(changed).toBe(true);
      expect(manager.getExperiment('status-test')?.status).toBe('running');
    });

    it('should add tag', () => {
      const def = createDefinition({ id: 'tag-test' });
      manager.createExperiment(def);

      manager.addTag('tag-test', 'important');

      const exp = manager.getExperiment('tag-test');
      expect(exp?.tags).toContain('important');
    });
  });

  describe('cloning', () => {
    it('should clone an experiment', () => {
      const original = createDefinition({ id: 'original', title: 'Original Exp' });
      manager.createExperiment(original);

      const cloned = manager.cloneExperiment('original', 'cloned');

      expect(cloned).toBeDefined();
      expect(cloned?.id).toBe('cloned');
      expect(cloned?.title).toBe('Original Exp');
      expect(cloned?.status).toBe('draft');
    });

    it('should clone with updates', () => {
      const original = createDefinition({ id: 'original' });
      manager.createExperiment(original);

      const cloned = manager.cloneExperiment('original', 'cloned-updated', {
        title: 'Updated Clone',
      });

      expect(cloned?.title).toBe('Updated Clone');
    });
  });

  describe('templates', () => {
    it('should list available templates', () => {
      const templates = manager.listTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].id).toBeDefined();
    });

    it('should get AB test template', () => {
      const template = manager.getTemplate('ab-test');

      expect(template).toBeDefined();
      expect(template?.title).toContain('A/B Test');
      expect(template?.treatmentVariants.length).toBe(1);
    });

    it('should get parameter sweep template', () => {
      const template = manager.getTemplate('parameter-sweep');

      expect(template).toBeDefined();
      expect(template?.parameters.length).toBeGreaterThan(0);
    });

    it('should get model comparison template', () => {
      const template = manager.getTemplate('model-comparison');

      expect(template).toBeDefined();
      expect(template?.treatmentVariants.length).toBeGreaterThan(0);
    });

    it('should create from template', () => {
      const created = manager.createFromTemplate('ab-test', 'my-ab-test');

      expect(created).toBeDefined();
      expect(created?.id).toBe('my-ab-test');
      expect(created?.status).toBe('draft');
    });

    it('should create from template with customizations', () => {
      const created = manager.createFromTemplate('ab-test', 'custom-ab-test', {
        title: 'My Custom A/B Test',
      });

      expect(created?.title).toBe('My Custom A/B Test');
    });
  });

  describe('validation', () => {
    it('should validate valid experiment', () => {
      const def = createDefinition();
      const validation = manager.validateExperiment(def);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject missing ID', () => {
      const def = createDefinition({ id: '' });
      const validation = manager.validateExperiment(def);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('ID'))).toBe(true);
    });

    it('should reject missing title', () => {
      const def = createDefinition({ title: '' });
      const validation = manager.validateExperiment(def);

      expect(validation.valid).toBe(false);
    });

    it('should reject small sample size', () => {
      const def = createDefinition({ minSampleSize: 5 });
      const validation = manager.validateExperiment(def);

      expect(validation.valid).toBe(false);
    });

    it('should validate confidence level', () => {
      const def = createDefinition({ confidenceLevel: 0.5 });
      const validation = manager.validateExperiment(def);

      expect(validation.valid).toBe(false);
    });
  });

  describe('export and import', () => {
    it('should export definition', () => {
      const def = createDefinition({ id: 'export-test' });
      manager.createExperiment(def);

      const exported = manager.exportDefinition('export-test');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported!);
      expect(parsed.id).toBe('export-test');
    });

    it('should import definition', () => {
      const def = createDefinition({ id: 'import-test' });
      const json = JSON.stringify(def);

      const imported = manager.importDefinition(json);

      expect(imported).toBeDefined();
      expect(imported?.id).toBe('import-test');
    });

    it('should reject invalid JSON', () => {
      const imported = manager.importDefinition('invalid json');
      expect(imported).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should get statistics', () => {
      manager.createExperiment(createDefinition({ id: 'exp1', status: 'draft' }));
      manager.createExperiment(createDefinition({ id: 'exp2', status: 'running' }));
      manager.createExperiment(createDefinition({ id: 'exp3', status: 'completed' }));

      const stats = manager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus['draft']).toBe(1);
      expect(stats.byStatus['running']).toBe(1);
      expect(stats.byStatus['completed']).toBe(1);
    });

    it('should track priority statistics', () => {
      manager.createExperiment(
        createDefinition({
          id: 'exp1',
          goal: {
            objective: 'test',
            hypothesis: 'test',
            successCriteria: [],
            priority: 'high',
          },
        })
      );

      const stats = manager.getStatistics();
      expect(stats.byPriority['high']).toBe(1);
    });
  });

  describe('realistic scenario', () => {
    it('should support full experiment workflow', () => {
      // Create from template
      let exp = manager.createFromTemplate('ab-test', 'ab-test-1', {
        title: 'Prompt Optimization A/B Test',
      });

      expect(exp).toBeDefined();
      expect(exp?.status).toBe('draft');

      // Add tags
      manager.addTag('ab-test-1', 'prompt-tuning');
      manager.addTag('ab-test-1', 'priority');

      // Update to planned
      manager.setStatus('ab-test-1', 'planned');

      // List tagged experiments
      const tagged = manager.listExperiments({ tag: 'prompt-tuning' });
      expect(tagged.length).toBe(1);

      // Export for sharing
      const exported = manager.exportDefinition('ab-test-1');
      expect(exported).toBeDefined();

      // Get statistics
      const stats = manager.getStatistics();
      expect(stats.total).toBeGreaterThan(0);
    });
  });
});
