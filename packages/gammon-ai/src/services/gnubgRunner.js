"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GNUBGRunner = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = new logger_1.Logger('GNUBGRunner');
class GNUBGRunner {
    // Convertir notre BoardState vers format GNUBG
    static boardToGNUBGFormat(board) {
        let gnubgBoard = '';
        // GNUBG format : position:count (positif = white, negatif = black)
        for (let i = 0; i < 24; i++) {
            if (board.positions[i] !== 0) {
                gnubgBoard += `${i}:${board.positions[i]} `;
            }
        }
        // Ajouter bar et off
        if (board.whiteBar > 0)
            gnubgBoard += `bar:${board.whiteBar} `;
        if (board.blackBar > 0)
            gnubgBoard += `bar:${-board.blackBar} `;
        if (board.whiteOff > 0)
            gnubgBoard += `off:${board.whiteOff} `;
        if (board.blackOff > 0)
            gnubgBoard += `off:${-board.blackOff} `;
        return gnubgBoard.trim();
    }
    // Créer un fichier temporaire pour GNUBG
    static async createTempFile(content, extension = '.txt') {
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const filename = `gnubg_${Date.now()}${extension}`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, content);
        return filepath;
    }
    // Nettoyer les fichiers temporaires
    static cleanupTempFile(filepath) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }
        catch (error) {
            logger.warn('Failed to cleanup temp file', error);
        }
    }
    // Obtenir une suggestion de mouvement de GNUBG
    static async getHint(board, dice) {
        try {
            // Convertir board vers format GNUBG
            const boardString = this.boardToGNUBGFormat(board);
            const diceString = dice.join(' ');
            // Créer fichier d'entrée pour GNUBG
            const inputContent = `
new game
set position ${boardString}
set player 0 human
set player 1 human
set dice ${diceString}
hint
quit
      `.trim();
            const inputFile = await this.createTempFile(inputContent);
            try {
                // Exécuter GNUBG avec la commande appropriée
                let command = `gnubg-cli.exe -t < "${inputFile}"`;
                try {
                    const { stdout, stderr } = await execAsync(command, {
                        timeout: 10000,
                        cwd: path.join(__dirname, '../../temp')
                    });
                    if (stderr) {
                        logger.warn('GNUBG warning', stderr);
                    }
                    // Parser le résultat
                    const hint = this.parseHintOutput(stdout);
                    return hint;
                }
                catch (_windowsError) {
                    // Essayer avec chemin complet Windows
                    command = '"C:\\Program Files (x86)\\gnubg\\gnubg-cli.exe" -t < "' + inputFile + '"';
                    const { stdout, stderr } = await execAsync(command, {
                        timeout: 10000,
                        cwd: path.join(__dirname, '../../temp')
                    });
                    if (stderr) {
                        console.warn('GNUBG warning:', stderr);
                    }
                    // Parser le résultat
                    const hint = this.parseHintOutput(stdout);
                    return hint;
                }
            }
            finally {
                this.cleanupTempFile(inputFile);
            }
        }
        catch (error) {
            logger.error('GNUBG error', error);
            throw new Error(`Failed to get hint from GNUBG: ${error}`);
        }
    }
    // Parser le output de GNUBG hint
    static parseHintOutput(output) {
        const lines = output.split('\n');
        let bestMove = '';
        let evaluation = 0.0;
        // Extraire le meilleur mouvement (premier de la liste)
        for (const line of lines) {
            // Format : "1. Cubeful 2-ply    8/3 6/3                      Eq.: +0.075"
            if (line.match(/^\s*1\.\s+Cubeful.*\s+(\d+\/\d+(?:\s+\d+\/\d*)*)\s+.*Eq\.:\s*([+-]?\d+\.?\d*)/)) {
                const match = line.match(/^\s*1\.\s+Cubeful.*\s+(\d+\/\d+(?:\s+\d+\/\d*)*)\s+.*Eq\.:\s*([+-]?\d+\.?\d*)/);
                if (match && match[1] && match[2]) {
                    bestMove = match[1];
                    evaluation = parseFloat(match[2]);
                    break;
                }
            }
        }
        // Convertir le mouvement GNUBG vers notre format
        const move = this.parseGNUBGMove(bestMove);
        return {
            move,
            evaluation,
            confidence: Math.min(Math.abs(evaluation) * 100, 100)
        };
    }
    // Parser un mouvement GNUBG (ex: "8/3 6/3")
    static parseGNUBGMove(gnubgMove) {
        const moves = gnubgMove.split(' ').filter(m => m.trim());
        if (moves.length === 0) {
            // Mouvement par défaut
            return {
                from: 0,
                to: 1,
                player: 'white',
                diceUsed: 1
            };
        }
        // Prendre le premier mouvement pour simplifier
        // Prendre le premier mouvement pour simplifier
        const firstMove = moves[0];
        if (!firstMove) {
            return {
                from: 0,
                to: 1,
                player: 'white',
                diceUsed: 1
            };
        }
        const parts = firstMove.split('/');
        const from = parseInt(parts[0] || '0', 10);
        const to = parseInt(parts[1] || '0', 10);
        if (isNaN(from) || isNaN(to)) {
            return {
                from: 0,
                to: 1,
                player: 'white',
                diceUsed: 1
            };
        }
        return {
            from,
            to,
            player: 'white',
            diceUsed: Math.abs(to - from)
        };
    }
    // Évaluer une position avec GNUBG
    static async evaluatePosition(board) {
        try {
            const boardString = this.boardToGNUBGFormat(board);
            const inputContent = `
set board ${boardString}
evaluate
quit
      `.trim();
            const inputFile = await this.createTempFile(inputContent);
            try {
                let command = `gnubg-cli.exe -t < "${inputFile}"`;
                try {
                    const { stdout } = await execAsync(command, {
                        timeout: 10000,
                        cwd: path.join(__dirname, '../../temp')
                    });
                    return this.parseEvaluationOutput(stdout);
                }
                catch (_windowsError) {
                    // Essayer avec chemin complet Windows
                    command = '"C:\\Program Files (x86)\\gnubg\\gnubg-cli.exe" -t < "' + inputFile + '"';
                    const { stdout } = await execAsync(command, {
                        timeout: 10000,
                        cwd: path.join(__dirname, '../../temp')
                    });
                    return this.parseEvaluationOutput(stdout);
                }
            }
            finally {
                this.cleanupTempFile(inputFile);
            }
        }
        catch (error) {
            logger.error('GNUBG evaluation error', error);
            throw new Error(`Failed to evaluate position: ${error}`);
        }
    }
    // Parser l'évaluation GNUBG
    static parseEvaluationOutput(output) {
        const lines = output.split('\n');
        let equity = 0.0;
        let winProb = 0.5;
        let gammonProb = 0.1;
        let backgammonProb = 0.01;
        for (const line of lines) {
            if (line.includes('Equity:')) {
                const match = line.match(/Equity:\s*([+-]?\d+\.?\d*)/);
                if (match && match[1])
                    equity = parseFloat(match[1]);
            }
            if (line.includes('Win:')) {
                const match = line.match(/Win:\s*(\d+\.?\d*)%/);
                if (match && match[1])
                    winProb = parseFloat(match[1]) / 100;
            }
            if (line.includes('Gammon:')) {
                const match = line.match(/Gammon:\s*(\d+\.?\d*)%/);
                if (match && match[1])
                    gammonProb = parseFloat(match[1]) / 100;
            }
            if (line.includes('Backgammon:')) {
                const match = line.match(/Backgammon:\s*(\d+\.?\d*)%/);
                if (match && match[1])
                    backgammonProb = parseFloat(match[1]) / 100;
            }
        }
        return {
            equity,
            winProbability: winProb,
            gammonProbability: gammonProb,
            backgammonProbability: backgammonProb
        };
    }
    // Analyser une partie complète
    static async analyzeGame(_moves) {
        // TODO: Implémenter l'analyse de partie complète via GNUBG
        return {
            totalError: 0.0,
            errorRate: 0.0,
            criticalMoves: 0,
            analysis: 'Game analysis not yet implemented'
        };
    }
    // Vérifier que GNUBG est installé
    static async checkInstallation() {
        try {
            // Essayer gnubg-cli.exe (Windows) ou gnubg (Linux/Mac)
            let command = 'gnubg-cli.exe --version';
            try {
                const { stdout } = await execAsync(command, { timeout: 5000 });
                return stdout.includes('GNU Backgammon');
            }
            catch (windowsError) {
                // Essayer avec chemin complet Windows
                command = '"C:\\Program Files (x86)\\gnubg\\gnubg-cli.exe" --version';
                const { stdout } = await execAsync(command, { timeout: 5000 });
                return stdout.includes('GNU Backgammon');
            }
        }
        catch (error) {
            return false;
        }
    }
}
exports.GNUBGRunner = GNUBGRunner;
//# sourceMappingURL=gnubgRunner.js.map