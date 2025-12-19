"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
function validateEnv(requiredKeys, options) {
    const missingKeys = new Set();
    const values = {};
    const readEnv = (key) => {
        const value = process.env[key];
        if (value == null || value === '') {
            missingKeys.add(key);
            return;
        }
        values[key] = value;
    };
    if (Array.isArray(requiredKeys)) {
        for (const key of requiredKeys) {
            readEnv(key);
        }
    }
    const allowMissingDatabase = Boolean(options?.allowMissingDatabase);
    if (allowMissingDatabase) {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl && databaseUrl !== '') {
            values.DATABASE_URL = databaseUrl;
        }
        else {
            const pgKeys = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGPORT'];
            for (const key of pgKeys) {
                readEnv(key);
            }
        }
    }
    if (missingKeys.size > 0) {
        throw new Error(`Missing required environment variables: ${Array.from(missingKeys).join(', ')}`);
    }
    return values;
}
//# sourceMappingURL=validateEnv.js.map