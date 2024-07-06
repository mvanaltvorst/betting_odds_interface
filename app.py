from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import numpy as np
import pandas as pd

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(app)

state = {
    "team1_name": "Team 1",
    "team2_name": "Team 2",
    "team1_odds": 6.0,
    "draw_odds": 3.0,
    "team2_odds": 2,
    "team1_advancing_odds": 1.5,
    "team2_advancing_odds": 2.5,
}


def betting_implied_ask(odds):
    return 1 / np.array(odds)


def betting_implied_mean(odds):
    implied_probs = 1 / np.array(odds)
    return implied_probs / np.sum(implied_probs)


def advancing_probs(team1_advancing_odds, team2_advancing_odds):
    match_odds = np.array([team1_advancing_odds, float("inf"), team2_advancing_odds])
    implied_probs = 1 / match_odds
    return implied_probs / np.sum(implied_probs)


def calculate_probabilities():
    match_odds = [state["team1_odds"], state["draw_odds"], state["team2_odds"]]
    methods = [
        ("Match Ask", betting_implied_ask(match_odds)),
        ("Match Mean", betting_implied_mean(match_odds)),
        (
            "Advancing Mean",
            advancing_probs(
                state["team1_advancing_odds"], state["team2_advancing_odds"]
            ),
        ),
    ]
    data = []
    for method, probs in methods:
        row = [method] + [f"{prob*100:.1f}%" for prob in probs]
        data.append(row)
    df = pd.DataFrame(
        data, columns=["Method", state["team1_name"], "Draw", state["team2_name"]]
    )
    return df.to_dict("records")


def calculate_match_margin():
    match_odds = [state["team1_odds"], state["draw_odds"], state["team2_odds"]]
    match_margin = np.sum(1 / np.array(match_odds)) - 1
    return f"{match_margin:.2%}"


def calculate_advancing_margin():
    match_odds = [state["team1_advancing_odds"], state["team2_advancing_odds"]]
    advancing_margin = np.sum(1 / np.array(match_odds)) - 1
    return f"{advancing_margin:.2%}"


@app.route("/")
def index():
    return render_template("index.html", state=state)


@socketio.on("update_odds")
def handle_update_odds(data):
    state.update(data)
    probabilities = calculate_probabilities()
    match_margin = calculate_match_margin()
    advancing_margin = calculate_advancing_margin()
    emit(
        "odds_updated",
        {
            "state": state,
            "probabilities": probabilities,
            "match_margin": match_margin,
            "advancing_margin": advancing_margin,
        },
        broadcast=True,
    )


if __name__ == "__main__":
    socketio.run(app, debug=True, port=5001)
