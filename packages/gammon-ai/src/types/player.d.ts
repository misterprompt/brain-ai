export interface Player {
    id: string;
    name: string;
    email: string;
    points: number;
    isPremium: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare function createPlayer(name: string, email: string): Player;
export declare function canPlayerPlay(player: Player, stake: number): boolean;
export declare function updatePlayerPoints(player: Player, newPoints: number): Player;
//# sourceMappingURL=player.d.ts.map