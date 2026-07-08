import { describe, it, expect } from 'vitest';
import { PresetLoader } from './preset-loader.js';
describe('PresetLoader', () => {
    describe('listPresets', () => {
        it('should list all presets', () => {
            const presets = PresetLoader.listPresets();
            expect(presets.length).toBeGreaterThan(0);
        });
        it('should include ollama-vs-ollama preset', () => {
            const presets = PresetLoader.listPresets();
            const ollama = presets.find((p) => p.name === 'Ollama vs Ollama');
            expect(ollama).toBeDefined();
        });
        it('should include multi-llm preset', () => {
            const presets = PresetLoader.listPresets();
            const multiLlm = presets.find((p) => p.name === 'Multi-LLM Arena');
            expect(multiLlm).toBeDefined();
        });
    });
    describe('loadPreset', () => {
        it('should load ollama-vs-ollama preset', () => {
            const preset = PresetLoader.loadPreset('ollama-vs-ollama');
            expect(preset).not.toBeNull();
            expect(preset?.brains).toEqual(['Ollama', 'Ollama']);
        });
        it('should load multi-llm preset', () => {
            const preset = PresetLoader.loadPreset('multi-llm');
            expect(preset).not.toBeNull();
            expect(preset?.brains).toContain('Claude');
            expect(preset?.brains).toContain('GPT');
        });
        it('should return null for non-existent preset', () => {
            const preset = PresetLoader.loadPreset('non-existent');
            expect(preset).toBeNull();
        });
        it('should load quick-match preset', () => {
            const preset = PresetLoader.loadPreset('quick-match');
            expect(preset?.maxTicks).toBe(1000);
        });
        it('should load long-match preset', () => {
            const preset = PresetLoader.loadPreset('long-match');
            expect(preset?.maxTicks).toBe(10000);
        });
    });
    describe('getPresetNames', () => {
        it('should return all preset names', () => {
            const names = PresetLoader.getPresetNames();
            expect(names).toContain('ollama-vs-ollama');
            expect(names).toContain('multi-llm');
            expect(names).toContain('builtin-vs-ollama');
            expect(names).toContain('quick-match');
            expect(names).toContain('long-match');
        });
        it('should have at least 5 presets', () => {
            const names = PresetLoader.getPresetNames();
            expect(names.length).toBeGreaterThanOrEqual(5);
        });
    });
    describe('createPreset', () => {
        it('should create a custom preset', () => {
            const preset = PresetLoader.createPreset('custom', {
                name: 'My Custom Preset',
                description: 'A custom tournament',
                brains: ['Brain1', 'Brain2', 'Brain3'],
                maxTicks: 7500,
            });
            expect(preset.name).toBe('My Custom Preset');
            expect(preset.brains).toEqual(['Brain1', 'Brain2', 'Brain3']);
            expect(preset.maxTicks).toBe(7500);
        });
        it('should use defaults if not specified', () => {
            const preset = PresetLoader.createPreset('empty', {});
            expect(preset.brains).toEqual(['Ollama', 'Ollama']);
            expect(preset.description).toBe('');
        });
        it('should allow partial overrides', () => {
            const preset = PresetLoader.createPreset('partial', {
                brains: ['Ollama', 'Claude'],
            });
            expect(preset.brains).toEqual(['Ollama', 'Claude']);
            expect(preset.name).toBe('partial');
        });
    });
    describe('validatePreset', () => {
        it('should validate correct preset', () => {
            const preset = {
                name: 'Test',
                description: 'Test preset',
                brains: ['Brain1', 'Brain2'],
                maxTicks: 5000,
            };
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(true);
        });
        it('should reject preset with fewer than 2 brains', () => {
            const preset = {
                name: 'Test',
                description: 'Test',
                brains: ['Brain1'],
            };
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 2 brains');
        });
        it('should reject preset with maxTicks less than 100', () => {
            const preset = {
                name: 'Test',
                description: 'Test',
                brains: ['Brain1', 'Brain2'],
                maxTicks: 50,
            };
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 100');
        });
        it('should accept valid parallel value', () => {
            const preset = {
                name: 'Test',
                description: 'Test',
                brains: ['Brain1', 'Brain2'],
                parallel: 4,
            };
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(true);
        });
        it('should accept valid maxTicks', () => {
            const preset = {
                name: 'Test',
                description: 'Test',
                brains: ['Brain1', 'Brain2'],
                maxTicks: 100,
            };
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(true);
        });
    });
    describe('preset details', () => {
        it('ollama-vs-ollama should be valid', () => {
            const preset = PresetLoader.loadPreset('ollama-vs-ollama');
            expect(preset).not.toBeNull();
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(true);
        });
        it('multi-llm should be valid', () => {
            const preset = PresetLoader.loadPreset('multi-llm');
            expect(preset).not.toBeNull();
            const result = PresetLoader.validatePreset(preset);
            expect(result.valid).toBe(true);
        });
        it('multi-llm should have 3 brains', () => {
            const preset = PresetLoader.loadPreset('multi-llm');
            expect(preset?.brains).toHaveLength(3);
        });
    });
});
//# sourceMappingURL=preset-loader.test.js.map