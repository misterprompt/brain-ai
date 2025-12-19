# -*- coding: utf-8 -*-
"""
🎲 GURUGAMMON - Stratégie IA
============================
Stratégies d'évaluation et de jeu pour le Backgammon.
"""

from typing import List, Tuple, Optional
from dataclasses import dataclass
import random
import math

from .engine import Board, Color, Move, BackgammonRules


@dataclass
class PositionEvaluation:
    """Évaluation d'une position."""
    score: float
    pip_count_white: int
    pip_count_black: int
    blots_white: int
    blots_black: int
    points_made_white: int
    points_made_black: int
    home_board_strength_white: float
    home_board_strength_black: float


class Evaluator:
    """
    Évaluateur de position pour le Backgammon.
    Utilise une combinaison de facteurs stratégiques.
    """
    
    # Poids des différents facteurs
    WEIGHTS = {
        'pip_count': 0.01,        # Avancement général
        'blots': -0.3,            # Pénalité pour les blots exposés
        'points_made': 0.15,      # Bonus pour les points faits
        'home_board': 0.2,        # Force du home board
        'anchor': 0.25,           # Points dans le board adverse
        'prime': 0.4,             # Prime (points consécutifs)
        'bar': -0.5,              # Pénalité pour pions sur la barre
        'borne_off': 0.3,         # Bonus pour pions sortis
        'race': 0.05,             # Position de course
    }
    
    @classmethod
    def evaluate(cls, board: Board, color: Color) -> float:
        """
        Évalue la position pour un joueur.
        Score positif = avantage pour le joueur.
        """
        opponent = Color.BLACK if color == Color.WHITE else Color.WHITE
        
        score = 0.0
        
        # Pip count (moins = mieux)
        my_pips = board.pip_count(color)
        opp_pips = board.pip_count(opponent)
        score += (opp_pips - my_pips) * cls.WEIGHTS['pip_count']
        
        # Blots (pions exposés)
        my_blots = cls._count_blots(board, color)
        opp_blots = cls._count_blots(board, opponent)
        score += (opp_blots - my_blots) * abs(cls.WEIGHTS['blots'])
        
        # Points faits
        my_points = cls._count_made_points(board, color)
        opp_points = cls._count_made_points(board, opponent)
        score += (my_points - opp_points) * cls.WEIGHTS['points_made']
        
        # Force du home board
        my_home = cls._home_board_strength(board, color)
        opp_home = cls._home_board_strength(board, opponent)
        score += (my_home - opp_home) * cls.WEIGHTS['home_board']
        
        # Pions sur la barre
        score += board.bar[opponent] * abs(cls.WEIGHTS['bar'])
        score -= board.bar[color] * abs(cls.WEIGHTS['bar'])
        
        # Pions sortis
        score += board.borne_off[color] * cls.WEIGHTS['borne_off']
        score -= board.borne_off[opponent] * cls.WEIGHTS['borne_off']
        
        # Prime (points consécutifs)
        my_prime = cls._longest_prime(board, color)
        opp_prime = cls._longest_prime(board, opponent)
        score += (my_prime - opp_prime) * cls.WEIGHTS['prime']
        
        return score
    
    @classmethod
    def _count_blots(cls, board: Board, color: Color) -> int:
        """Compte les blots exposés."""
        count = 0
        for point in board.points:
            if color == Color.WHITE and point.checkers == 1:
                count += 1
            elif color == Color.BLACK and point.checkers == -1:
                count += 1
        return count
    
    @classmethod
    def _count_made_points(cls, board: Board, color: Color) -> int:
        """Compte les points faits (2+ pions)."""
        count = 0
        for point in board.points:
            if color == Color.WHITE and point.checkers >= 2:
                count += 1
            elif color == Color.BLACK and point.checkers <= -2:
                count += 1
        return count
    
    @classmethod
    def _home_board_strength(cls, board: Board, color: Color) -> float:
        """Évalue la force du home board."""
        strength = 0.0
        if color == Color.WHITE:
            for i in range(18, 24):  # Points 19-24
                if board.points[i].checkers >= 2:
                    strength += 1.0
                elif board.points[i].checkers == 1:
                    strength += 0.3
        else:
            for i in range(0, 6):  # Points 1-6
                if board.points[i].checkers <= -2:
                    strength += 1.0
                elif board.points[i].checkers == -1:
                    strength += 0.3
        return strength
    
    @classmethod
    def _longest_prime(cls, board: Board, color: Color) -> int:
        """Trouve la plus longue prime (points consécutifs)."""
        max_prime = 0
        current_prime = 0
        
        for point in board.points:
            if (color == Color.WHITE and point.checkers >= 2) or \
               (color == Color.BLACK and point.checkers <= -2):
                current_prime += 1
                max_prime = max(max_prime, current_prime)
            else:
                current_prime = 0
        
        return max_prime


class Strategy:
    """
    Stratégie de jeu pour le Backgammon.
    """
    
    def __init__(self, difficulty: str = "expert"):
        self.difficulty = difficulty
        self.evaluator = Evaluator()
        
        # Paramètres selon la difficulté
        self.params = {
            "beginner": {"randomness": 0.5, "depth": 1},
            "intermediate": {"randomness": 0.2, "depth": 2},
            "expert": {"randomness": 0.05, "depth": 3},
        }.get(difficulty, {"randomness": 0.1, "depth": 2})
    
    def choose_move(self, board: Board, color: Color, 
                    dice: Tuple[int, int]) -> List[Move]:
        """
        Choisit le meilleur coup.
        """
        all_moves = BackgammonRules.get_all_moves(board, color, dice)
        
        if not all_moves or all_moves == [[]]:
            return []
        
        # Évaluer chaque séquence de coups
        scored_moves = []
        for move_seq in all_moves:
            if not move_seq:
                scored_moves.append(([], 0.0))
                continue
            
            # Appliquer les coups sur une copie
            test_board = board.copy()
            test_board = BackgammonRules.apply_moves(test_board, color, move_seq)
            
            # Évaluer la position résultante
            score = self.evaluator.evaluate(test_board, color)
            
            # Ajouter un bonus pour les hits
            hits = sum(1 for m in move_seq if m.is_hit)
            score += hits * 0.1
            
            # Ajouter de l'aléatoire selon la difficulté
            score += random.gauss(0, self.params["randomness"])
            
            scored_moves.append((move_seq, score))
        
        # Choisir le meilleur coup
        scored_moves.sort(key=lambda x: x[1], reverse=True)
        
        # Pour le niveau débutant, parfois choisir un coup sous-optimal
        if self.difficulty == "beginner" and len(scored_moves) > 1:
            if random.random() < 0.3:
                return scored_moves[random.randint(0, min(2, len(scored_moves)-1))][0]
        
        return scored_moves[0][0]
    
    def should_double(self, board: Board, color: Color) -> bool:
        """
        Décide si le joueur devrait doubler.
        Basé sur la position et les probabilités.
        """
        score = self.evaluator.evaluate(board, color)
        
        # Doubler si on a un avantage significatif
        if self.difficulty == "expert":
            return score > 0.5
        elif self.difficulty == "intermediate":
            return score > 0.7
        else:
            return score > 1.0
    
    def should_take(self, board: Board, color: Color) -> bool:
        """
        Décide si le joueur devrait accepter un double.
        """
        score = self.evaluator.evaluate(board, color)
        
        # Accepter si on n'est pas trop en retard
        if self.difficulty == "expert":
            return score > -0.8
        elif self.difficulty == "intermediate":
            return score > -0.6
        else:
            return score > -0.4


# Test
if __name__ == "__main__":
    board = Board.initial()
    strategy = Strategy("expert")
    
    # Simuler quelques coups
    import random
    for turn in range(5):
        dice = (random.randint(1, 6), random.randint(1, 6))
        color = Color.WHITE if turn % 2 == 0 else Color.BLACK
        
        moves = strategy.choose_move(board, color, dice)
        print(f"Turn {turn+1} ({color.name}): Dice {dice} -> {moves}")
        
        if moves:
            board = BackgammonRules.apply_moves(board, color, moves)
        
        print(f"  Pip count: W={board.pip_count(Color.WHITE)} B={board.pip_count(Color.BLACK)}")
