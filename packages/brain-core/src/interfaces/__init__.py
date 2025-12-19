"""
🏗️ INTERFACES MODULAIRES
========================
Architecture par domaines isolés pour stabilité maximale.
Chaque interface gère ses propres APIs, parsing et erreurs.
"""

from .base import BaseInterface
from .factory import InterfaceFactory

__all__ = ["BaseInterface", "InterfaceFactory"]
