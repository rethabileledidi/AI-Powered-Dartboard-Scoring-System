import math

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