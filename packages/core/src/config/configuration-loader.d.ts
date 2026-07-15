import { ZeroADConfiguration } from '../types/configuration.js';
export declare class ConfigurationLoader {
    static load(overrides?: Partial<ZeroADConfiguration>): ZeroADConfiguration;
    private static loadFromEnvironment;
    private static validate;
    private static isValidLogLevel;
}
//# sourceMappingURL=configuration-loader.d.ts.map