# -*- coding: utf-8 -*-
"""
🎭 AVATAR VIDEO GENERATOR - Open Source HeyGen Alternative
============================================================
Génère des vidéos d'avatars parlants ultra-réalistes en local.

🔧 OUTILS INTÉGRÉS:
- SadTalker: Animation de portraits statiques avec audio
- MuseTalk: Lip-sync temps réel haute qualité (30+ FPS)
- Wav2Lip: Synchronisation labiale précise
- EchoMimic: Portraits animés par audio + landmarks
- LatentSync: Lip-sync par diffusion latente (ByteDance)

⚡ OPTIMISATIONS:
- OpenVINO pour accélération Intel CPU/GPU
- Support Minisforum M1 Pro-285H (Core Ultra)
- Mode batch pour production en masse

📚 DOCUMENTATION OFFICIELLE:
- SadTalker: https://github.com/OpenTalker/SadTalker
- MuseTalk: https://github.com/TMElyralab/MuseTalk
- Wav2Lip: https://github.com/Rudrabha/Wav2Lip
- EchoMimic: https://github.com/BadToBest/EchoMimic
- LatentSync: https://github.com/bytedance/LatentSync
"""

import os
import sys
import asyncio
import subprocess
import json
import logging
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass, field
from enum import Enum
import httpx

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AvatarVideoGenerator")

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

class AvatarEngine(Enum):
    """Moteurs de génération d'avatar disponibles."""
    SADTALKER = "sadtalker"
    MUSETALK = "musetalk"
    WAV2LIP = "wav2lip"
    WAV2LIP_OPENVINO = "wav2lip_openvino"  # Optimisé Intel
    ECHOMIMIC = "echomimic"
    LATENTSYNC = "latentsync"
    REPLICATE_SADTALKER = "replicate_sadtalker"  # Cloud fallback

@dataclass
class AvatarConfig:
    """Configuration pour la génération d'avatar."""
    # Moteur par défaut
    engine: AvatarEngine = AvatarEngine.SADTALKER
    
    # Chemins des modèles locaux
    models_dir: Path = field(default_factory=lambda: Path("D:/AI_Models/avatar"))
    
    # Options de qualité
    resolution: tuple = (512, 512)  # SadTalker standard
    fps: int = 25
    use_enhancer: bool = True  # GFPGAN pour améliorer le visage
    
    # Options SadTalker
    preprocess: str = "crop"  # crop, resize, full, extcrop, extfull
    still_mode: bool = True  # Moins de mouvements de tête
    expression_scale: float = 1.0
    
    # Options MuseTalk
    musetalk_bbox_shift: int = 0
    musetalk_use_float16: bool = True
    
    # Options OpenVINO (pour Wav2Lip optimisé)
    openvino_device: str = "CPU"  # CPU, GPU, AUTO
    openvino_precision: str = "FP16"  # FP32, FP16, INT8
    
    # API Cloud (fallback)
    replicate_token: str = ""
    
    # TTS
    tts_voice: str = "fr-FR-VivienneMultilingualNeural"
    tts_rate: str = "-5%"

# ══════════════════════════════════════════════════════════════════════════════
# INSTALLATION & SETUP AUTOMATIQUE
# ══════════════════════════════════════════════════════════════════════════════

GITHUB_REPOS = {
    "sadtalker": {
        "url": "https://github.com/OpenTalker/SadTalker.git",
        "requirements": ["torch==1.12.1", "torchvision==0.13.1", "torchaudio==0.12.1", 
                        "face_alignment", "imageio", "imageio-ffmpeg", "librosa", "scipy", 
                        "kornia", "yacs", "pydub", "gfpgan"],
        "models_url": "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/",
        "model_files": ["mapping_00109-model.pth.tar", "mapping_00229-model.pth.tar", 
                       "SadTalker_V0.0.2_256.safetensors", "SadTalker_V0.0.2_512.safetensors"]
    },
    "musetalk": {
        "url": "https://github.com/TMElyralab/MuseTalk.git",
        "requirements": ["torch==2.0.1", "torchvision==0.15.2", "torchaudio==2.0.2",
                        "diffusers", "mmcv==2.0.1", "mmdet==3.1.0", "mmpose==1.1.0",
                        "opencv-python", "transformers", "accelerate"],
        "models_huggingface": "TMElyralab/MuseTalk"
    },
    "wav2lip": {
        "url": "https://github.com/Rudrabha/Wav2Lip.git",
        "requirements": ["librosa", "opencv-python", "face_alignment", "scipy"],
        "models_url": "https://iiitaphyd-my.sharepoint.com/",  # Weights from original repo
    },
    "wav2lip_openvino": {
        "url": "https://github.com/devkrish23/realtimeWav2lip.git",
        "requirements": ["openvino", "openvino-dev", "pyaudio", "flask"],
        "openvino_optimized": True
    },
    "echomimic": {
        "url": "https://github.com/BadToBest/EchoMimic.git",
        "requirements": ["torch", "torchvision", "diffusers", "transformers", 
                        "accelerate", "omegaconf", "einops"],
        "models_huggingface": "BadToBest/EchoMimic"
    },
    "latentsync": {
        "url": "https://github.com/bytedance/LatentSync.git",
        "requirements": ["torch", "diffusers", "transformers", "accelerate"],
        "models_huggingface": "chunyu-li/LatentSync"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# SERVICE PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

class AvatarVideoGenerator:
    """
    Générateur de vidéos d'avatars parlants multi-moteur.
    
    Exemple d'utilisation:
    ```python
    generator = AvatarVideoGenerator()
    video_path = await generator.generate(
        image_path="avatar.jpg",
        audio_path="speech.mp3",
        output_path="output.mp4",
        engine=AvatarEngine.SADTALKER
    )
    ```
    """
    
    def __init__(self, config: Optional[AvatarConfig] = None):
        self.config = config or AvatarConfig()
        self.installed_engines: Dict[str, bool] = {}
        self._check_installations()
    
    def _check_installations(self):
        """Vérifie quels moteurs sont installés."""
        for engine in AvatarEngine:
            self.installed_engines[engine.value] = self._is_engine_installed(engine)
        
        logger.info(f"Moteurs disponibles: {[k for k, v in self.installed_engines.items() if v]}")
    
    def _is_engine_installed(self, engine: AvatarEngine) -> bool:
        """Vérifie si un moteur est installé."""
        engine_paths = {
            AvatarEngine.SADTALKER: self.config.models_dir / "SadTalker",
            AvatarEngine.MUSETALK: self.config.models_dir / "MuseTalk",
            AvatarEngine.WAV2LIP: self.config.models_dir / "Wav2Lip",
            AvatarEngine.WAV2LIP_OPENVINO: self.config.models_dir / "realtimeWav2lip",
            AvatarEngine.ECHOMIMIC: self.config.models_dir / "EchoMimic",
            AvatarEngine.LATENTSYNC: self.config.models_dir / "LatentSync",
        }
        
        if engine == AvatarEngine.REPLICATE_SADTALKER:
            return bool(self.config.replicate_token or os.getenv("REPLICATE_API_TOKEN"))
        
        path = engine_paths.get(engine)
        return path and path.exists()
    
    # ──────────────────────────────────────────────────────────────────────────
    # INSTALLATION AUTOMATIQUE
    # ──────────────────────────────────────────────────────────────────────────
    
    async def install_engine(self, engine: AvatarEngine) -> bool:
        """
        Installe automatiquement un moteur d'avatar.
        
        Args:
            engine: Le moteur à installer
            
        Returns:
            True si l'installation a réussi
        """
        if engine == AvatarEngine.REPLICATE_SADTALKER:
            logger.info("Replicate ne nécessite pas d'installation locale")
            return True
        
        engine_name = engine.value.replace("_openvino", "")
        if engine == AvatarEngine.WAV2LIP_OPENVINO:
            engine_name = "wav2lip_openvino"
        
        repo_info = GITHUB_REPOS.get(engine_name)
        if not repo_info:
            logger.error(f"Configuration manquante pour {engine_name}")
            return False
        
        install_dir = self.config.models_dir / engine_name.replace("_openvino", "").title()
        if engine == AvatarEngine.WAV2LIP_OPENVINO:
            install_dir = self.config.models_dir / "realtimeWav2lip"
        
        logger.info(f"Installation de {engine_name} dans {install_dir}...")
        
        try:
            # 1. Créer le dossier
            install_dir.mkdir(parents=True, exist_ok=True)
            
            # 2. Cloner le repo
            if not (install_dir / ".git").exists():
                cmd = f'git clone {repo_info["url"]} "{install_dir}"'
                process = await asyncio.create_subprocess_shell(
                    cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                await process.communicate()
            
            # 3. Installer les requirements
            requirements = repo_info.get("requirements", [])
            if requirements:
                pip_cmd = f'pip install {" ".join(requirements)}'
                process = await asyncio.create_subprocess_shell(
                    pip_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )
                await process.communicate()
            
            # 4. Télécharger les modèles
            if "models_huggingface" in repo_info:
                await self._download_huggingface_models(repo_info["models_huggingface"], install_dir)
            
            self.installed_engines[engine.value] = True
            logger.info(f"✅ {engine_name} installé avec succès!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur installation {engine_name}: {e}")
            return False
    
    async def _download_huggingface_models(self, repo_id: str, target_dir: Path):
        """Télécharge les modèles depuis HuggingFace."""
        try:
            cmd = f'huggingface-cli download {repo_id} --local-dir "{target_dir}/models"'
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
        except Exception as e:
            logger.warning(f"Téléchargement HuggingFace échoué: {e}")
    
    async def install_openvino_optimization(self) -> bool:
        """
        Installe l'optimisation OpenVINO pour Wav2Lip.
        Optimisé pour Intel Core Ultra / Minisforum M1 Pro.
        """
        logger.info("Installation OpenVINO pour accélération Intel...")
        
        try:
            # Installer OpenVINO
            cmd = "pip install openvino openvino-dev[pytorch] nncf"
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            
            logger.info("✅ OpenVINO installé!")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur installation OpenVINO: {e}")
            return False
    
    # ──────────────────────────────────────────────────────────────────────────
    # GÉNÉRATION VIDÉO
    # ──────────────────────────────────────────────────────────────────────────
    
    async def generate(
        self,
        image_path: str | Path,
        audio_path: str | Path,
        output_path: str | Path,
        engine: Optional[AvatarEngine] = None,
        **kwargs
    ) -> Optional[Path]:
        """
        Génère une vidéo d'avatar parlant.
        
        Args:
            image_path: Chemin vers l'image du visage
            audio_path: Chemin vers l'audio de la voix
            output_path: Chemin de sortie pour la vidéo
            engine: Moteur à utiliser (auto-sélection si None)
            **kwargs: Options supplémentaires spécifiques au moteur
            
        Returns:
            Path vers la vidéo générée, ou None si échec
        """
        image_path = Path(image_path)
        audio_path = Path(audio_path)
        output_path = Path(output_path)
        
        # Auto-sélection du meilleur moteur disponible
        if engine is None:
            engine = self._select_best_engine()
        
        if not self.installed_engines.get(engine.value, False):
            logger.warning(f"{engine.value} non installé, utilisation de Replicate...")
            engine = AvatarEngine.REPLICATE_SADTALKER
        
        logger.info(f"🎭 Génération avec {engine.value}...")
        
        # Dispatch vers le bon générateur
        generators = {
            AvatarEngine.SADTALKER: self._generate_sadtalker,
            AvatarEngine.MUSETALK: self._generate_musetalk,
            AvatarEngine.WAV2LIP: self._generate_wav2lip,
            AvatarEngine.WAV2LIP_OPENVINO: self._generate_wav2lip_openvino,
            AvatarEngine.ECHOMIMIC: self._generate_echomimic,
            AvatarEngine.LATENTSYNC: self._generate_latentsync,
            AvatarEngine.REPLICATE_SADTALKER: self._generate_replicate_sadtalker,
        }
        
        generator = generators.get(engine)
        if not generator:
            logger.error(f"Générateur non implémenté: {engine}")
            return None
        
        return await generator(image_path, audio_path, output_path, **kwargs)
    
    def _select_best_engine(self) -> AvatarEngine:
        """Sélectionne le meilleur moteur disponible."""
        # Priorité: OpenVINO > SadTalker > MuseTalk > Replicate
        priority = [
            AvatarEngine.WAV2LIP_OPENVINO,  # Le plus rapide sur Intel
            AvatarEngine.SADTALKER,          # Meilleure qualité
            AvatarEngine.MUSETALK,           # Temps réel
            AvatarEngine.ECHOMIMIC,          # Alternative
            AvatarEngine.REPLICATE_SADTALKER # Cloud fallback
        ]
        
        for engine in priority:
            if self.installed_engines.get(engine.value, False):
                return engine
        
        return AvatarEngine.REPLICATE_SADTALKER
    
    # ──────────────────────────────────────────────────────────────────────────
    # GÉNÉRATEURS SPÉCIFIQUES
    # ──────────────────────────────────────────────────────────────────────────
    
    async def _generate_sadtalker(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec SadTalker (local).
        
        SadTalker utilise des coefficients de mouvement 3D réalistes
        pour animer une image statique avec l'audio.
        """
        sadtalker_dir = self.config.models_dir / "SadTalker"
        
        cmd = f'''
        cd "{sadtalker_dir}" && python inference.py \
            --driven_audio "{audio_path}" \
            --source_image "{image_path}" \
            --result_dir "{output_path.parent}" \
            --preprocess {self.config.preprocess} \
            --still \
            --expression_scale {self.config.expression_scale} \
            {"--enhancer gfpgan" if self.config.use_enhancer else ""}
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                # SadTalker génère dans un dossier avec timestamp
                # On doit trouver le fichier généré
                result_files = list(output_path.parent.glob("*.mp4"))
                if result_files:
                    latest = max(result_files, key=lambda f: f.stat().st_mtime)
                    shutil.move(str(latest), str(output_path))
                    logger.info(f"✅ Vidéo SadTalker: {output_path}")
                    return output_path
            else:
                logger.error(f"SadTalker erreur: {stderr.decode()}")
                
        except Exception as e:
            logger.error(f"Erreur SadTalker: {e}")
        
        return None
    
    async def _generate_musetalk(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec MuseTalk (temps réel, 30+ FPS).
        
        MuseTalk utilise l'inpainting dans l'espace latent
        pour un lip-sync haute qualité et rapide.
        """
        musetalk_dir = self.config.models_dir / "MuseTalk"
        
        cmd = f'''
        cd "{musetalk_dir}" && python -m scripts.inference \
            --audio_path "{audio_path}" \
            --video_path "{image_path}" \
            --output_path "{output_path}" \
            --bbox_shift {self.config.musetalk_bbox_shift} \
            {"--use_float16" if self.config.musetalk_use_float16 else ""}
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0 and output_path.exists():
                logger.info(f"✅ Vidéo MuseTalk: {output_path}")
                return output_path
            else:
                logger.error(f"MuseTalk erreur: {stderr.decode()}")
                
        except Exception as e:
            logger.error(f"Erreur MuseTalk: {e}")
        
        return None
    
    async def _generate_wav2lip(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec Wav2Lip standard.
        
        Wav2Lip offre une synchronisation labiale précise
        mais peut nécessiter un post-traitement pour la qualité.
        """
        wav2lip_dir = self.config.models_dir / "Wav2Lip"
        
        cmd = f'''
        cd "{wav2lip_dir}" && python inference.py \
            --checkpoint_path checkpoints/wav2lip_gan.pth \
            --face "{image_path}" \
            --audio "{audio_path}" \
            --outfile "{output_path}"
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0 and output_path.exists():
                logger.info(f"✅ Vidéo Wav2Lip: {output_path}")
                return output_path
            else:
                logger.error(f"Wav2Lip erreur: {stderr.decode()}")
                
        except Exception as e:
            logger.error(f"Erreur Wav2Lip: {e}")
        
        return None
    
    async def _generate_wav2lip_openvino(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec Wav2Lip optimisé OpenVINO.
        
        ⚡ OPTIMISÉ POUR INTEL:
        - Accélération CPU/GPU Intel via OpenVINO
        - Parfait pour Minisforum M1 Pro-285H (Core Ultra)
        - Inférence 2-3x plus rapide que PyTorch standard
        """
        wav2lip_ov_dir = self.config.models_dir / "realtimeWav2lip"
        
        # Configuration OpenVINO
        env = os.environ.copy()
        env["OPENVINO_DEVICE"] = self.config.openvino_device
        
        cmd = f'''
        cd "{wav2lip_ov_dir}" && python wav2lip_openvino.py \
            --face "{image_path}" \
            --audio "{audio_path}" \
            --outfile "{output_path}" \
            --device {self.config.openvino_device} \
            --precision {self.config.openvino_precision}
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, 
                stdout=asyncio.subprocess.PIPE, 
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0 and output_path.exists():
                logger.info(f"✅ Vidéo Wav2Lip OpenVINO: {output_path}")
                return output_path
            else:
                logger.error(f"Wav2Lip OpenVINO erreur: {stderr.decode()}")
                
        except Exception as e:
            logger.error(f"Erreur Wav2Lip OpenVINO: {e}")
        
        return None
    
    async def _generate_echomimic(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec EchoMimic.
        
        EchoMimic peut utiliser audio + landmarks faciaux
        pour des animations plus stables et naturelles.
        """
        echomimic_dir = self.config.models_dir / "EchoMimic"
        
        cmd = f'''
        cd "{echomimic_dir}" && python infer.py \
            --source_image "{image_path}" \
            --driving_audio "{audio_path}" \
            --output_path "{output_path}"
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0 and output_path.exists():
                logger.info(f"✅ Vidéo EchoMimic: {output_path}")
                return output_path
            else:
                logger.error(f"EchoMimic erreur: {stderr.decode()}")
                
        except Exception as e:
            logger.error(f"Erreur EchoMimic: {e}")
        
        return None
    
    async def _generate_latentsync(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec LatentSync (ByteDance).
        
        LatentSync utilise la diffusion latente pour un
        lip-sync haute résolution avec détails visuels impressionnants.
        """
        latentsync_dir = self.config.models_dir / "LatentSync"
        
        cmd = f'''
        cd "{latentsync_dir}" && python inference.py \
            --source_image "{image_path}" \
            --audio_path "{audio_path}" \
            --output_path "{output_path}"
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0 and output_path.exists():
                logger.info(f"✅ Vidéo LatentSync: {output_path}")
                return output_path
            else:
                logger.error(f"LatentSync erreur: {stderr.decode()}")
                
        except Exception as e:
            logger.error(f"Erreur LatentSync: {e}")
        
        return None
    
    async def _generate_replicate_sadtalker(
        self, image_path: Path, audio_path: Path, output_path: Path, **kwargs
    ) -> Optional[Path]:
        """
        Génère avec SadTalker sur Replicate (cloud).
        
        🌐 FALLBACK CLOUD:
        Utilisé quand aucun moteur local n'est disponible.
        Nécessite un token Replicate.
        """
        import replicate
        
        token = self.config.replicate_token or os.getenv("REPLICATE_API_TOKEN")
        if not token:
            logger.error("Token Replicate manquant!")
            return None
        
        os.environ["REPLICATE_API_TOKEN"] = token
        
        try:
            logger.info("🌐 Génération via Replicate SadTalker...")
            
            output = replicate.run(
                "cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376",
                input={
                    "source_image": open(image_path, "rb"),
                    "driven_audio": open(audio_path, "rb"),
                    "preprocess": self.config.preprocess,
                    "still_mode": self.config.still_mode,
                    "use_enhancer": self.config.use_enhancer,
                    "expression_scale": self.config.expression_scale
                }
            )
            
            if output:
                video_url = str(output)
                async with httpx.AsyncClient() as client:
                    response = await client.get(video_url)
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_path, "wb") as f:
                        f.write(response.content)
                
                logger.info(f"✅ Vidéo Replicate: {output_path}")
                return output_path
                
        except Exception as e:
            logger.error(f"Erreur Replicate: {e}")
        
        return None
    
    # ──────────────────────────────────────────────────────────────────────────
    # UTILITAIRES
    # ──────────────────────────────────────────────────────────────────────────
    
    async def generate_tts_audio(
        self, 
        text: str, 
        output_path: str | Path,
        voice: Optional[str] = None,
        rate: Optional[str] = None
    ) -> Optional[Path]:
        """
        Génère l'audio TTS avec Edge-TTS.
        
        Args:
            text: Texte à convertir en speech
            output_path: Chemin de sortie pour l'audio
            voice: Voix Edge-TTS (défaut: config)
            rate: Vitesse de parole (défaut: config)
            
        Returns:
            Path vers l'audio généré
        """
        output_path = Path(output_path)
        voice = voice or self.config.tts_voice
        rate = rate or self.config.tts_rate
        
        # Nettoyer le texte
        clean_text = text.replace('"', '').replace("'", "'")
        
        cmd = f'edge-tts --voice "{voice}" --rate="{rate}" --text "{clean_text}" --write-media "{output_path}"'
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            
            if output_path.exists():
                logger.info(f"✅ Audio TTS: {output_path}")
                return output_path
                
        except Exception as e:
            logger.error(f"Erreur TTS: {e}")
        
        return None
    
    async def enhance_video(
        self, 
        video_path: str | Path, 
        output_path: str | Path,
        enhancer: str = "gfpgan"
    ) -> Optional[Path]:
        """
        Améliore la qualité du visage dans la vidéo avec GFPGAN.
        
        Args:
            video_path: Vidéo source
            output_path: Vidéo améliorée
            enhancer: 'gfpgan' ou 'codeformer'
            
        Returns:
            Path vers la vidéo améliorée
        """
        video_path = Path(video_path)
        output_path = Path(output_path)
        
        # On utilise Real-ESRGAN ou GFPGAN
        cmd = f'''
        python -m gfpgan.inference_gfpgan -i "{video_path}" -o "{output_path.parent}" \
            --version 1.3 --upscale 2 --bg_upsampler realesrgan
        '''
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            
            if output_path.exists():
                logger.info(f"✅ Vidéo améliorée: {output_path}")
                return output_path
                
        except Exception as e:
            logger.error(f"Erreur enhancement: {e}")
        
        return None
    
    def get_status(self) -> Dict[str, Any]:
        """Retourne le statut de tous les moteurs."""
        return {
            "installed_engines": self.installed_engines,
            "config": {
                "models_dir": str(self.config.models_dir),
                "default_engine": self.config.engine.value,
                "openvino_device": self.config.openvino_device,
                "tts_voice": self.config.tts_voice
            },
            "recommended_engine": self._select_best_engine().value
        }


# ══════════════════════════════════════════════════════════════════════════════
# SCRIPT D'INSTALLATION RAPIDE
# ══════════════════════════════════════════════════════════════════════════════

async def quick_setup():
    """
    🚀 Installation rapide de tous les outils.
    
    Usage:
        python avatar_video_generator.py --setup
    """
    print("="*60)
    print("🎭 AVATAR VIDEO GENERATOR - INSTALLATION")
    print("="*60)
    
    generator = AvatarVideoGenerator()
    
    # 1. Installer OpenVINO (pour Intel)
    print("\n📦 Installation OpenVINO...")
    await generator.install_openvino_optimization()
    
    # 2. Installer les moteurs par priorité
    engines_to_install = [
        AvatarEngine.SADTALKER,
        AvatarEngine.MUSETALK,
        AvatarEngine.WAV2LIP_OPENVINO,
    ]
    
    for engine in engines_to_install:
        print(f"\n📦 Installation {engine.value}...")
        await generator.install_engine(engine)
    
    print("\n" + "="*60)
    print("✅ Installation terminée!")
    print("="*60)
    print("\nStatut:")
    print(json.dumps(generator.get_status(), indent=2, ensure_ascii=False))


async def demo():
    """Démonstration du générateur."""
    print("="*60)
    print("🎭 AVATAR VIDEO GENERATOR - DEMO")
    print("="*60)
    
    generator = AvatarVideoGenerator()
    
    # Afficher le statut
    status = generator.get_status()
    print(f"\n📊 Moteurs installés: {[k for k, v in status['installed_engines'].items() if v]}")
    print(f"🎯 Moteur recommandé: {status['recommended_engine']}")
    
    # Exemple de génération
    print("\n💡 Exemple d'utilisation:")
    print('''
    generator = AvatarVideoGenerator()
    
    # Générer l'audio
    audio = await generator.generate_tts_audio(
        "Bonjour! Je suis votre avatar parlant.",
        "speech.mp3"
    )
    
    # Générer la vidéo
    video = await generator.generate(
        image_path="avatar.jpg",
        audio_path="speech.mp3", 
        output_path="output.mp4",
        engine=AvatarEngine.SADTALKER
    )
    ''')


if __name__ == "__main__":
    import sys
    
    if "--setup" in sys.argv:
        asyncio.run(quick_setup())
    else:
        asyncio.run(demo())
