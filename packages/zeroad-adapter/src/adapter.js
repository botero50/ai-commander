export class ZeroADAdapter {
    constructor(config) {
        this.process = null;
        this.ipcBridge = null;
        this.config = this.validateConfig(config);
    }
    async startGame() {
        throw new Error('Not yet implemented');
    }
    async stopGame() {
        throw new Error('Not yet implemented');
    }
    async getSession() {
        throw new Error('Not yet implemented');
    }
    validateConfig(config) {
        if (!config.gameExecutablePath) {
            throw new Error('gameExecutablePath is required');
        }
        return config;
    }
}
//# sourceMappingURL=adapter.js.map