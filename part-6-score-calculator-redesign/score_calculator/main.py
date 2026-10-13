#!/usr/bin/env python3
"""
Consolidated Dart Score Calculator & Algorithm
All modules combined into a single file for easy copying and pasting.

Original structure:
- main.py: Main game loop and user interface
- game_manager.py: Game management and coordination
- history_logger.py: Score tracking and game history
- score_logic.py: Game logic for Cricket, 501, and Around the Clock
- utils.py: Utility functions for calculations and input validation
"""

import datetime
import json
import math
import os


# ============================================================================
# UTILITY FUNCTIONS (from utils.py)
# ============================================================================

def calculate_distance(x, y, center_x=0.5, center_y=0.5):
    return math.hypot(x - center_x, y - center_y)

def calculate_angle(x, y, center_x=0.5, center_y=0.5):
    angle = math.degrees(math.atan2(y - center_y, x - center_x))
    return (angle + 360) % 360  # Normalize to 0-360

def validate_score(score, min_score=0, max_score=180):
    return min_score <= score <= max_score

def format_scoreboard(scores):
    output = "Scoreboard:\n"
    for player, score in scores.items():
        output += f"{player}: {score}\n"
    return output

def get_int_input(prompt):
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            print("Please enter a valid integer.")

def get_coordinate_input(prompt, min_val=0, max_val=1):
    while True:
        try:
            value = float(input(prompt))
            if min_val <= value <= max_val:
                return value
            print(f"Value must be between {min_val} and {max_val}")
        except ValueError:
            print("Please enter a valid number.")


# ============================================================================
# SCORE HISTORY LOGGER (from history_logger.py)
# ============================================================================

class ScoreHistory:
    def __init__(self):
        self.history = []
        self.start_time = datetime.datetime.now()

    def log_throw(self, player, x, y, score):
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "player": player,
            "x": x,
            "y": y,
            "score": score
        }
        self.history.append(entry)
        return entry
    
    def save_to_file(self, filename):
        game_data = {
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.datetime.now().isoformat(),
            "duration": (datetime.datetime.now() - self.start_time).total_seconds(),
            "throws": self.history
        }
        
        with open(filename, 'w') as f:
            json.dump(game_data, f, indent=2)
    
    def get_player_stats(self, player):
        player_throws = [t for t in self.history if t['player'] == player]
        if not player_throws:
            return None
            
        total_score = sum(t['score'] for t in player_throws)
        average = total_score / len(player_throws) if player_throws else 0
        
        return {
            "total_throws": len(player_throws),
            "total_score": total_score,
            "average": average,
            "max_score": max(t['score'] for t in player_throws) if player_throws else 0
        }


# ============================================================================
# GAME LOGIC CLASSES (from score_logic.py)
# ============================================================================

class CricketGame:
    def __init__(self, players):
        self.players = players
        self.scores = {player: {n: 0 for n in range(15, 21)} for player in players}
        for player in players:
            self.scores[player][25] = 0  # Bullseye
        self.closed_numbers = {n: False for n in list(range(15, 21)) + [25]}
        self.game_over = False
        self.winner = None

    def process_throw(self, player, x, y, score):
        if self.game_over:
            return False
            
        if score not in self.scores[player]:
            return False  # Invalid number for cricket
            
        # Update hits
        if self.scores[player][score] < 3:
            self.scores[player][score] += 1
            
            # Check if this player just closed this number
            if self.scores[player][score] == 3:
                self.closed_numbers[score] = True
                
        # Check for win condition
        return self.check_winner()
    
    def check_winner(self):
        if self.game_over:
            return self.winner
            
        # Check if any player has closed all numbers
        for current_player in self.players:
            if all(hits >= 3 for hits in self.scores[current_player].values()):
                # Check if this player has the highest points
                player_points = self.calculate_points(current_player)
                other_players_points = [self.calculate_points(p) for p in self.players if p != current_player]
                
                if all(player_points >= op_points for op_points in other_players_points):
                    self.game_over = True
                    self.winner = current_player
                    return current_player
                    
        return None
    
    def calculate_points(self, player):
        points = 0
        for number, hits in self.scores[player].items():
            if hits > 3:  # Points only after closing
                points += number * (hits - 3)
            elif not self.closed_numbers[number]:  # Can score on unclosed numbers
                points += number * hits
        return points


class Game501:
    def __init__(self, players):
        self.players = players
        self.scores = {player: 501 for player in players}
        self.current_scores = {player: 0 for player in players}  # Score in current turn
        self.dart_count = {player: 0 for player in players}  # Darts thrown in current turn
        self.game_over = False
        self.winner = None

    def process_throw(self, player, x, y, score):
        if self.game_over:
            return False
            
        self.dart_count[player] += 1
        self.current_scores[player] += score
        
        # Check if bust (would go below 0 or end with 1)
        remaining = self.scores[player] - self.current_scores[player]
        if remaining < 0 or (remaining == 1 and self.dart_count[player] == 3):
        
            # Bust - reset turn
            self.current_scores[player] = 0
            self.dart_count[player] = 0
            return False
        elif self.dart_count[player] == 3:  # End of turn
            self.scores[player] -= self.current_scores[player]
            self.current_scores[player] = 0
            self.dart_count[player] = 0
            
            # Check for win
            if self.scores[player] == 0:
                self.game_over = True
                self.winner = player
                return player
                
        return None
    
    def check_winner(self):
        return self.winner


class AroundTheClock:
    def __init__(self, players):
        self.players = players
        self.targets = {player: 1 for player in players}
        self.game_over = False
        self.winner = None

    def process_throw(self, player, x, y, score):
        if self.game_over:
            return False
            
        # Player must hit their current target number
        if score == self.targets[player]:
            self.targets[player] += 1
            
            # Check for win condition
            if self.targets[player] > 20:  # Game ends at 20
                self.game_over = True
                self.winner = player
                return player
                
        return None
    
    def check_winner(self):
        return self.winner


# ============================================================================
# GAME MANAGER (from game_manager.py)
# ============================================================================

class GameManager:
    def __init__(self, game_type, players):
        self.game_type = game_type  # Store game type for reference
        if game_type == "cricket":
            self.game = CricketGame(players)
        elif game_type == "501":
            self.game = Game501(players)
        elif game_type == "around_the_clock":
            self.game = AroundTheClock(players)
        else:
            raise ValueError("Unknown game type")

    def process_throw(self, player, x, y, score):
        return self.game.process_throw(player, x, y, score)

    def check_winner(self):
        return self.game.check_winner()

    def get_scoreboard(self):
        if hasattr(self.game, 'scores'):
            return self.game.scores
        elif hasattr(self.game, 'targets'):
            return self.game.targets
        return {}


# ============================================================================
# MAIN GAME INTERFACE (from main.py)
# ============================================================================

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def display_scoreboard(manager):
    scores = manager.get_scoreboard()
    
    if manager.game_type == "cricket":
        print("\n--- Cricket Scoreboard ---")
        print("Player".ljust(15), end="")
        for num in list(range(15, 21)) + [25]:
            print(str(num).rjust(4), end="")
        print(" Points".rjust(8))
        print("-" * 50)
        
        for player, player_scores in scores.items():
            print(player.ljust(15), end="")
            for num in list(range(15, 21)) + [25]:
                hits = player_scores[num]
                if hits >= 3:
                    display = "C" if hits == 3 else str(hits-3)
                else:
                    display = str(hits)
                print(display.rjust(4), end="")
            
            # Calculate points
            points = 0
            for num, hits in player_scores.items():
                if hits > 3: # Points only after closing
                    points += num * (hits - 3)
                elif not manager.game.closed_numbers[num]: # Can score on unclosed numbers
                    points += num * hits
            print(str(points).rjust(8))
            
    elif manager.game_type == "501":
        print("\n--- 501 Scoreboard ---")
        for player, score in scores.items():
            print(f"{player}: {score}")
            
    elif manager.game_type == "around_the_clock":
        print("\n--- Around the Clock Progress ---")
        for player, target in scores.items():
            status = "Finished!" if target > 20 else f"Next: {target}"
            print(f"{player}: {status}")

def main():
    clear_screen()
    print("Welcome to Dart Score Tracker!")
    
    # Game type selection
    while True:
        game_type = input("Select game (cricket/501/around_the_clock): ").strip().lower()
        if game_type in ["cricket", "501", "around_the_clock"]:
            break
        print("Invalid game type. Please choose from cricket, 501, or around_the_clock.")
    
    # Player setup
    while True:
        players_input = input("Enter player names separated by commas: ").strip()
        players = [p.strip() for p in players_input.split(",") if p.strip()]
        if len(players) >= 1:
            break
        print("Please enter at least one player.")
    
    manager = GameManager(game_type, players)
    history = ScoreHistory()
    
    clear_screen()
    print(f"Starting {game_type} game with players: {', '.join(players)}")
    
    # Main game loop
    while True:
        for player in players:
            print(f"\n{player}'s turn.")
            display_scoreboard(manager)
            
            # Reset for new turn
            darts_thrown = 0
            turn_score = 0
            
            while darts_thrown < 3:
                print(f"\nDart {darts_thrown + 1}/3")
                try:
                    x = get_int_input("Enter x coordinate (0-1): ")
                    y = get_int_input("Enter y coordinate (0-1): ")
                    score = get_int_input("Enter score: ")
                    
                    if not validate_score(score):
                        print("Invalid score! Must be between 0 and 180.")
                        continue
                    
                    # Process the throw
                    result = manager.process_throw(player, x, y, score)
                    history.log_throw(player, x, y, score)
                    darts_thrown += 1
                    turn_score += score
                    
                    # Display result
                    if result is not None and result != False:
                        print(f"Good throw! Score: {score}")
                    elif result is False:
                        print("Invalid throw for this game type.")
                    
                    # Check if this throw ended the game
                    if result and isinstance(result, str):  # Winner returned
                        clear_screen()
                        print(f"\n🎉 Game Over! Winner: {result} 🎉")
                        display_scoreboard(manager)
                        
                        # Save game history
                        filename = f"{game_type}_game_{'_'.join(players)}.txt"
                        history.save_to_file(filename)
                        print(f"Game history saved to {filename}")
                        return  # End the game
                    
                except ValueError:
                    print("Please enter valid numbers.")
                    continue
            
            print(f"{player}'s turn ended with {turn_score} points.")
            
            # Check for winner after each turn
            winner = manager.check_winner()
            if winner:
                clear_screen()
                print(f"\n🎉 Game Over! Winner: {winner} 🎉")
                display_scoreboard(manager)
                
                # Save game history
                filename = f"{game_type}_game_{'_'.join(players)}.txt"
                history.save_to_file(filename)
                print(f"Game history saved to {filename}")
                
                return  # End the game


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()