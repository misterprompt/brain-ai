# 🎬 Video Studio

> Génération de vidéos d'avatars parlants 100% open-source

## Engines Supportés

| Engine | Description | Performance |
|--------|-------------|-------------|
| **SadTalker** | Animation 3D réaliste | ⭐⭐⭐⭐⭐ |
| **MuseTalk** | Lip-sync temps réel 30+ FPS | ⭐⭐⭐⭐⭐ |
| **Wav2Lip** | Synchronisation labiale classique | ⭐⭐⭐⭐ |

## Installation

```bash
cd packages/video-studio

# Installer les dépendances
pip install -r requirements.txt

# Installer les modèles (choisir un engine)
python scripts/install_sadtalker.py
python scripts/install_musetalk.py
```

## Usage

```python
from src.avatar_video_generator import AvatarVideoGenerator, AvatarEngine

generator = AvatarVideoGenerator()

# Générer une vidéo
video = await generator.generate(
    image_path="avatar.jpg",
    audio_path="speech.mp3",
    output_path="output.mp4",
    engine=AvatarEngine.SADTALKER
)
```

## Scripts

```bash
# Production complète HeyGen-style
python src/heygen_opensource.py
```

## Documentation

Voir [HEYGEN_OPENSOURCE_GUIDE.md](./HEYGEN_OPENSOURCE_GUIDE.md)
