// src/utils/validator.ts
export class Validator {
  // Valider un email
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Valider un nom de joueur
  static isValidPlayerName(name: string): boolean {
    return name.length >= 3 && name.length <= 20;
  }

  // Valider une mise
  static isValidStake(stake: number, playerPoints: number): boolean {
    return stake >= 200 && stake <= playerPoints;
  }
}
