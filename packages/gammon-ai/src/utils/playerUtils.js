"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFullPlayer = createFullPlayer;
exports.convertPrismaPlayer = convertPrismaPlayer;
// Convertit un joueur Prisma partiel en Player complet
function createFullPlayer(partialPlayer) {
    return {
        id: partialPlayer.id,
        email: partialPlayer.email,
        name: partialPlayer.name,
        points: partialPlayer.points,
        isPremium: partialPlayer.isPremium ?? false,
        createdAt: partialPlayer.createdAt ?? new Date(),
        updatedAt: partialPlayer.updatedAt ?? new Date()
    };
}
// Convertit un joueur Prisma select en Player complet
function convertPrismaPlayer(prismaPlayer) {
    return {
        id: prismaPlayer.id,
        email: prismaPlayer.email,
        name: prismaPlayer.name,
        points: prismaPlayer.points,
        isPremium: prismaPlayer.isPremium ?? false,
        createdAt: prismaPlayer.createdAt ?? new Date(),
        updatedAt: prismaPlayer.updatedAt ?? new Date()
    };
}
//# sourceMappingURL=playerUtils.js.map