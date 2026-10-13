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