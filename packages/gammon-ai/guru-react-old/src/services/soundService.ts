import { Howl } from 'howler';

// Preload sound files
const sounds = {
  roll: new Howl({ src: ['/sounds/dice-roll.mp3'] }),
  move: new Howl({ src: ['/sounds/checker-move.mp3'] }),
  hit: new Howl({ src: ['/sounds/checker-hit.mp3'] }),
  win: new Howl({ src: ['/sounds/game-win.mp3'] }),
};

const SoundService = {
  playDiceRoll: () => sounds.roll.play(),
  playCheckerMove: () => sounds.move.play(),
  playCheckerHit: () => sounds.hit.play(),
  playGameWin: () => sounds.win.play(),
};

export default SoundService;
