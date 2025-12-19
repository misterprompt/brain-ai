"use strict";
// src/types/player.ts
// Types pour les joueurs de GammonGuru
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlayer = createPlayer;
exports.canPlayerPlay = canPlayerPlay;
exports.updatePlayerPoints = updatePlayerPoints;
// Fonction helper pour créer un joueur
function createPlayer(name, email) {
    return {
        id: crypto.randomUUID(), // Génère un UUID unique
        name,
        email,
        points: 500, // Points de départ pour les nouveaux joueurs
        isPremium: false, // Par défaut, pas premium
        createdAt: new Date(),
        updatedAt: new Date()
    };
}
// Fonction pour vérifier si un joueur peut jouer
function canPlayerPlay(player, stake) {
    return player.points >= stake;
}
// Fonction pour mettre à jour les points d'un joueur
function updatePlayerPoints(player, newPoints) {
    return {
        ...player,
        points: newPoints,
        updatedAt: new Date()
    };
}
//# sourceMappingURL=player.js.map