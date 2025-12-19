// src/utils/playerUtils.ts
import { Player } from '../types/player';

type MinimalPlayer = {
  id: string;
  email: string;
  name: string;
  points: number;
  isPremium?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

// Convertit un joueur Prisma partiel en Player complet
export function createFullPlayer(partialPlayer: MinimalPlayer): Player {
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
export function convertPrismaPlayer(prismaPlayer: MinimalPlayer): Player {
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
