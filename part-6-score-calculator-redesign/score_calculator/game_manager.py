from score_logic import CricketGame, Game501, AroundTheClock

class GameManager:
    def __init__(self, game_type, players):
        self.game_type = game_type #Store game type for reference
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