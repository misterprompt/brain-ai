# -*- coding: utf-8 -*-
"""
🎲 GURUGAMMON - Moteur de Jeu Complet
=====================================
Implémentation complète des règles du Backgammon.
"""

from typing import List, Tuple, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
import copy


class Color(Enum):
    WHITE = 1
    BLACK = -1
    NONE = 0


@dataclass
class Point:
    """Un point sur le plateau."""
    checkers: int = 0  # Positif = blanc, Négatif = noir
    
    @property
    def color(self) -> Color:
        if self.checkers > 0:
            return Color.WHITE
        elif self.checkers < 0:
            return Color.BLACK
        return Color.NONE
    
    @property
    def count(self) -> int:
        return abs(self.checkers)
    
    def can_land(self, color: Color) -> bool:
        """Vérifie si un pion de cette couleur peut atterrir ici."""
        if self.checkers == 0:
            return True
        if color == Color.WHITE:
            return self.checkers >= -1
        else:
            return self.checkers <= 1
    
    def would_hit(self, color: Color) -> bool:
        """Vérifie si atterrir ici frapperait un blot."""
        if color == Color.WHITE:
            return self.checkers == -1
        else:
            return self.checkers == 1


@dataclass
class Board:
    """Plateau de Backgammon."""
    points: List[Point] = field(default_factory=lambda: [Point() for _ in range(24)])
    bar: dict = field(default_factory=lambda: {Color.WHITE: 0, Color.BLACK: 0})
    borne_off: dict = field(default_factory=lambda: {Color.WHITE: 0, Color.BLACK: 0})
    
    @classmethod
    def initial(cls) -> 'Board':
        """Crée un plateau avec la position initiale."""
        board = cls()
        # Position initiale standard
        # Blancs (positifs)
        board.points[0].checkers = 2
        board.points[11].checkers = 5
        board.points[16].checkers = 3
        board.points[18].checkers = 5
        # Noirs (négatifs)
        board.points[23].checkers = -2
        board.points[12].checkers = -5
        board.points[7].checkers = -3
        board.points[5].checkers = -5
        return board
    
    def copy(self) -> 'Board':
        """Crée une copie du plateau."""
        new_board = Board()
        new_board.points = [Point(p.checkers) for p in self.points]
        new_board.bar = self.bar.copy()
        new_board.borne_off = self.borne_off.copy()
        return new_board
    
    def get_checkers_positions(self, color: Color) -> List[int]:
        """Retourne les positions de tous les pions d'une couleur."""
        positions = []
        for i, point in enumerate(self.points):
            if (color == Color.WHITE and point.checkers > 0) or \
               (color == Color.BLACK and point.checkers < 0):
                positions.extend([i] * point.count)
        return positions
    
    def pip_count(self, color: Color) -> int:
        """Calcule le pip count pour une couleur."""
        total = 0
        for i, point in enumerate(self.points):
            if color == Color.WHITE and point.checkers > 0:
                total += point.checkers * (24 - i)
            elif color == Color.BLACK and point.checkers < 0:
                total += abs(point.checkers) * (i + 1)
        # Ajouter les pions sur la barre
        total += self.bar[color] * 25
        return total
    
    def can_bear_off(self, color: Color) -> bool:
        """Vérifie si le joueur peut sortir des pions."""
        if self.bar[color] > 0:
            return False
        
        # Tous les pions doivent être dans le home board
        if color == Color.WHITE:
            for i in range(18):  # Points 1-18
                if self.points[i].checkers > 0:
                    return False
        else:
            for i in range(6, 24):  # Points 7-24
                if self.points[i].checkers < 0:
                    return False
        return True
    
    def is_game_over(self) -> bool:
        """Vérifie si la partie est terminée."""
        return self.borne_off[Color.WHITE] == 15 or self.borne_off[Color.BLACK] == 15
    
    def winner(self) -> Optional[Color]:
        """Retourne le gagnant."""
        if self.borne_off[Color.WHITE] == 15:
            return Color.WHITE
        elif self.borne_off[Color.BLACK] == 15:
            return Color.BLACK
        return None
    
    def is_gammon(self) -> bool:
        """Vérifie si c'est un gammon."""
        winner = self.winner()
        if winner == Color.WHITE:
            return self.borne_off[Color.BLACK] == 0
        elif winner == Color.BLACK:
            return self.borne_off[Color.WHITE] == 0
        return False
    
    def is_backgammon(self) -> bool:
        """Vérifie si c'est un backgammon."""
        if not self.is_gammon():
            return False
        winner = self.winner()
        loser = Color.BLACK if winner == Color.WHITE else Color.WHITE
        
        # Vérifier si le perdant a des pions sur la barre
        if self.bar[loser] > 0:
            return True
        
        # Vérifier si le perdant a des pions dans le home board du gagnant
        if winner == Color.WHITE:
            for i in range(18, 24):
                if self.points[i].checkers < 0:
                    return True
        else:
            for i in range(0, 6):
                if self.points[i].checkers > 0:
                    return True
        return False


@dataclass
class Move:
    """Un mouvement simple."""
    from_point: int  # -1 = bar
    to_point: int    # 24 = bear off pour blanc, -1 = bear off pour noir
    is_hit: bool = False
    
    def __repr__(self):
        from_str = "bar" if self.from_point == -1 else str(self.from_point + 1)
        if self.to_point == 24 or self.to_point == -1:
            to_str = "off"
        else:
            to_str = str(self.to_point + 1)
        hit = "*" if self.is_hit else ""
        return f"{from_str}/{to_str}{hit}"


class BackgammonRules:
    """Règles du Backgammon et génération de coups."""
    
    @staticmethod
    def get_all_moves(board: Board, color: Color, dice: Tuple[int, int]) -> List[List[Move]]:
        """
        Génère tous les coups légaux possibles.
        Retourne une liste de séquences de mouvements.
        """
        dice_list = list(dice)
        if dice[0] == dice[1]:
            dice_list = [dice[0]] * 4
        
        all_sequences = BackgammonRules._generate_move_sequences(board, color, dice_list)
        
        # Filtrer pour garder les séquences qui utilisent le max de dés
        if not all_sequences:
            return [[]]
        
        max_dice_used = max(len(seq) for seq in all_sequences)
        valid_sequences = [seq for seq in all_sequences if len(seq) == max_dice_used]
        
        # Si on peut utiliser qu'un seul dé, on doit utiliser le plus grand
        if max_dice_used == 1 and dice[0] != dice[1]:
            larger_die = max(dice)
            larger_sequences = [seq for seq in valid_sequences 
                              if seq and BackgammonRules._die_used(board, seq[0], color) == larger_die]
            if larger_sequences:
                valid_sequences = larger_sequences
        
        return valid_sequences if valid_sequences else [[]]
    
    @staticmethod
    def _die_used(board: Board, move: Move, color: Color) -> int:
        """Calcule quel dé a été utilisé pour ce coup."""
        if move.to_point == 24 or move.to_point == -1:
            # Bear off
            if color == Color.WHITE:
                return 24 - move.from_point
            else:
                return move.from_point + 1
        else:
            return abs(move.to_point - move.from_point)
    
    @staticmethod
    def _generate_move_sequences(board: Board, color: Color, 
                                  remaining_dice: List[int],
                                  current_sequence: List[Move] = None) -> List[List[Move]]:
        """Génère récursivement toutes les séquences de coups."""
        if current_sequence is None:
            current_sequence = []
        
        if not remaining_dice:
            return [current_sequence.copy()]
        
        all_sequences = []
        seen_boards = set()
        
        for die in set(remaining_dice):  # Éviter les doublons
            moves = BackgammonRules._get_single_moves(board, color, die)
            
            for move in moves:
                # Appliquer le coup
                new_board = BackgammonRules.apply_move(board.copy(), color, move)
                board_hash = BackgammonRules._board_hash(new_board)
                
                if board_hash not in seen_boards:
                    seen_boards.add(board_hash)
                    new_remaining = remaining_dice.copy()
                    new_remaining.remove(die)
                    new_sequence = current_sequence + [move]
                    
                    sub_sequences = BackgammonRules._generate_move_sequences(
                        new_board, color, new_remaining, new_sequence
                    )
                    all_sequences.extend(sub_sequences)
        
        # Si aucun coup possible avec les dés restants
        if not all_sequences:
            all_sequences.append(current_sequence.copy())
        
        return all_sequences
    
    @staticmethod
    def _board_hash(board: Board) -> str:
        """Hash du plateau pour déduplication."""
        return str([p.checkers for p in board.points]) + str(board.bar) + str(board.borne_off)
    
    @staticmethod
    def _get_single_moves(board: Board, color: Color, die: int) -> List[Move]:
        """Génère tous les coups possibles avec un seul dé."""
        moves = []
        direction = 1 if color == Color.WHITE else -1
        
        # Si des pions sur la barre, on doit d'abord les rentrer
        if board.bar[color] > 0:
            if color == Color.WHITE:
                target = die - 1  # Dé 1 = point 1 = index 0
            else:
                target = 24 - die  # Dé 1 = point 24 = index 23
            
            if 0 <= target < 24 and board.points[target].can_land(color):
                is_hit = board.points[target].would_hit(color)
                moves.append(Move(-1, target, is_hit))
            return moves
        
        # Coups normaux
        for i in range(24):
            point = board.points[i]
            if (color == Color.WHITE and point.checkers > 0) or \
               (color == Color.BLACK and point.checkers < 0):
                target = i + (die * direction)
                
                # Bear off
                if board.can_bear_off(color):
                    if color == Color.WHITE:
                        if target >= 24:
                            # Exact ou depuis le point le plus éloigné
                            if target == 24 or (i == BackgammonRules._furthest_checker(board, color)):
                                moves.append(Move(i, 24, False))
                    else:
                        if target < 0:
                            if target == -1 or (i == BackgammonRules._furthest_checker(board, color)):
                                moves.append(Move(i, -1, False))
                
                # Mouvement normal
                if 0 <= target < 24:
                    if board.points[target].can_land(color):
                        is_hit = board.points[target].would_hit(color)
                        moves.append(Move(i, target, is_hit))
        
        return moves
    
    @staticmethod
    def _furthest_checker(board: Board, color: Color) -> int:
        """Trouve le pion le plus éloigné du home board."""
        if color == Color.WHITE:
            for i in range(24):
                if board.points[i].checkers > 0:
                    return i
        else:
            for i in range(23, -1, -1):
                if board.points[i].checkers < 0:
                    return i
        return -1
    
    @staticmethod
    def apply_move(board: Board, color: Color, move: Move) -> Board:
        """Applique un coup au plateau."""
        value = 1 if color == Color.WHITE else -1
        
        # Retirer le pion de la source
        if move.from_point == -1:
            board.bar[color] -= 1
        else:
            board.points[move.from_point].checkers -= value
        
        # Gérer le hit
        if move.is_hit:
            opponent = Color.BLACK if color == Color.WHITE else Color.WHITE
            board.points[move.to_point].checkers = 0
            board.bar[opponent] += 1
        
        # Placer le pion à la destination
        if move.to_point == 24 or move.to_point == -1:
            board.borne_off[color] += 1
        else:
            board.points[move.to_point].checkers += value
        
        return board
    
    @staticmethod
    def apply_moves(board: Board, color: Color, moves: List[Move]) -> Board:
        """Applique une séquence de coups."""
        for move in moves:
            board = BackgammonRules.apply_move(board, color, move)
        return board


# Test rapide
if __name__ == "__main__":
    board = Board.initial()
    print("Position initiale:")
    print(f"Pip count White: {board.pip_count(Color.WHITE)}")
    print(f"Pip count Black: {board.pip_count(Color.BLACK)}")
    
    # Générer des coups
    dice = (6, 4)
    moves = BackgammonRules.get_all_moves(board, Color.WHITE, dice)
    print(f"\nCoups possibles avec {dice}: {len(moves)}")
    for i, seq in enumerate(moves[:5]):
        print(f"  {i+1}: {' '.join(str(m) for m in seq)}")
