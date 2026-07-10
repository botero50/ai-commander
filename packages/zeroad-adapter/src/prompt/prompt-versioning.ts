/**
 * Story 49.2 — Prompt Versioning
 *
 * Enable full version control for prompts:
 * - Diff between versions
 * - Revert to previous versions
 * - Merge strategies
 * - Tagging releases
 * - Branching for experiments
 */

import { Logger } from '../config/logger.js';

export interface PromptDiff {
  version1: string;
  version2: string;
  added: string[];
  removed: string[];
  modified: Array<{
    original: string;
    updated: string;
  }>;
  similarity: number; // 0-1, how similar the versions are
}

export interface PromptTag {
  name: string;
  version: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PromptBranch {
  id: string;
  name: string;
  baseVersion: string;
  currentVersion: string;
  description?: string;
  createdAt: string;
  merged?: boolean;
  mergedIntoVersion?: string;
}

export interface PromptRelease {
  version: string;
  released: true;
  releaseDate: string;
  changelog: string;
  tag: PromptTag;
}

export class PromptVersionManager {
  private versions: Map<string, { version: string; content: string; createdAt: string }> =
    new Map();
  private tags: Map<string, PromptTag[]> = new Map(); // prompt id -> tags
  private branches: Map<string, PromptBranch[]> = new Map(); // prompt id -> branches
  private releases: Map<string, PromptRelease[]> = new Map(); // prompt id -> releases
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a version
   */
  registerVersion(promptId: string, version: string, content: string): void {
    const key = `${promptId}@${version}`;
    this.versions.set(key, {
      version,
      content,
      createdAt: new Date().toISOString(),
    });

    this.logger.info('Version registered', { promptId, version });
  }

  /**
   * Get version content
   */
  getVersion(promptId: string, version: string): string | null {
    const key = `${promptId}@${version}`;
    return this.versions.get(key)?.content || null;
  }

  /**
   * Compare two versions
   */
  diffVersions(promptId: string, version1: string, version2: string): PromptDiff | null {
    const content1 = this.getVersion(promptId, version1);
    const content2 = this.getVersion(promptId, version2);

    if (!content1 || !content2) return null;

    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    const added: string[] = [];
    const removed: string[] = [];
    const modified: Array<{ original: string; updated: string }> = [];

    // Simple line-based diff (not a full LCS implementation)
    const set1 = new Set(lines1);
    const set2 = new Set(lines2);

    for (const line of lines2) {
      if (!set1.has(line)) {
        added.push(line);
      }
    }

    for (const line of lines1) {
      if (!set2.has(line)) {
        removed.push(line);
      }
    }

    // Calculate similarity
    const totalLines = Math.max(lines1.length, lines2.length);
    const differences = added.length + removed.length;
    const similarity = 1 - differences / Math.max(totalLines, 1);

    return {
      version1,
      version2,
      added,
      removed,
      modified,
      similarity,
    };
  }

  /**
   * Tag a version as a release
   */
  tagVersion(promptId: string, version: string, tagName: string, description?: string): boolean {
    if (!this.getVersion(promptId, version)) {
      this.logger.warn('Version not found for tagging', { promptId, version });
      return false;
    }

    const tag: PromptTag = {
      name: tagName,
      version,
      description,
      createdAt: new Date().toISOString(),
    };

    if (!this.tags.has(promptId)) {
      this.tags.set(promptId, []);
    }

    this.tags.get(promptId)!.push(tag);

    this.logger.info('Version tagged', { promptId, version, tag: tagName });
    return true;
  }

  /**
   * Get all tags for a prompt
   */
  getTags(promptId: string): PromptTag[] {
    return this.tags.get(promptId) || [];
  }

  /**
   * Get version by tag
   */
  getVersionByTag(promptId: string, tagName: string): string | null {
    const tags = this.tags.get(promptId) || [];
    const tag = tags.find(t => t.name === tagName);
    return tag?.version || null;
  }

  /**
   * Create a branch for experimentation
   */
  createBranch(
    promptId: string,
    branchName: string,
    baseVersion: string,
    description?: string
  ): PromptBranch | null {
    if (!this.getVersion(promptId, baseVersion)) {
      this.logger.warn('Base version not found for branch', { promptId, baseVersion });
      return null;
    }

    const branch: PromptBranch = {
      id: `${promptId}/${branchName}`,
      name: branchName,
      baseVersion,
      currentVersion: baseVersion,
      description,
      createdAt: new Date().toISOString(),
    };

    if (!this.branches.has(promptId)) {
      this.branches.set(promptId, []);
    }

    this.branches.get(promptId)!.push(branch);

    this.logger.info('Branch created', { promptId, branch: branchName, baseVersion });
    return branch;
  }

  /**
   * Get all branches for a prompt
   */
  getBranches(promptId: string): PromptBranch[] {
    return this.branches.get(promptId) || [];
  }

  /**
   * Update branch to new version
   */
  updateBranch(promptId: string, branchName: string, newVersion: string): boolean {
    const branches = this.branches.get(promptId);
    if (!branches) return false;

    const branch = branches.find(b => b.name === branchName);
    if (!branch) return false;

    if (!this.getVersion(promptId, newVersion)) {
      this.logger.warn('Version not found for branch update', { promptId, newVersion });
      return false;
    }

    branch.currentVersion = newVersion;

    this.logger.info('Branch updated', { promptId, branch: branchName, version: newVersion });
    return true;
  }

  /**
   * Merge branch back to main
   */
  mergeBranch(promptId: string, branchName: string, targetVersion: string): boolean {
    const branches = this.branches.get(promptId);
    if (!branches) return false;

    const branchIndex = branches.findIndex(b => b.name === branchName);
    if (branchIndex === -1) return false;

    const branch = branches[branchIndex];

    // Mark as merged
    branch.merged = true;
    branch.mergedIntoVersion = targetVersion;

    this.logger.info('Branch merged', { promptId, branch: branchName, into: targetVersion });
    return true;
  }

  /**
   * Mark version as released
   */
  releaseVersion(
    promptId: string,
    version: string,
    changelog: string,
    tagName?: string
  ): PromptRelease | null {
    if (!this.getVersion(promptId, version)) {
      this.logger.warn('Version not found for release', { promptId, version });
      return null;
    }

    const tag: PromptTag = {
      name: tagName || `v${version}`,
      version,
      createdAt: new Date().toISOString(),
    };

    const release: PromptRelease = {
      version,
      released: true,
      releaseDate: new Date().toISOString(),
      changelog,
      tag,
    };

    // Tag the version
    if (!this.tags.has(promptId)) {
      this.tags.set(promptId, []);
    }
    this.tags.get(promptId)!.push(tag);

    // Record release
    if (!this.releases.has(promptId)) {
      this.releases.set(promptId, []);
    }
    this.releases.get(promptId)!.push(release);

    this.logger.info('Version released', { promptId, version, tag: tag.name });
    return release;
  }

  /**
   * Get all releases
   */
  getReleases(promptId: string): PromptRelease[] {
    return this.releases.get(promptId) || [];
  }

  /**
   * Get latest released version
   */
  getLatestRelease(promptId: string): PromptRelease | null {
    const releases = this.releases.get(promptId);
    if (!releases || releases.length === 0) return null;

    return releases[releases.length - 1];
  }

  /**
   * Get version timeline
   */
  getTimeline(promptId: string): Array<{
    version: string;
    createdAt: string;
    tags: string[];
    isReleased: boolean;
  }> {
    const versions: Array<{ version: string; createdAt: string }> = [];
    const tags = this.tags.get(promptId) || [];
    const releases = this.releases.get(promptId) || [];

    // Collect all versions
    for (const [key, versionData] of this.versions) {
      if (key.startsWith(`${promptId}@`)) {
        versions.push(versionData);
      }
    }

    // Sort by version number
    versions.sort((a, b) => {
      const aParts = a.version.split('.').map(Number);
      const bParts = b.version.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if ((aParts[i] || 0) !== (bParts[i] || 0)) {
          return (aParts[i] || 0) - (bParts[i] || 0);
        }
      }

      return 0;
    });

    return versions.map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      tags: tags.filter(t => t.version === v.version).map(t => t.name),
      isReleased: releases.some(r => r.version === v.version),
    }));
  }

  /**
   * Revert to previous version
   */
  revertToPreviousVersion(promptId: string, currentVersion: string): string | null {
    const timeline = this.getTimeline(promptId);
    const currentIndex = timeline.findIndex(v => v.version === currentVersion);

    if (currentIndex <= 0) {
      this.logger.warn('Cannot revert - no previous version', { promptId, currentVersion });
      return null;
    }

    return timeline[currentIndex - 1].version;
  }

  /**
   * Get version statistics
   */
  getVersionStatistics(promptId: string): {
    totalVersions: number;
    totalBranches: number;
    totalTags: number;
    totalReleases: number;
    activeBranches: number;
  } {
    const versions = Array.from(this.versions.keys()).filter(k => k.startsWith(`${promptId}@`))
      .length;
    const branches = (this.branches.get(promptId) || []).length;
    const tags = (this.tags.get(promptId) || []).length;
    const releases = (this.releases.get(promptId) || []).length;
    const activeBranches = (this.branches.get(promptId) || []).filter(b => !b.merged).length;

    return {
      totalVersions: versions,
      totalBranches: branches,
      totalTags: tags,
      totalReleases: releases,
      activeBranches,
    };
  }

  /**
   * Export version history
   */
  exportVersionHistory(promptId: string): string {
    const versions = this.getTimeline(promptId);
    const tags = this.tags.get(promptId) || [];
    const branches = this.branches.get(promptId) || [];
    const releases = this.releases.get(promptId) || [];

    const data = {
      promptId,
      exportedAt: new Date().toISOString(),
      versions,
      tags,
      branches,
      releases,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Compare multiple versions
   */
  compareMultiple(promptId: string, versions: string[]): Array<{
    version: string;
    size: number;
    lines: number;
  }> {
    return versions
      .map(v => {
        const content = this.getVersion(promptId, v);
        if (!content) return null;

        return {
          version: v,
          size: content.length,
          lines: content.split('\n').length,
        };
      })
      .filter(Boolean) as Array<{
      version: string;
      size: number;
      lines: number;
    }>;
  }
}
