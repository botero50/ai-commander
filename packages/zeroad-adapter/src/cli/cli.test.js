import { describe, it, expect, beforeEach } from 'vitest';
import { CLI } from './cli.js';
describe('CLI', () => {
    let cli;
    beforeEach(() => {
        cli = new CLI();
    });
    describe('parseArgs', () => {
        it('should parse match start command', () => {
            const result = cli.parseArgs(['node', 'script.js', 'match', 'start', '--brain1', 'Ollama']);
            expect(result.command).toBe('match:start');
            expect(result.args).toEqual(['--brain1', 'Ollama']);
        });
        it('should parse tournament run command', () => {
            const result = cli.parseArgs(['node', 'script.js', 'tournament', 'run', '--brains', 'Ollama,Claude']);
            expect(result.command).toBe('tournament:run');
            expect(result.args).toEqual(['--brains', 'Ollama,Claude']);
        });
        it('should parse config preset command', () => {
            const result = cli.parseArgs(['node', 'script.js', 'config', 'preset', 'list']);
            expect(result.command).toBe('config:preset');
            expect(result.args).toEqual(['list']);
        });
        it('should parse replay export command', () => {
            const result = cli.parseArgs(['node', 'script.js', 'replay', 'export', 'match-001']);
            expect(result.command).toBe('replay:export');
            expect(result.args).toEqual(['match-001']);
        });
        it('should default to help when no command', () => {
            const result = cli.parseArgs(['node', 'script.js']);
            expect(result.command).toBe('help');
        });
        it('should handle simple commands', () => {
            const result = cli.parseArgs(['node', 'script.js', 'help']);
            expect(result.command).toBe('help');
        });
        it('should handle version command', () => {
            const result = cli.parseArgs(['node', 'script.js', 'version']);
            expect(result.command).toBe('version');
        });
    });
    describe('command registration', () => {
        it('should register and run a command', async () => {
            let called = false;
            cli.register({
                name: 'test-cmd',
                description: 'Test command',
                handler: async () => {
                    called = true;
                    return 0;
                },
            });
            const result = await cli.run(['node', 'script.js', 'test-cmd']);
            expect(called).toBe(true);
            expect(result).toBe(0);
        });
        it('should pass arguments to command handler', async () => {
            let receivedArgs = [];
            cli.register({
                name: 'test-cmd',
                description: 'Test command',
                handler: async (args) => {
                    receivedArgs = args;
                    return 0;
                },
            });
            await cli.run(['node', 'script.js', 'test-cmd', '--option', 'value']);
            expect(receivedArgs).toEqual(['--option', 'value']);
        });
        it('should return non-zero on unknown command', async () => {
            const result = await cli.run(['node', 'script.js', 'unknown-command']);
            expect(result).toBe(1);
        });
        it('should handle command errors', async () => {
            cli.register({
                name: 'error-cmd',
                description: 'Error command',
                handler: async () => {
                    throw new Error('Test error');
                },
            });
            const result = await cli.run(['node', 'script.js', 'error-cmd']);
            expect(result).toBe(1);
        });
    });
    describe('help command', () => {
        it('should list registered commands', async () => {
            cli.register({
                name: 'custom-cmd',
                description: 'Custom command',
                handler: async () => 0,
            });
            // Just verify help command exists and doesn't crash
            const result = await cli.run(['node', 'script.js', 'help']);
            expect(result).toBe(0);
        });
    });
    describe('version command', () => {
        it('should return version', async () => {
            const result = await cli.run(['node', 'script.js', 'version']);
            expect(result).toBe(0);
        });
    });
});
//# sourceMappingURL=cli.test.js.map