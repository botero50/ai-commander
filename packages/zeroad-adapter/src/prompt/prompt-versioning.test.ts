import { describe, it, expect, beforeEach } from 'vitest';
import { PromptVersionManager } from './prompt-versioning.js';
import { Logger } from '../config/logger.js';

describe('PromptVersionManager', () => {
  let manager: PromptVersionManager;
  const logger = new Logger('error');

  beforeEach(() => {
    manager = new PromptVersionManager(logger);
  });

  describe('version management', () => {
    it('should register a version', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Version 1 content');

      const content = manager.getVersion('prompt-1', '1.0.0');
      expect(content).toBe('Version 1 content');
    });

    it('should retrieve version content', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content A');
      manager.registerVersion('prompt-1', '1.0.1', 'Content B');

      expect(manager.getVersion('prompt-1', '1.0.0')).toBe('Content A');
      expect(manager.getVersion('prompt-1', '1.0.1')).toBe('Content B');
    });

    it('should return null for non-existent version', () => {
      const content = manager.getVersion('prompt-1', '1.0.0');
      expect(content).toBeNull();
    });
  });

  describe('diff versions', () => {
    it('should diff two versions', () => {
      manager.registerVersion(
        'prompt-1',
        '1.0.0',
        'Line 1\nLine 2\nLine 3'
      );
      manager.registerVersion(
        'prompt-1',
        '1.0.1',
        'Line 1\nLine 2 Modified\nLine 3\nLine 4'
      );

      const diff = manager.diffVersions('prompt-1', '1.0.0', '1.0.1');

      expect(diff).toBeDefined();
      expect(diff?.added.length).toBeGreaterThan(0);
      expect(diff?.similarity).toBeGreaterThan(0);
    });

    it('should calculate similarity score', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Similar content here');
      manager.registerVersion('prompt-1', '1.0.1', 'Similar content here');

      const diff = manager.diffVersions('prompt-1', '1.0.0', '1.0.1');

      expect(diff?.similarity).toBe(1); // Identical versions
    });

    it('should return null for non-existent versions', () => {
      const diff = manager.diffVersions('prompt-1', '1.0.0', '1.0.1');
      expect(diff).toBeNull();
    });
  });

  describe('tagging', () => {
    it('should tag a version', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');

      const tagged = manager.tagVersion('prompt-1', '1.0.0', 'stable');

      expect(tagged).toBe(true);
    });

    it('should get tags for a prompt', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');
      manager.registerVersion('prompt-1', '1.0.1', 'New content');

      manager.tagVersion('prompt-1', '1.0.0', 'stable');
      manager.tagVersion('prompt-1', '1.0.1', 'beta');

      const tags = manager.getTags('prompt-1');

      expect(tags.length).toBe(2);
      expect(tags.some(t => t.name === 'stable')).toBe(true);
      expect(tags.some(t => t.name === 'beta')).toBe(true);
    });

    it('should get version by tag', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');
      manager.tagVersion('prompt-1', '1.0.0', 'stable');

      const version = manager.getVersionByTag('prompt-1', 'stable');

      expect(version).toBe('1.0.0');
    });

    it('should return false for non-existent version', () => {
      const tagged = manager.tagVersion('prompt-1', '1.0.0', 'stable');
      expect(tagged).toBe(false);
    });
  });

  describe('branching', () => {
    it('should create a branch', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Base content');

      const branch = manager.createBranch('prompt-1', 'experiment', '1.0.0', 'Testing new approach');

      expect(branch).toBeDefined();
      expect(branch?.name).toBe('experiment');
      expect(branch?.baseVersion).toBe('1.0.0');
    });

    it('should get branches for a prompt', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');

      manager.createBranch('prompt-1', 'branch-1', '1.0.0');
      manager.createBranch('prompt-1', 'branch-2', '1.0.0');

      const branches = manager.getBranches('prompt-1');

      expect(branches.length).toBe(2);
    });

    it('should update branch to new version', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Base');
      manager.registerVersion('prompt-1', '1.1.0', 'Branch update');

      manager.createBranch('prompt-1', 'feature', '1.0.0');
      const updated = manager.updateBranch('prompt-1', 'feature', '1.1.0');

      expect(updated).toBe(true);

      const branches = manager.getBranches('prompt-1');
      const featureBranch = branches.find(b => b.name === 'feature');
      expect(featureBranch?.currentVersion).toBe('1.1.0');
    });

    it('should merge branch', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Base');
      manager.registerVersion('prompt-1', '1.1.0', 'Branch work');

      manager.createBranch('prompt-1', 'feature', '1.0.0');
      manager.updateBranch('prompt-1', 'feature', '1.1.0');

      const merged = manager.mergeBranch('prompt-1', 'feature', '1.1.0');

      expect(merged).toBe(true);

      const branches = manager.getBranches('prompt-1');
      const featureBranch = branches.find(b => b.name === 'feature');
      expect(featureBranch?.merged).toBe(true);
    });
  });

  describe('releases', () => {
    it('should release a version', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');

      const release = manager.releaseVersion(
        'prompt-1',
        '1.0.0',
        'Initial release',
        'v1.0.0'
      );

      expect(release).toBeDefined();
      expect(release?.released).toBe(true);
      expect(release?.version).toBe('1.0.0');
    });

    it('should get all releases', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');
      manager.registerVersion('prompt-1', '2.0.0', 'V2');

      manager.releaseVersion('prompt-1', '1.0.0', 'First release');
      manager.releaseVersion('prompt-1', '2.0.0', 'Major update');

      const releases = manager.getReleases('prompt-1');

      expect(releases.length).toBe(2);
    });

    it('should get latest release', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');
      manager.registerVersion('prompt-1', '2.0.0', 'V2');

      manager.releaseVersion('prompt-1', '1.0.0', 'First');
      manager.releaseVersion('prompt-1', '2.0.0', 'Second');

      const latest = manager.getLatestRelease('prompt-1');

      expect(latest?.version).toBe('2.0.0');
    });

    it('should return null if no releases', () => {
      const latest = manager.getLatestRelease('prompt-1');
      expect(latest).toBeNull();
    });
  });

  describe('timeline', () => {
    it('should get version timeline', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');
      manager.registerVersion('prompt-1', '1.0.1', 'V1.1');
      manager.registerVersion('prompt-1', '1.1.0', 'V1.1');

      const timeline = manager.getTimeline('prompt-1');

      expect(timeline.length).toBe(3);
      expect(timeline[0].version).toBe('1.0.0');
    });

    it('should mark released versions', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');
      manager.registerVersion('prompt-1', '1.0.1', 'V1.1');

      manager.releaseVersion('prompt-1', '1.0.0', 'Release');

      const timeline = manager.getTimeline('prompt-1');
      const v1 = timeline.find(t => t.version === '1.0.0');

      expect(v1?.isReleased).toBe(true);
    });

    it('should include tags in timeline', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');

      manager.tagVersion('prompt-1', '1.0.0', 'stable');
      manager.tagVersion('prompt-1', '1.0.0', 'prod');

      const timeline = manager.getTimeline('prompt-1');
      const v1 = timeline.find(t => t.version === '1.0.0');

      expect(v1?.tags.length).toBe(2);
      expect(v1?.tags).toContain('stable');
    });
  });

  describe('revert', () => {
    it('should revert to previous version', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');
      manager.registerVersion('prompt-1', '1.0.1', 'V1.1');
      manager.registerVersion('prompt-1', '1.1.0', 'V1.1');

      const previous = manager.revertToPreviousVersion('prompt-1', '1.1.0');

      expect(previous).toBe('1.0.1');
    });

    it('should return null if no previous version', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');

      const previous = manager.revertToPreviousVersion('prompt-1', '1.0.0');

      expect(previous).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should get version statistics', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'V1');
      manager.registerVersion('prompt-1', '1.0.1', 'V1.1');

      manager.createBranch('prompt-1', 'feature', '1.0.0');
      manager.createBranch('prompt-1', 'bugfix', '1.0.1');

      manager.tagVersion('prompt-1', '1.0.0', 'stable');

      const stats = manager.getVersionStatistics('prompt-1');

      expect(stats.totalVersions).toBe(2);
      expect(stats.totalBranches).toBe(2);
      expect(stats.totalTags).toBe(1);
      expect(stats.activeBranches).toBe(2);
    });
  });

  describe('export', () => {
    it('should export version history', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');
      manager.tagVersion('prompt-1', '1.0.0', 'stable');
      manager.releaseVersion('prompt-1', '1.0.0', 'Initial');

      const exported = manager.exportVersionHistory('prompt-1');
      const data = JSON.parse(exported);

      expect(data.promptId).toBe('prompt-1');
      expect(Array.isArray(data.versions)).toBe(true);
      expect(Array.isArray(data.tags)).toBe(true);
      expect(Array.isArray(data.releases)).toBe(true);
    });
  });

  describe('compare multiple', () => {
    it('should compare multiple versions', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Short');
      manager.registerVersion('prompt-1', '1.0.1', 'This is a much longer version');

      const comparison = manager.compareMultiple('prompt-1', ['1.0.0', '1.0.1']);

      expect(comparison.length).toBe(2);
      expect(comparison[0].size).toBeLessThan(comparison[1].size);
    });

    it('should skip non-existent versions', () => {
      manager.registerVersion('prompt-1', '1.0.0', 'Content');

      const comparison = manager.compareMultiple('prompt-1', ['1.0.0', '1.0.1']);

      expect(comparison.length).toBe(1);
      expect(comparison[0].version).toBe('1.0.0');
    });
  });

  describe('version workflow', () => {
    it('should support full version workflow', () => {
      // Create base version
      manager.registerVersion('prompt-1', '1.0.0', 'Base prompt');
      manager.releaseVersion('prompt-1', '1.0.0', 'Initial release', 'stable');

      // Create experimental branch
      manager.createBranch('prompt-1', 'aggressive-v2', '1.0.0', 'Testing aggressive strategy');

      // Work on branch
      manager.registerVersion('prompt-1', '1.1.0-exp', 'New aggressive approach');
      manager.updateBranch('prompt-1', 'aggressive-v2', '1.1.0-exp');

      // Merge branch
      manager.mergeBranch('prompt-1', 'aggressive-v2', '1.1.0-exp');

      // Release new version
      manager.releaseVersion('prompt-1', '1.1.0-exp', 'Aggressive strategy v2');

      // Verify history
      const timeline = manager.getTimeline('prompt-1');
      expect(timeline.length).toBe(2);

      const releases = manager.getReleases('prompt-1');
      expect(releases.length).toBe(2);

      const branches = manager.getBranches('prompt-1');
      expect(branches[0].merged).toBe(true);
    });
  });
});
