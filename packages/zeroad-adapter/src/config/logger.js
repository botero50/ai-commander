const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
export class Logger {
    level;
    context;
    constructor(level = 'info', context = 'ZeroADAdapter') {
        this.level = level;
        this.context = context;
    }
    debug(message, data) {
        if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
            console.log(`[${this.context}:DEBUG] ${message}`, data || '');
        }
    }
    info(message, data) {
        if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
            console.log(`[${this.context}:INFO] ${message}`, data || '');
        }
    }
    warn(message, data) {
        if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
            console.warn(`[${this.context}:WARN] ${message}`, data || '');
        }
    }
    error(message, error) {
        if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
            console.error(`[${this.context}:ERROR] ${message}`, error || '');
        }
    }
}
//# sourceMappingURL=logger.js.map