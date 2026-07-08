export function isValidGameCommand(cmd) {
    if (!cmd || typeof cmd !== 'object')
        return false;
    const c = cmd;
    if (!c.type || typeof c.type !== 'string')
        return false;
    if (!c.id || typeof c.id !== 'string')
        return false;
    if (typeof c.playerId !== 'number')
        return false;
    if (typeof c.timestamp !== 'number')
        return false;
    const validTypes = [
        'move',
        'attack',
        'gather',
        'build',
        'train',
        'patrol',
        'repair',
        'stop',
    ];
    return validTypes.includes(c.type);
}
export function createCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=command-types.js.map