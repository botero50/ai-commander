/**
 * Configuration System — Load, validate, merge YAML/JSON configs
 *
 * Supports:
 * 1. Environment variable substitution
 * 2. Config inheritance (extends)
 * 3. Validation against schemas
 * 4. Multiple file formats
 */
import fs from 'fs';
import path from 'path';
/**
 * ConfigLoader: Load and merge configurations
 */
export class ConfigLoader {
    static load(filePath) {
        const fullPath = path.resolve(filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const config = this.parse(content, path.extname(fullPath));
        // Resolve extends
        if (config.extends) {
            const parentPath = path.resolve(path.dirname(fullPath), config.extends);
            const parentConfig = this.load(parentPath);
            return this.merge(parentConfig, config);
        }
        // Substitute environment variables
        return this.substituteEnv(config);
    }
    static parse(content, ext) {
        if (ext === '.json') {
            return JSON.parse(content);
        }
        else if (ext === '.yaml' || ext === '.yml') {
            // Simple YAML parser for common patterns (no external deps)
            return this.parseYAML(content);
        }
        else {
            throw new Error(`Unsupported file format: ${ext}`);
        }
    }
    static parseYAML(content) {
        const lines = content.split('\n');
        const root = {};
        const stack = [];
        for (const line of lines) {
            if (!line.trim() || line.trim().startsWith('#'))
                continue;
            const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
            if (!match)
                continue;
            const [, indent, key, value] = match;
            const level = indent.length / 2;
            // Pop stack to current level
            while (stack.length > level) {
                stack.pop();
            }
            const parent = stack.length > 0 ? stack[stack.length - 1].obj : root;
            if (value.trim()) {
                // Scalar value
                parent[key] = this.parseValue(value);
            }
            else {
                // Object value
                parent[key] = {};
                stack.push({ level, key, obj: parent[key] });
            }
        }
        return root;
    }
    static parseValue(value) {
        const trimmed = value.trim();
        if (trimmed === 'true')
            return true;
        if (trimmed === 'false')
            return false;
        if (trimmed === 'null')
            return null;
        if (!isNaN(Number(trimmed)))
            return Number(trimmed);
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
                return JSON.parse(trimmed);
            }
            catch {
                return trimmed;
            }
        }
        return trimmed;
    }
    static substituteEnv(config) {
        if (typeof config === 'string') {
            return config.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || '');
        }
        if (Array.isArray(config)) {
            return config.map((item) => this.substituteEnv(item));
        }
        if (typeof config === 'object' && config !== null) {
            const result = {};
            for (const [key, value] of Object.entries(config)) {
                result[key] = this.substituteEnv(value);
            }
            return result;
        }
        return config;
    }
    static merge(parent, child) {
        const result = { ...parent };
        for (const [key, value] of Object.entries(child)) {
            if (value === null || value === undefined)
                continue;
            if (typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.merge(result[key] || {}, value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    static validate(config) {
        const errors = [];
        if (!config.version) {
            errors.push('Missing required field: version');
        }
        for (const [name, tournament] of Object.entries(config.tournaments || {})) {
            if (!tournament.format) {
                errors.push(`Tournament '${name}': missing format`);
            }
            if (!tournament.brains || tournament.brains.length === 0) {
                errors.push(`Tournament '${name}': must have at least one brain`);
            }
            if (!tournament.mapSeeds || tournament.mapSeeds.length === 0) {
                errors.push(`Tournament '${name}': must have at least one map seed`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static mergeWithDefaults(config) {
        const defaults = {
            version: '2.0.0',
            defaults: {
                gameAdapterId: 'checkers',
                maxTicksPerMatch: 200,
                reportFormat: 'markdown',
            },
        };
        return this.merge(defaults, config);
    }
}
//# sourceMappingURL=config-loader.js.map