import { describe, it, expect, beforeEach } from 'vitest';
import { ModelProfileManager, type ModelProfile, type ModelConfig } from './model-profiles.js';
import { Logger } from '../config/logger.js';

describe('ModelProfileManager', () => {
  let manager: ModelProfileManager;
  const logger = new Logger('error');

  beforeEach(() => {
    manager = new ModelProfileManager(logger);
  });

  describe('initialization', () => {
    it('should initialize with templates', () => {
      const templates = manager.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have balanced template', () => {
      const balanced = manager.getTemplate('balanced');
      expect(balanced).toBeDefined();
      expect(balanced?.config.temperature).toBe(0.7);
    });

    it('should have creative template', () => {
      const creative = manager.getTemplate('creative');
      expect(creative?.config.temperature).toBe(1.2);
    });

    it('should have specialized templates', () => {
      expect(manager.getTemplate('aggressive')).toBeDefined();
      expect(manager.getTemplate('defensive')).toBeDefined();
      expect(manager.getTemplate('economic')).toBeDefined();
    });
  });

  describe('createFromTemplate', () => {
    it('should create profile from template', () => {
      const profile = manager.createFromTemplate(
        'test-profile',
        'balanced',
        'gpt-4'
      );

      expect(profile).toBeDefined();
      expect(profile?.modelId).toBe('gpt-4');
      expect(profile?.config.temperature).toBe(0.7);
      expect(profile?.tags).toContain('balanced');
    });

    it('should apply overrides', () => {
      const profile = manager.createFromTemplate(
        'test-profile',
        'balanced',
        'gpt-4',
        {
          name: 'Custom Balanced',
          config: { temperature: 0.5 } as any,
        }
      );

      expect(profile?.name).toBe('Custom Balanced');
      expect(profile?.config.temperature).toBe(0.5);
    });

    it('should return null for non-existent template', () => {
      const profile = manager.createFromTemplate(
        'test',
        'nonexistent',
        'gpt-4'
      );

      expect(profile).toBeNull();
    });

    it('should add systemPrompt from template', () => {
      const profile = manager.createFromTemplate(
        'aggressive-profile',
        'aggressive',
        'gpt-4'
      );

      expect(profile?.systemPrompt?.constraints).toBeDefined();
      expect(profile?.systemPrompt?.constraints?.length).toBeGreaterThan(0);
    });
  });

  describe('createCustomProfile', () => {
    it('should create custom profile', () => {
      const config: ModelConfig = {
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 1000,
      };

      const profile = manager.createCustomProfile(
        'custom-1',
        'gpt-4',
        config,
        {
          name: 'My Custom Profile',
          description: 'Custom for GPT-4',
        }
      );

      expect(profile.id).toBe('custom-1');
      expect(profile.name).toBe('My Custom Profile');
      expect(profile.config.temperature).toBe(0.8);
      expect(profile.tags).toContain('custom');
    });

    it('should allow custom metadata', () => {
      const config: ModelConfig = { temperature: 0.7 };
      const profile = manager.createCustomProfile('custom-2', 'gpt-4', config, {
        metadata: { purpose: 'testing', version: '1.0' },
      });

      expect(profile.metadata.purpose).toBe('testing');
      expect(profile.metadata.version).toBe('1.0');
    });
  });

  describe('getProfile', () => {
    it('should retrieve a profile by ID', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');
      const profile = manager.getProfile('test-profile');

      expect(profile).toBeDefined();
      expect(profile?.id).toBe('test-profile');
    });

    it('should return null for non-existent profile', () => {
      const profile = manager.getProfile('nonexistent');
      expect(profile).toBeNull();
    });
  });

  describe('listProfiles', () => {
    beforeEach(() => {
      manager.createFromTemplate('balanced-gpt4', 'balanced', 'gpt-4');
      manager.createFromTemplate('creative-gpt4', 'creative', 'gpt-4');
      manager.createFromTemplate('balanced-claude', 'balanced', 'claude-opus-4-8');
    });

    it('should list all profiles', () => {
      const profiles = manager.listProfiles();
      expect(profiles.length).toBe(3);
    });

    it('should filter by modelId', () => {
      const profiles = manager.listProfiles({ modelId: 'gpt-4' });
      expect(profiles.length).toBe(2);
      expect(profiles.every(p => p.modelId === 'gpt-4')).toBe(true);
    });

    it('should filter by tag', () => {
      const profiles = manager.listProfiles({ tag: 'balanced' });
      expect(profiles.length).toBe(2);
      expect(profiles.every(p => p.tags.includes('balanced'))).toBe(true);
    });

    it('should filter by template', () => {
      const profiles = manager.listProfiles({ template: 'creative' });
      expect(profiles.every(p => p.tags.includes('creative'))).toBe(true);
    });

    it('should sort alphabetically by name', () => {
      const profiles = manager.listProfiles();
      const names = profiles.map(p => p.name);

      for (let i = 1; i < names.length; i++) {
        expect(names[i].localeCompare(names[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('updateProfile', () => {
    it('should update profile configuration', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');

      const updated = manager.updateProfile('test-profile', {
        config: { temperature: 0.5 } as any,
      });

      expect(updated).toBe(true);
      const profile = manager.getProfile('test-profile');
      expect(profile?.config.temperature).toBe(0.5);
    });

    it('should update name and description', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');

      manager.updateProfile('test-profile', {
        name: 'Updated Name',
        description: 'Updated Desc',
      });

      const profile = manager.getProfile('test-profile');
      expect(profile?.name).toBe('Updated Name');
      expect(profile?.description).toBe('Updated Desc');
    });

    it('should update updatedAt timestamp', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');
      const beforeDate = new Date(manager.getProfile('test-profile')?.updatedAt || '');

      // Artificial delay to ensure timestamp difference
      const sleepMs = 5;
      const now = Date.now();
      while (Date.now() - now < sleepMs) {
        // busy wait
      }

      manager.updateProfile('test-profile', {
        name: 'Updated',
      });

      const afterDate = new Date(manager.getProfile('test-profile')?.updatedAt || '');
      expect(afterDate.getTime()).toBeGreaterThan(beforeDate.getTime());
    });

    it('should return false for non-existent profile', () => {
      const updated = manager.updateProfile('nonexistent', { name: 'Test' });
      expect(updated).toBe(false);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');
      expect(manager.getProfile('test-profile')).toBeDefined();

      const deleted = manager.deleteProfile('test-profile');

      expect(deleted).toBe(true);
      expect(manager.getProfile('test-profile')).toBeNull();
    });

    it('should return false for non-existent profile', () => {
      const deleted = manager.deleteProfile('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear default if deleting default profile', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');
      manager.setDefault('test-profile');

      expect(manager.getDefault()).toBeDefined();

      manager.deleteProfile('test-profile');

      expect(manager.getDefault()).toBeNull();
    });
  });

  describe('cloneProfile', () => {
    it('should clone a profile with new ID', () => {
      manager.createFromTemplate('original', 'balanced', 'gpt-4');

      const cloned = manager.cloneProfile('original', 'cloned');

      expect(cloned).toBeDefined();
      expect(cloned?.id).toBe('cloned');
      expect(cloned?.config.temperature).toBe(0.7);
      expect(cloned?.name).toContain('clone');
    });

    it('should apply overrides when cloning', () => {
      manager.createFromTemplate('original', 'balanced', 'gpt-4');

      const cloned = manager.cloneProfile('original', 'cloned', {
        name: 'Custom Clone',
        config: { temperature: 0.5 } as any,
      });

      expect(cloned?.name).toBe('Custom Clone');
      expect(cloned?.config.temperature).toBe(0.5);
    });

    it('should return null for non-existent source', () => {
      const cloned = manager.cloneProfile('nonexistent', 'cloned');
      expect(cloned).toBeNull();
    });
  });

  describe('default profile', () => {
    it('should set and get default profile', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');

      manager.setDefault('test-profile');
      const defaultProfile = manager.getDefault();

      expect(defaultProfile?.id).toBe('test-profile');
    });

    it('should return null if no default set', () => {
      const defaultProfile = manager.getDefault();
      expect(defaultProfile).toBeNull();
    });

    it('should return false if setting non-existent default', () => {
      const set = manager.setDefault('nonexistent');
      expect(set).toBe(false);
    });
  });

  describe('getProfilesByModel', () => {
    beforeEach(() => {
      manager.createFromTemplate('balanced-gpt4', 'balanced', 'gpt-4');
      manager.createFromTemplate('creative-gpt4', 'creative', 'gpt-4');
      manager.createFromTemplate('balanced-claude', 'balanced', 'claude-opus-4-8');
    });

    it('should return profiles for specific model', () => {
      const profiles = manager.getProfilesByModel('gpt-4');
      expect(profiles.length).toBe(2);
      expect(profiles.every(p => p.modelId === 'gpt-4')).toBe(true);
    });

    it('should return empty array for model with no profiles', () => {
      const profiles = manager.getProfilesByModel('nonexistent');
      expect(profiles).toEqual([]);
    });
  });

  describe('getProfilesByTag', () => {
    beforeEach(() => {
      manager.createFromTemplate('balanced-1', 'balanced', 'gpt-4');
      manager.createFromTemplate('balanced-2', 'balanced', 'claude-opus-4-8');
    });

    it('should return profiles with specific tag', () => {
      const profiles = manager.getProfilesByTag('balanced');
      expect(profiles.length).toBe(2);
    });
  });

  describe('exportProfiles', () => {
    it('should export profiles as JSON', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');
      manager.setDefault('test-profile');

      const json = manager.exportProfiles();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.defaultProfile).toBe('test-profile');
      expect(Array.isArray(data.profiles)).toBe(true);
      expect(data.profiles.length).toBe(1);
    });
  });

  describe('importProfiles', () => {
    it('should import profiles from JSON', () => {
      manager.createFromTemplate('original', 'balanced', 'gpt-4');
      const exported = manager.exportProfiles();

      const newManager = new ModelProfileManager(logger);
      const imported = newManager.importProfiles(exported);

      expect(imported).toBe(true);
      expect(newManager.getProfile('original')).toBeDefined();
    });

    it('should return false for invalid format', () => {
      const imported = manager.importProfiles('invalid json');
      expect(imported).toBe(false);
    });

    it('should restore default profile on import', () => {
      manager.createFromTemplate('test-profile', 'balanced', 'gpt-4');
      manager.setDefault('test-profile');
      const exported = manager.exportProfiles();

      const newManager = new ModelProfileManager(logger);
      newManager.importProfiles(exported);

      expect(newManager.getDefault()?.id).toBe('test-profile');
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      manager.createFromTemplate('balanced-gpt4', 'balanced', 'gpt-4');
      manager.createFromTemplate('creative-gpt4', 'creative', 'gpt-4');
      manager.createFromTemplate('balanced-claude', 'balanced', 'claude-opus-4-8');
    });

    it('should return statistics', () => {
      const stats = manager.getStatistics();

      expect(stats.totalProfiles).toBe(3);
      expect(stats.byModel['gpt-4']).toBe(2);
      expect(stats.byModel['claude-opus-4-8']).toBe(1);
      expect(stats.byTemplate.balanced).toBe(2);
      expect(stats.byTemplate.creative).toBe(1);
    });
  });

  describe('validateProfile', () => {
    it('should validate correct profile', () => {
      const config: ModelConfig = {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 1000,
      };

      const profile = manager.createCustomProfile('test', 'gpt-4', config);
      const result = manager.validateProfile(profile);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid temperature', () => {
      const config: ModelConfig = {
        temperature: 2.5, // Too high
      };

      const profile = manager.createCustomProfile('test', 'gpt-4', config);
      const result = manager.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Temperature'))).toBe(true);
    });

    it('should reject invalid topP', () => {
      const config: ModelConfig = {
        temperature: 0.7,
        topP: 1.5, // Too high
      };

      const profile = manager.createCustomProfile('test', 'gpt-4', config);
      const result = manager.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Top-P'))).toBe(true);
    });
  });

  describe('compareProfiles', () => {
    it('should compare two profiles', () => {
      manager.createFromTemplate('balanced-1', 'balanced', 'gpt-4');
      manager.createFromTemplate('creative-1', 'creative', 'gpt-4');

      const comparison = manager.compareProfiles('balanced-1', 'creative-1');

      expect(comparison).toBeDefined();
      expect(comparison?.same).toBe(false);
      expect(comparison?.differences.length).toBeGreaterThan(0);
    });

    it('should identify temperature difference', () => {
      manager.createFromTemplate('balanced', 'balanced', 'gpt-4');
      manager.createFromTemplate('creative', 'creative', 'gpt-4');

      const comparison = manager.compareProfiles('balanced', 'creative')!;

      const tempDiff = comparison.differences.find(d => d.field === 'temperature');
      expect(tempDiff).toBeDefined();
      expect(tempDiff?.profile1).toBe(0.7);
      expect(tempDiff?.profile2).toBe(1.2);
    });

    it('should return null for non-existent profiles', () => {
      const comparison = manager.compareProfiles('nonexistent-1', 'nonexistent-2');
      expect(comparison).toBeNull();
    });

    it('should identify matching profiles', () => {
      manager.createFromTemplate('balanced-1', 'balanced', 'gpt-4');
      manager.cloneProfile('balanced-1', 'balanced-2');

      const comparison = manager.compareProfiles('balanced-1', 'balanced-2')!;

      expect(comparison.same).toBe(true);
      expect(comparison.differences.length).toBe(0);
    });
  });
});
