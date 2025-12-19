"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helper = void 0;
// src/utils/helper.ts
class Helper {
    // Générer un ID unique
    static generateId() {
        return crypto.randomUUID();
    }
    // Formater une date
    static formatDate(date) {
        return date.toISOString().split('T')[0] ?? '';
    }
    // Calculer le temps écoulé
    static timeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60)
            return `${seconds} seconds ago`;
        if (seconds < 3600)
            return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400)
            return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }
    // Arrondir un nombre
    static round(num, decimals = 2) {
        return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
    }
}
exports.Helper = Helper;
//# sourceMappingURL=helper.js.map