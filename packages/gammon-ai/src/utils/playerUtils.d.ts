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
export declare function createFullPlayer(partialPlayer: MinimalPlayer): Player;
export declare function convertPrismaPlayer(prismaPlayer: MinimalPlayer): Player;
export {};
//# sourceMappingURL=playerUtils.d.ts.map