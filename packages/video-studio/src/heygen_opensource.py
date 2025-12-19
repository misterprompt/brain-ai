# -*- coding: utf-8 -*-
"""
🎬 HEYGEN OPEN SOURCE - Production Vidéo Complète
==================================================
Combine tous les outils open-source pour créer des vidéos 
type HeyGen sans API payante.

⚡ OPTIMISÉ POUR: Minisforum M1 Pro-285H (Intel Core Ultra)

🔧 WORKFLOW:
1. Script IA → LLaMA/Groq
2. TTS → Edge-TTS (gratuit, qualité premium)
3. Avatar → SadTalker/MuseTalk/Wav2Lip (local)
4. Illustrations → Pollinations/FLUX
5. Montage → FFmpeg
6. Enhancement → GFPGAN

📚 REPOS GITHUB INTÉGRÉS:
- SadTalker: https://github.com/OpenTalker/SadTalker
- MuseTalk: https://github.com/TMElyralab/MuseTalk  
- Wav2Lip: https://github.com/Rudrabha/Wav2Lip
- Wav2Lip OpenVINO: https://github.com/devkrish23/realtimeWav2lip
- EchoMimic: https://github.com/BadToBest/EchoMimic
- LatentSync: https://github.com/bytedance/LatentSync
"""

import os
import sys
import asyncio
import subprocess
import json
import requests
import random
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
import httpx

# Importer notre générateur d'avatar
try:
    from services.avatar_video_generator import AvatarVideoGenerator, AvatarEngine, AvatarConfig
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from avatar_video_generator import AvatarVideoGenerator, AvatarEngine, AvatarConfig

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("HeyGenOpen")

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class VideoConfig:
    """Configuration pour la production vidéo."""
    # Dossiers
    output_dir: Path = Path("d:/moteur israelien/heygen_videos_opensource")
    temp_dir: Path = Path("d:/moteur israelien/temp_heygen_opensource")
    
    # API Keys
    groq_key: str = os.getenv("GROQ_API_KEY", "")
    replicate_token: str = os.getenv("REPLICATE_API_TOKEN", "")
    
    # TTS
    voice: str = "fr-FR-VivienneMultilingualNeural"
    voice_rate: str = "-5%"
    
    # Avatar
    avatar_engine: AvatarEngine = AvatarEngine.SADTALKER
    use_real_photo: bool = True  # Essayer photo Unsplash d'abord
    
    # Qualité
    resolution: tuple = (1920, 1080)
    fps: int = 25
    use_enhancer: bool = True
    
    # Musique
    add_background_music: bool = False
    music_volume: float = 0.1

# ══════════════════════════════════════════════════════════════════════════════
# PHOTOS D'AVATARS LIBRES DE DROITS (UNSPLASH)
# ══════════════════════════════════════════════════════════════════════════════

AVATAR_PHOTOS = {
    "professional_woman": [
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80",
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=800&q=80",
    ],
    "professional_man": [
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80",
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    ],
    "casual": [
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
    ]
}

# ══════════════════════════════════════════════════════════════════════════════
# SUJETS VIDÉO (100+ pour un an de contenu)
# ══════════════════════════════════════════════════════════════════════════════

VIDEO_TOPICS = [
    # 🤖 TECH & IA
    {"id": 1, "title": "Comment l'IA transforme notre quotidien", "category": "tech"},
    {"id": 2, "title": "ChatGPT vs Claude vs Gemini : Le comparatif 2025", "category": "tech"},
    {"id": 3, "title": "5 outils IA gratuits que vous devez connaître", "category": "tech"},
    {"id": 4, "title": "L'IA peut-elle remplacer votre travail ?", "category": "tech"},
    {"id": 5, "title": "Créer des images avec l'IA : Guide complet", "category": "tech"},
    
    # 💰 FINANCE & CRYPTO
    {"id": 10, "title": "Bitcoin en 2025 : Que va-t-il se passer ?", "category": "finance"},
    {"id": 11, "title": "Comment investir 1000€ intelligemment", "category": "finance"},
    {"id": 12, "title": "Les erreurs qui ruinent les traders débutants", "category": "finance"},
    
    # 🎮 GAMING
    {"id": 20, "title": "GTA 6 : Tout ce qu'on sait", "category": "gaming"},
    {"id": 21, "title": "Les meilleurs jeux de 2025", "category": "gaming"},
    
    # 🏥 SANTÉ
    {"id": 30, "title": "Perdre du poids : La méthode qui fonctionne vraiment", "category": "sante"},
    {"id": 31, "title": "Améliorer son sommeil : 7 conseils pratiques", "category": "sante"},
    
    # 🌍 VOYAGE
    {"id": 40, "title": "Les destinations pas chères en 2025", "category": "voyage"},
    {"id": 41, "title": "Comment voyager presque gratuitement", "category": "voyage"},
]

# ══════════════════════════════════════════════════════════════════════════════
# PRODUCTEUR VIDÉO
# ══════════════════════════════════════════════════════════════════════════════

class HeyGenOpenSource:
    """
    Producteur de vidéos style HeyGen 100% open-source.
    
    Workflow complet:
    1. Génération du script avec IA
    2. Text-to-Speech avec Edge-TTS
    3. Animation avatar avec SadTalker/MuseTalk
    4. Génération d'illustrations
    5. Montage final avec FFmpeg
    """
    
    def __init__(self, config: Optional[VideoConfig] = None):
        self.config = config or VideoConfig()
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        self.config.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialiser le générateur d'avatar
        avatar_config = AvatarConfig(
            engine=self.config.avatar_engine,
            replicate_token=self.config.replicate_token,
            tts_voice=self.config.voice,
            tts_rate=self.config.voice_rate,
            use_enhancer=self.config.use_enhancer
        )
        self.avatar_generator = AvatarVideoGenerator(avatar_config)
    
    # ──────────────────────────────────────────────────────────────────────────
    # GÉNÉRATION DE SCRIPT
    # ──────────────────────────────────────────────────────────────────────────
    
    async def generate_script(self, topic: str, duration: str = "5-7min") -> Dict[str, Any]:
        """
        Génère un script vidéo structuré avec l'IA.
        
        Args:
            topic: Sujet de la vidéo
            duration: Durée cible
            
        Returns:
            Script structuré avec intro, sections et outro
        """
        logger.info(f"📝 Génération du script: {topic}")
        
        prompt = f"""Tu es un scriptwriter pour des vidéos YouTube explicatives.
Pour le sujet "{topic}" (durée cible: {duration}), génère un script JSON:

{{
    "title": "Titre accrocheur pour YouTube",
    "avatar_intro": "Introduction engageante (20-30 mots), ton conversationnel comme si tu parlais à un ami",
    "sections": [
        {{
            "title": "Titre de la section",
            "text": "Explication claire et engageante (40-60 mots par section)",
            "image_prompt": "Description pour générer une image illustrative, style professionnel"
        }}
    ],
    "avatar_outro": "Conclusion avec call-to-action (20-30 mots)",
    "tags": ["tag1", "tag2", "tag3"],
    "thumbnail_prompt": "Description pour la miniature YouTube"
}}

Génère 4-5 sections. Réponds UNIQUEMENT avec le JSON valide."""

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.config.groq_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7
                    }
                )
                
                content = response.json()["choices"][0]["message"]["content"]
                
                # Extraire le JSON
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                script = json.loads(content[json_start:json_end])
                
                logger.info(f"✅ Script généré: {script.get('title', topic)}")
                return script
                
        except Exception as e:
            logger.error(f"Erreur génération script: {e}")
            return self._fallback_script(topic)
    
    def _fallback_script(self, topic: str) -> Dict[str, Any]:
        """Script de secours si l'IA échoue."""
        return {
            "title": topic,
            "avatar_intro": f"Bonjour et bienvenue ! Aujourd'hui, nous allons parler de {topic}. C'est un sujet passionnant que je vais vous expliquer simplement.",
            "sections": [
                {
                    "title": "Introduction",
                    "text": f"{topic} est un sujet qui touche de plus en plus de personnes. Voyons ensemble les points essentiels à connaître.",
                    "image_prompt": f"professional illustration of {topic}, modern design, clean"
                },
                {
                    "title": "Les points clés",
                    "text": "Il y a plusieurs aspects importants à comprendre. Le premier est fondamental pour bien maîtriser le sujet.",
                    "image_prompt": "infographic with key points, professional, colorful"
                },
                {
                    "title": "Conseils pratiques",
                    "text": "Voici quelques conseils que vous pouvez appliquer dès maintenant pour améliorer votre situation.",
                    "image_prompt": "person taking notes, productive, modern office"
                }
            ],
            "avatar_outro": "Merci d'avoir regardé cette vidéo ! N'oubliez pas de vous abonner et de laisser un commentaire.",
            "tags": [topic.split()[0].lower(), "guide", "tutoriel"],
            "thumbnail_prompt": f"eye-catching thumbnail about {topic}"
        }
    
    # ──────────────────────────────────────────────────────────────────────────
    # GÉNÉRATION AUDIO (TTS)
    # ──────────────────────────────────────────────────────────────────────────
    
    async def generate_audio(self, text: str, filename: str) -> Optional[Path]:
        """
        Génère l'audio avec Edge-TTS.
        
        Edge-TTS offre des voix naturelles et gratuites de haute qualité.
        """
        audio_path = self.config.temp_dir / filename
        
        # Ajouter des pauses naturelles
        natural_text = text.replace(". ", "... ").replace("! ", "!... ").replace("? ", "?... ")
        clean_text = natural_text.replace('"', '').replace("'", "'")
        
        cmd = f'edge-tts --voice "{self.config.voice}" --rate="{self.config.voice_rate}" --text "{clean_text}" --write-media "{audio_path}"'
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            
            if audio_path.exists():
                logger.info(f"✅ Audio: {audio_path.name}")
                return audio_path
                
        except Exception as e:
            logger.error(f"Erreur TTS: {e}")
        
        return None
    
    # ──────────────────────────────────────────────────────────────────────────
    # TÉLÉCHARGEMENT AVATAR
    # ──────────────────────────────────────────────────────────────────────────
    
    async def get_avatar_image(self, style: str = "professional_woman") -> Optional[Path]:
        """
        Obtient une image d'avatar (photo Unsplash ou génération IA).
        
        Args:
            style: Style d'avatar souhaité
            
        Returns:
            Chemin vers l'image de l'avatar
        """
        avatar_path = self.config.temp_dir / "avatar.jpg"
        
        # 1. Essayer une photo Unsplash (libre de droits)
        if self.config.use_real_photo:
            photos = AVATAR_PHOTOS.get(style, AVATAR_PHOTOS["professional_woman"])
            selected_url = random.choice(photos)
            
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(selected_url, timeout=30)
                    if response.status_code == 200:
                        with open(avatar_path, "wb") as f:
                            f.write(response.content)
                        logger.info(f"✅ Avatar téléchargé (Unsplash)")
                        return avatar_path
            except Exception as e:
                logger.warning(f"Échec Unsplash: {e}")
        
        # 2. Fallback: Générer avec FLUX/Replicate
        logger.info("🎨 Génération avatar IA...")
        try:
            import replicate
            
            output = replicate.run(
                "black-forest-labs/flux-schnell",
                input={
                    "prompt": "professional corporate headshot of a friendly person, natural smile, neutral gray studio background, soft lighting, wearing business casual, looking directly at camera, high resolution portrait photo, photorealistic",
                    "go_fast": True,
                    "num_outputs": 1,
                    "aspect_ratio": "1:1",
                    "output_format": "png"
                }
            )
            
            if output:
                url = str(output[0]) if isinstance(output, list) else str(output)
                async with httpx.AsyncClient() as client:
                    response = await client.get(url)
                    avatar_path = self.config.temp_dir / "avatar_ai.png"
                    with open(avatar_path, "wb") as f:
                        f.write(response.content)
                    logger.info("✅ Avatar IA généré")
                    return avatar_path
                    
        except Exception as e:
            logger.error(f"Erreur génération avatar: {e}")
        
        return None
    
    # ──────────────────────────────────────────────────────────────────────────
    # GÉNÉRATION D'ILLUSTRATIONS
    # ──────────────────────────────────────────────────────────────────────────
    
    async def generate_illustration(self, prompt: str, index: int) -> Optional[Path]:
        """
        Génère une illustration avec Pollinations (gratuit).
        
        Args:
            prompt: Description de l'image
            index: Index pour le nom de fichier
            
        Returns:
            Chemin vers l'illustration
        """
        logger.info(f"🖼️ Illustration {index}: {prompt[:50]}...")
        
        enhanced_prompt = f"{prompt}, professional photography, high quality, 4k resolution, clean composition"
        clean_prompt = enhanced_prompt.replace(" ", "%20")
        url = f"https://image.pollinations.ai/prompt/{clean_prompt}?width=1920&height=1080&nologo=true&seed={index*123}"
        
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    path = self.config.temp_dir / f"illustration_{index}.jpg"
                    with open(path, "wb") as f:
                        f.write(response.content)
                    logger.info(f"✅ Illustration générée")
                    return path
                    
        except Exception as e:
            logger.error(f"Erreur illustration: {e}")
        
        return None
    
    # ──────────────────────────────────────────────────────────────────────────
    # CRÉATION DE SECTIONS VIDÉO
    # ──────────────────────────────────────────────────────────────────────────
    
    async def create_section_video(
        self, 
        image_path: Path, 
        audio_path: Path, 
        text: str, 
        index: int
    ) -> Optional[Path]:
        """
        Crée une section vidéo avec zoom subtil et sous-titres.
        
        Args:
            image_path: Image de fond
            audio_path: Audio de la narration
            text: Texte pour les sous-titres
            index: Index de la section
            
        Returns:
            Chemin vers la vidéo de section
        """
        output = self.config.temp_dir / f"section_{index}.mp4"
        
        # Obtenir la durée de l'audio
        probe_cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{audio_path}"'
        probe = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
        duration = float(probe.stdout.strip()) if probe.stdout.strip() else 5
        
        # Préparer les sous-titres (2 lignes max)
        words = text.split()
        lines = []
        line = []
        for w in words:
            line.append(w)
            if len(" ".join(line)) > 50:
                lines.append(" ".join(line))
                line = []
        if line:
            lines.append(" ".join(line))
        subtitle = "\\n".join(lines[:2])
        
        # Filtre FFmpeg avec zoom subtil et sous-titres
        filter_complex = (
            f"scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
            f"zoompan=z='min(zoom+0.0005,1.1)':d={int(duration*25)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080,"
            f"fade=t=in:st=0:d=0.5,fade=t=out:st={duration-0.5}:d=0.5,"
            f"drawbox=y=h-140:color=black@0.5:width=iw:height=110:t=fill,"
            f"drawtext=text='{subtitle}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-100:font=Arial"
        )
        
        cmd = (
            f'ffmpeg -y -loop 1 -i "{image_path}" -i "{audio_path}" '
            f'-vf "{filter_complex}" '
            f'-c:v libx264 -t {duration} -pix_fmt yuv420p -shortest "{output}"'
        )
        
        process = await asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await process.communicate()
        
        if output.exists():
            logger.info(f"✅ Section {index} créée")
            return output
        
        return None
    
    # ──────────────────────────────────────────────────────────────────────────
    # ASSEMBLAGE FINAL
    # ──────────────────────────────────────────────────────────────────────────
    
    async def assemble_video(self, parts: List[Path], output_path: Path) -> bool:
        """
        Assemble toutes les parties en une vidéo finale.
        
        Args:
            parts: Liste des segments vidéo
            output_path: Chemin de sortie
            
        Returns:
            True si succès
        """
        logger.info("⚙️ Assemblage final...")
        
        parts = [p for p in parts if p and p.exists()]
        if not parts:
            logger.error("Aucune partie à assembler")
            return False
        
        # Créer le fichier de concaténation
        concat_file = self.config.temp_dir / "concat.txt"
        with open(concat_file, "w") as f:
            for p in parts:
                f.write(f"file '{str(p).replace(os.sep, '/')}'\n")
        
        cmd = f'ffmpeg -y -f concat -safe 0 -i "{concat_file}" -c copy "{output_path}"'
        
        process = await asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await process.communicate()
        
        if output_path.exists():
            size_mb = output_path.stat().st_size / (1024*1024)
            logger.info(f"✅ Vidéo finale: {output_path} ({size_mb:.1f} MB)")
            return True
        
        return False
    
    # ──────────────────────────────────────────────────────────────────────────
    # PRODUCTION COMPLÈTE
    # ──────────────────────────────────────────────────────────────────────────
    
    async def produce_video(
        self, 
        topic: str,
        video_id: Optional[int] = None,
        avatar_style: str = "professional_woman"
    ) -> Optional[Path]:
        """
        🎬 PRODUCTION COMPLÈTE D'UNE VIDÉO.
        
        Workflow:
        1. Génération du script
        2. Téléchargement/génération avatar
        3. TTS pour intro/outro
        4. Animation avatar pour intro/outro
        5. Génération illustrations
        6. Création des sections
        7. Assemblage final
        
        Args:
            topic: Sujet de la vidéo
            video_id: ID optionnel pour le nommage
            avatar_style: Style d'avatar à utiliser
            
        Returns:
            Chemin vers la vidéo finale
        """
        logger.info("="*60)
        logger.info(f"🎬 PRODUCTION: {topic}")
        logger.info("="*60)
        
        video_id = video_id or random.randint(1000, 9999)
        
        # 1. Script
        script = await self.generate_script(topic)
        
        # 2. Avatar
        avatar_img = await self.get_avatar_image(avatar_style)
        if not avatar_img:
            logger.error("❌ Impossible d'obtenir un avatar")
            return None
        
        parts = []
        
        # 3. Intro animée
        logger.info("\n--- INTRO ---")
        intro_audio = await self.generate_audio(script["avatar_intro"], "intro.mp3")
        if intro_audio:
            intro_video = await self.avatar_generator.generate(
                image_path=avatar_img,
                audio_path=intro_audio,
                output_path=self.config.temp_dir / "avatar_intro.mp4",
                engine=self.config.avatar_engine
            )
            if intro_video:
                parts.append(intro_video)
        
        # 4. Sections illustrées
        logger.info("\n--- SECTIONS ---")
        for i, section in enumerate(script["sections"]):
            img = await self.generate_illustration(section["image_prompt"], i)
            if not img:
                continue
            
            audio = await self.generate_audio(section["text"], f"section_{i}.mp3")
            if not audio:
                continue
            
            vid = await self.create_section_video(img, audio, section["text"], i)
            if vid:
                parts.append(vid)
        
        # 5. Outro animée
        logger.info("\n--- OUTRO ---")
        outro_audio = await self.generate_audio(script["avatar_outro"], "outro.mp3")
        if outro_audio:
            outro_video = await self.avatar_generator.generate(
                image_path=avatar_img,
                audio_path=outro_audio,
                output_path=self.config.temp_dir / "avatar_outro.mp4",
                engine=self.config.avatar_engine
            )
            if outro_video:
                parts.append(outro_video)
        
        # 6. Assemblage
        logger.info("\n--- ASSEMBLAGE ---")
        safe_title = "".join(c for c in script["title"] if c.isalnum() or c in " -_")[:50]
        final_path = self.config.output_dir / f"heygen_open_{video_id}_{safe_title}.mp4"
        
        if await self.assemble_video(parts, final_path):
            logger.info(f"\n🎉 VIDÉO TERMINÉE: {final_path}")
            return final_path
        
        return None
    
    async def batch_produce(self, topics: List[Dict], start_id: int = 1) -> List[Path]:
        """
        Production en batch de plusieurs vidéos.
        
        Args:
            topics: Liste de sujets
            start_id: ID de départ
            
        Returns:
            Liste des vidéos produites
        """
        results = []
        
        for i, topic_info in enumerate(topics):
            video_id = start_id + i
            title = topic_info.get("title", f"Video {video_id}")
            
            try:
                video_path = await self.produce_video(title, video_id)
                if video_path:
                    results.append(video_path)
            except Exception as e:
                logger.error(f"Erreur production {title}: {e}")
        
        logger.info(f"\n📊 Batch terminé: {len(results)}/{len(topics)} vidéos produites")
        return results


# ══════════════════════════════════════════════════════════════════════════════
# SCRIPT D'INSTALLATION DES DÉPENDANCES
# ══════════════════════════════════════════════════════════════════════════════

SETUP_INSTRUCTIONS = """
╔══════════════════════════════════════════════════════════════════════════════╗
║            🎬 HEYGEN OPEN SOURCE - GUIDE D'INSTALLATION                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  📦 DÉPENDANCES PYTHON:                                                      ║
║                                                                              ║
║    pip install edge-tts httpx replicate ffmpeg-python                        ║
║                                                                              ║
║  🔧 OUTILS SYSTÈME:                                                          ║
║                                                                              ║
║    1. FFmpeg: https://ffmpeg.org/download.html                               ║
║       Windows: scoop install ffmpeg                                          ║
║                                                                              ║
║  🧠 MOTEURS D'AVATAR (choisir un ou plusieurs):                              ║
║                                                                              ║
║    OPTION 1 - SadTalker (recommandé):                                        ║
║      git clone https://github.com/OpenTalker/SadTalker                       ║
║      cd SadTalker                                                            ║
║      pip install -r requirements.txt                                         ║
║      # Télécharger les modèles (voir README)                                 ║
║                                                                              ║
║    OPTION 2 - MuseTalk (temps réel):                                         ║
║      git clone https://github.com/TMElyralab/MuseTalk                        ║
║      cd MuseTalk                                                             ║
║      pip install -r requirements.txt                                         ║
║      mim install mmcv==2.0.1 mmdet==3.1.0 mmpose==1.1.0                      ║
║                                                                              ║
║    OPTION 3 - Wav2Lip + OpenVINO (Intel optimisé):                           ║
║      git clone https://github.com/devkrish23/realtimeWav2lip                 ║
║      pip install openvino openvino-dev                                       ║
║                                                                              ║
║    OPTION 4 - Cloud (Replicate - sans installation):                         ║
║      set REPLICATE_API_TOKEN=your_token                                      ║
║                                                                              ║
║  ⚡ OPTIMISATION INTEL (Minisforum M1 Pro-285H):                             ║
║                                                                              ║
║    pip install openvino openvino-dev[pytorch] nncf                           ║
║    # Utiliser AvatarEngine.WAV2LIP_OPENVINO                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

async def main():
    """Démonstration du producteur vidéo."""
    print(SETUP_INSTRUCTIONS)
    print("\n" + "="*60)
    print("🎬 HEYGEN OPEN SOURCE - DEMO")
    print("="*60)
    
    # Configuration
    config = VideoConfig()
    producer = HeyGenOpenSource(config)
    
    # Afficher le statut des moteurs
    status = producer.avatar_generator.get_status()
    print(f"\n📊 Moteurs d'avatar disponibles:")
    for engine, installed in status["installed_engines"].items():
        emoji = "✅" if installed else "❌"
        print(f"   {emoji} {engine}")
    
    print(f"\n🎯 Moteur recommandé: {status['recommended_engine']}")
    
    # Produire une vidéo de test
    print("\n" + "-"*40)
    print("💡 Pour produire une vidéo:")
    print('''
    producer = HeyGenOpenSource()
    video = await producer.produce_video(
        topic="Comment l'IA transforme notre quotidien",
        avatar_style="professional_woman"
    )
    ''')
    
    # Demander si on veut lancer la production
    response = input("\n🚀 Lancer une production de test ? (o/n): ").strip().lower()
    if response == 'o':
        topic = input("📝 Sujet de la vidéo (ou Entrée pour défaut): ").strip()
        if not topic:
            topic = "5 outils IA gratuits que vous devez connaître en 2025"
        
        video_path = await producer.produce_video(topic)
        
        if video_path:
            print(f"\n🎉 Vidéo créée: {video_path}")
            # Ouvrir la vidéo
            subprocess.run(f'start "" "{video_path}"', shell=True)


if __name__ == "__main__":
    asyncio.run(main())
