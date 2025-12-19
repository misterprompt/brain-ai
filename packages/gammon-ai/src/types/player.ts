// src/types/player.ts
// Types pour les joueurs de GammonGuru

export interface Player {
  id: string;           // Identifiant unique (UUID)
  name: string;         // Nom du joueur
  email: string;        // Email pour connexion
  points: number;       // Points disponibles pour jouer
  isPremium: boolean;   // Abonnement premium activé ?
  createdAt: Date;      // Date de création du compte
  updatedAt: Date;      // Dernière mise à jour
}

// Fonction helper pour créer un joueur
export function createPlayer(name: string, email: string): Player {
  return {
    id: crypto.randomUUID(), // Génère un UUID unique
    name,
    email,
    points: 500,        // Points de départ pour les nouveaux joueurs
    isPremium: false,   // Par défaut, pas premium
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Fonction pour vérifier si un joueur peut jouer
export function canPlayerPlay(player: Player, stake: number): boolean {
  return player.points >= stake;
}

// Fonction pour mettre à jour les points d'un joueur
export function updatePlayerPoints(player: Player, newPoints: number): Player {
  return {
    ...player,
    points: newPoints,
    updatedAt: new Date()
  };
}
