# 🎬 HEYGEN OPEN SOURCE - Documentation Complète

> **Version**: 1.0.0 | **Dernière mise à jour**: Décembre 2025  
> **Optimisé pour**: Minisforum M1 Pro-285H (Intel Core Ultra)

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Outils Open-Source Intégrés](#outils-open-source-intégrés)
3. [Installation Rapide](#installation-rapide)
4. [Configuration OpenVINO (Intel)](#configuration-openvino-intel)
5. [Utilisation](#utilisation)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

Ce projet fournit une alternative 100% open-source à HeyGen pour créer des vidéos d'avatars parlants. Il combine plusieurs technologies de pointe pour:

- 🎭 **Animer des images statiques** avec synchronisation labiale
- 🗣️ **Générer des voix naturelles** avec Edge-TTS (gratuit)
- 🖼️ **Créer des illustrations** avec IA
- 🎬 **Monter des vidéos** automatiquement

---

## Outils Open-Source Intégrés

### 🏆 Tier 1: Meilleure Qualité

| Outil | GitHub | Description | Performance |
|-------|--------|-------------|-------------|
| **SadTalker** | [OpenTalker/SadTalker](https://github.com/OpenTalker/SadTalker) | Animation 3D réaliste de portraits | ⭐⭐⭐⭐⭐ |
| **MuseTalk** | [TMElyralab/MuseTalk](https://github.com/TMElyralab/MuseTalk) | Lip-sync temps réel 30+ FPS | ⭐⭐⭐⭐⭐ |
| **LatentSync** | [bytedance/LatentSync](https://github.com/bytedance/LatentSync) | Lip-sync haute résolution (ByteDance) | ⭐⭐⭐⭐⭐ |

### 🥈 Tier 2: Bonne Qualité / Rapide

| Outil | GitHub | Description | Performance |
|-------|--------|-------------|-------------|
| **Wav2Lip** | [Rudrabha/Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | Lip-sync classique et fiable | ⭐⭐⭐⭐ |
| **Wav2Lip-HD** | [saifhassan/Wav2Lip-HQ](https://github.com/Markfryazino/wav2lip-HD) | Wav2Lip + GFPGAN haute qualité | ⭐⭐⭐⭐ |
| **EchoMimic** | [BadToBest/EchoMimic](https://github.com/BadToBest/EchoMimic) | Audio + landmarks pour stabilité | ⭐⭐⭐⭐ |

### ⚡ Tier 3: Optimisé Intel / OpenVINO

| Outil | GitHub | Description | Performance |
|-------|--------|-------------|-------------|
| **RealtimeWav2lip** | [devkrish23/realtimeWav2lip](https://github.com/devkrish23/realtimeWav2lip) | Wav2Lip optimisé OpenVINO | ⚡⚡⚡⚡⚡ |
| **OpenVINO Notebooks** | [openvinotoolkit/openvino_notebooks](https://github.com/openvinotoolkit/openvino_notebooks) | Exemples d'optimisation | 📚 |

---

## Installation Rapide

### Prérequis

```bash
# Python 3.10+
python --version

# FFmpeg
scoop install ffmpeg  # Windows
# ou: brew install ffmpeg  # macOS
# ou: apt install ffmpeg  # Linux
```

### 1️⃣ Dépendances Python de Base

```bash
pip install edge-tts httpx replicate ffmpeg-python pillow
```

### 2️⃣ Installation SadTalker (Recommandé)

```bash
# Cloner le repo
git clone https://github.com/OpenTalker/SadTalker.git
cd SadTalker

# Créer l'environnement
conda create -n sadtalker python=3.8
conda activate sadtalker

# Installer PyTorch + CUDA
pip install torch==1.12.1+cu113 torchvision==0.13.1+cu113 torchaudio==0.12.1 --extra-index-url https://download.pytorch.org/whl/cu113

# Dépendances
pip install -r requirements.txt

# Télécharger les modèles (automatique)
python download_models.py
```

**Modèles à télécharger manuellement si nécessaire:**
- `checkpoints/` depuis [Releases](https://github.com/OpenTalker/SadTalker/releases)
- GFPGAN depuis [TencentARC/GFPGAN](https://github.com/TencentARC/GFPGAN)

### 3️⃣ Installation MuseTalk (Temps Réel)

```bash
# Cloner le repo
git clone https://github.com/TMElyralab/MuseTalk.git
cd MuseTalk

# Créer l'environnement
conda create -n musetalk python=3.10
conda activate musetalk

# PyTorch 2.0.1
pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cu118

# Dépendances
pip install -r requirements.txt

# MMLab packages
pip install --no-cache-dir -U openmim
mim install mmengine
mim install "mmcv==2.0.1"
mim install "mmdet==3.1.0"
mim install "mmpose==1.1.0"

# Télécharger les modèles
huggingface-cli download TMElyralab/MuseTalk --local-dir ./models
```

### 4️⃣ Installation Wav2Lip Classique

```bash
git clone https://github.com/Rudrabha/Wav2Lip.git
cd Wav2Lip

pip install -r requirements.txt
pip install face_alignment

# Télécharger le modèle wav2lip_gan.pth
# Depuis: https://github.com/Rudrabha/Wav2Lip#getting-the-weights
```

---

## Configuration OpenVINO (Intel)

**Optimisé pour Minisforum M1 Pro-285H avec Intel Core Ultra 285H**

### Installation OpenVINO

```bash
pip install openvino openvino-dev[pytorch] nncf

# Vérifier l'installation
python -c "from openvino import Core; print(Core().available_devices)"
# Devrait afficher: ['CPU', 'GPU', 'NPU']  # NPU si Core Ultra
```

### Wav2Lip OpenVINO

```bash
# Cloner la version OpenVINO
git clone https://github.com/devkrish23/realtimeWav2lip.git
cd realtimeWav2lip

pip install -r requirements.txt

# Convertir le modèle en format OpenVINO IR
python convert_to_openvino.py
```

### Configuration de l'Accélérateur

```python
from avatar_video_generator import AvatarConfig, AvatarEngine

config = AvatarConfig(
    engine=AvatarEngine.WAV2LIP_OPENVINO,
    openvino_device="AUTO",  # AUTO, CPU, GPU, NPU
    openvino_precision="FP16",  # FP32, FP16, INT8
)
```

**Devices disponibles sur Core Ultra:**
- `CPU` - Intel Core Ultra (multi-thread)
- `GPU` - Intel Arc Graphics intégré
- `NPU` - Neural Processing Unit (le plus rapide pour l'IA)

---

## Utilisation

### Script Simple

```python
import asyncio
from heygen_opensource import HeyGenOpenSource, VideoConfig

async def main():
    # Configuration
    config = VideoConfig(
        voice="fr-FR-VivienneMultilingualNeural",
        use_real_photo=True,
    )
    
    # Créer le producteur
    producer = HeyGenOpenSource(config)
    
    # Produire une vidéo
    video_path = await producer.produce_video(
        topic="5 astuces IA que vous devez connaître",
        avatar_style="professional_woman"
    )
    
    print(f"Vidéo créée: {video_path}")

asyncio.run(main())
```

### Utilisation Directe du Générateur d'Avatar

```python
from backend.services.avatar_video_generator import AvatarVideoGenerator, AvatarEngine

async def animate_portrait():
    generator = AvatarVideoGenerator()
    
    # Générer l'audio
    audio = await generator.generate_tts_audio(
        "Bonjour, je suis votre avatar parlant!",
        "speech.mp3"
    )
    
    # Animer le portrait
    video = await generator.generate(
        image_path="portrait.jpg",
        audio_path="speech.mp3",
        output_path="output.mp4",
        engine=AvatarEngine.SADTALKER
    )
    
    return video
```

### Production en Batch

```python
async def batch_production():
    producer = HeyGenOpenSource()
    
    topics = [
        {"id": 1, "title": "L'IA en 2025"},
        {"id": 2, "title": "Bitcoin expliqué"},
        {"id": 3, "title": "Productivité maximale"},
    ]
    
    videos = await producer.batch_produce(topics, start_id=1)
    print(f"Produites: {len(videos)} vidéos")
```

---

## API Reference

### AvatarEngine (Enum)

| Valeur | Description |
|--------|-------------|
| `SADTALKER` | SadTalker local |
| `MUSETALK` | MuseTalk local (temps réel) |
| `WAV2LIP` | Wav2Lip standard |
| `WAV2LIP_OPENVINO` | Wav2Lip optimisé Intel |
| `ECHOMIMIC` | EchoMimic (audio + landmarks) |
| `LATENTSYNC` | LatentSync (ByteDance) |
| `REPLICATE_SADTALKER` | SadTalker cloud (fallback) |

### AvatarConfig

```python
@dataclass
class AvatarConfig:
    engine: AvatarEngine = AvatarEngine.SADTALKER
    models_dir: Path = Path("D:/AI_Models/avatar")
    resolution: tuple = (512, 512)
    fps: int = 25
    use_enhancer: bool = True  # GFPGAN
    
    # SadTalker
    preprocess: str = "crop"
    still_mode: bool = True
    expression_scale: float = 1.0
    
    # MuseTalk
    musetalk_bbox_shift: int = 0
    musetalk_use_float16: bool = True
    
    # OpenVINO
    openvino_device: str = "AUTO"
    openvino_precision: str = "FP16"
    
    # TTS
    tts_voice: str = "fr-FR-VivienneMultilingualNeural"
    tts_rate: str = "-5%"
```

### AvatarVideoGenerator Methods

| Méthode | Description |
|---------|-------------|
| `generate(image, audio, output, engine)` | Génère une vidéo d'avatar |
| `generate_tts_audio(text, output, voice)` | Génère l'audio TTS |
| `enhance_video(video, output)` | Améliore la qualité du visage |
| `install_engine(engine)` | Installe un moteur automatiquement |
| `get_status()` | Retourne l'état de tous les moteurs |

---

## Troubleshooting

### ❌ "CUDA out of memory"

```bash
# Réduire la résolution
config.resolution = (256, 256)

# Ou utiliser CPU/OpenVINO
config.engine = AvatarEngine.WAV2LIP_OPENVINO
```

### ❌ "Model not found"

```bash
# Vérifier le chemin des modèles
ls D:/AI_Models/avatar/SadTalker/checkpoints/

# Télécharger manuellement
cd SadTalker
python download_models.py
```

### ❌ "FFmpeg not found"

```bash
# Windows
scoop install ffmpeg
# OU
choco install ffmpeg

# Vérifier
ffmpeg -version
```

### ❌ "OpenVINO device not available"

```python
# Lister les devices disponibles
from openvino import Core
core = Core()
print(core.available_devices)

# Utiliser CPU si GPU/NPU non disponible
config.openvino_device = "CPU"
```

### ❌ "Edge-TTS timeout"

```bash
# Réinstaller edge-tts
pip uninstall edge-tts
pip install edge-tts --upgrade

# Tester
edge-tts --voice "fr-FR-VivienneMultilingualNeural" --text "Test" --write-media test.mp3
```

---

## 📚 Ressources Additionnelles

### Documentation Officielle

- [SadTalker Paper](https://arxiv.org/abs/2211.12194) - CVPR 2023
- [MuseTalk Paper](https://arxiv.org/abs/2404.02037) - Tencent
- [Wav2Lip Paper](https://arxiv.org/abs/2008.10010) - ACM MM 2020
- [OpenVINO Documentation](https://docs.openvino.ai/)

### Tutoriels Vidéo

- [SadTalker Tutorial (EN)](https://www.youtube.com/watch?v=9XN_36kNDJM)
- [MuseTalk Setup Guide](https://www.youtube.com/watch?v=example)
- [OpenVINO Optimization](https://www.youtube.com/watch?v=example)

### Communauté

- [SadTalker Discord](https://discord.gg/sadtalker)
- [OpenVINO Forum](https://community.intel.com/t5/OpenVINO)
- [HuggingFace Spaces](https://huggingface.co/spaces)

---

## 🎯 Prochaines Étapes

1. [ ] Intégration LivePortrait pour animations plus naturelles
2. [ ] Support multi-langues automatique
3. [ ] Interface WebUI (Gradio)
4. [ ] Pipeline de production YouTube automatisé
5. [ ] Optimisation NPU pour Core Ultra

---

**Créé avec ❤️ pour le projet WikiAsk**

*Dernière mise à jour: Décembre 2025*
