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
exports.GNUBGRunnerDebug = void 0;
// src/services/gnubgRunnerDebug.ts
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = new logger_1.Logger('GNUBGRunnerDebug');
class GNUBGRunnerDebug {
    // Test simple pour voir le output brut de GNUBG
    static async testRawOutput() {
        try {
            // Créer un fichier de test simple
            const inputContent = `
new game
set position 1:2 24:-2
set player 0 human
set player 1 human
set dice 3 5
show board
hint
quit
      `.trim();
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const inputFile = path.join(tempDir, 'test_gnubg.txt');
            fs.writeFileSync(inputFile, inputContent);
            try {
                // Exécuter GNUBG avec chemin complet Windows
                const command = '"C:\\Program Files (x86)\\gnubg\\gnubg-cli.exe" -t < "' + inputFile + '"';
                logger.info('Exécution de la commande', { command });
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 10000,
                    cwd: tempDir
                });
                logger.info('=== STDOUT ===', stdout);
                logger.info('=== STDERR ===', stderr);
                return { stdout, stderr };
            }
            finally {
                // Nettoyer
                if (fs.existsSync(inputFile)) {
                    fs.unlinkSync(inputFile);
                }
            }
        }
        catch (error) {
            logger.error('Erreur', error);
            throw error;
        }
    }
}
exports.GNUBGRunnerDebug = GNUBGRunnerDebug;
//# sourceMappingURL=gnubgRunnerDebug.js.map