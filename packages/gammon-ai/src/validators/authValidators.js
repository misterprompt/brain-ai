"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Name is required'),
    email: zod_1.z.string().trim().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long')
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
const refreshTokenField = zod_1.z.string().min(1, 'refreshToken is required');
exports.refreshSchema = zod_1.z.object({
    refreshToken: refreshTokenField
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: refreshTokenField
});
//# sourceMappingURL=authValidators.js.map