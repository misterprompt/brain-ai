// src/services/gnubgRunnerDebug.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

const logger = new Logger('GNUBGRunnerDebug');

export class GNUBGRunnerDebug {
  
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
        
      } finally {
        // Nettoyer
        if (fs.existsSync(inputFile)) {
          fs.unlinkSync(inputFile);
        }
      }
      
    } catch (error) {
      logger.error('Erreur', error);
      throw error;
    }
  }
}
