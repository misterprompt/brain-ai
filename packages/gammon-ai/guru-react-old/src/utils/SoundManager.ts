import { Howl } from 'howler';

class SoundManager {
    private static instance: SoundManager;
    private sounds: Record<string, Howl> = {};
    private enabled: boolean = true;

    private constructor() {
        this.loadSounds();
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private loadSounds() {
        // Using placeholder URLs - in a real app these would be local assets
        // For now, we'll use some reliable CDN hosted sounds or base64 if needed
        // Ideally, these should be in /public/sounds/

        this.sounds = {
            diceRoll: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'], // Dice shake/roll
                volume: 0.5
            }),
            checkerMove: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], // Wood click/slide
                volume: 0.4
            }),
            checkerHit: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'], // Sharper click
                volume: 0.6
            }),
            gameStart: new Howl({
                src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], // Soft chime
                volume: 0.5
            })
        };
    }

    public play(soundName: 'diceRoll' | 'checkerMove' | 'checkerHit' | 'gameStart') {
        if (!this.enabled) return;

        const sound = this.sounds[soundName];
        if (sound) {
            // Add slight random pitch variation for realism
            const rate = 0.95 + Math.random() * 0.1;
            sound.rate(rate);
            sound.play();
        }
    }

    public toggleSound(enabled: boolean) {
        this.enabled = enabled;
    }
}

export const soundManager = SoundManager.getInstance();
