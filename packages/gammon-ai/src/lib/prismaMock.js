"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaMock = void 0;
const logger_1 = require("../utils/logger");
const createPrismaMock = () => {
    logger_1.logger.warn('⚠️  RUNNING IN MOCK DB MODE - No real database connection');
    const mockHandler = {
        get: (target, prop) => {
            if (prop === '$connect')
                return async () => { };
            if (prop === '$disconnect')
                return async () => { };
            if (prop === '$queryRaw')
                return async () => [1];
            // Return a function that returns a promise resolving to empty data or success
            return async (...args) => {
                logger_1.logger.debug(`Mock DB call: ${prop}`, args);
                if (prop === 'count')
                    return 0;
                if (prop === 'findUnique')
                    return null;
                if (prop === 'findFirst')
                    return null;
                if (prop === 'findMany')
                    return [];
                if (prop === 'create')
                    return { id: 'mock-id', ...args[0]?.data };
                if (prop === 'update')
                    return { id: 'mock-id', ...args[0]?.data };
                if (prop === 'upsert')
                    return { id: 'mock-id', ...args[0]?.create };
                return null;
            };
        }
    };
    return new Proxy({}, mockHandler);
};
exports.createPrismaMock = createPrismaMock;
//# sourceMappingURL=prismaMock.js.map