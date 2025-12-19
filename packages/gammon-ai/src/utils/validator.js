"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
// src/utils/validator.ts
class Validator {
    // Valider un email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    // Valider un nom de joueur
    static isValidPlayerName(name) {
        return name.length >= 3 && name.length <= 20;
    }
    // Valider une mise
    static isValidStake(stake, playerPoints) {
        return stake >= 200 && stake <= playerPoints;
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map