import datetime
import json

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