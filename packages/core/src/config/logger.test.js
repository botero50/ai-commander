import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Logger } from './logger.js';
test('Logger - debug level logs all messages', () => {
    const logger = new Logger('debug', 'TestLogger');
    const output = [];
    const originalLog = console.log;
    console.log = (msg) => output.push(msg);
    try {
        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');
        assert.equal(output.length, 4);
        assert(output[0].includes('DEBUG'));
        assert(output[1].includes('INFO'));
        assert(output[2].includes('WARN'));
        assert(output[3].includes('ERROR'));
    }
    finally {
        console.log = originalLog;
    }
});
test('Logger - info level skips debug', () => {
    const logger = new Logger('info', 'TestLogger');
    const output = [];
    const originalLog = console.log;
    console.log = (msg) => output.push(msg);
    try {
        logger.debug('debug message');
        logger.info('info message');
        assert.equal(output.length, 1);
        assert(output[0].includes('INFO'));
    }
    finally {
        console.log = originalLog;
    }
});
test('Logger - includes context in message', () => {
    const logger = new Logger('info', 'CustomContext');
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => (output = msg);
    try {
        logger.info('test message');
        assert(output.includes('CustomContext'));
        assert(output.includes('INFO'));
        assert(output.includes('test message'));
    }
    finally {
        console.log = originalLog;
    }
});
//# sourceMappingURL=logger.test.js.map