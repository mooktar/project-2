from flask import Flask, render_template, url_for, session, redirect, request
from flask_socketio import SocketIO, emit, join_room, leave_room

from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = "SECRET_KEY"
socketio = SocketIO(app)


users = []
channels = {"general": []}
messages = {"general": []}


@app.route("/", methods=["GET", "POST"])
def index():
    error = ''
    if request.method == "POST":
        username = request.form.get("username")
        # Chack error on inputs and existing users
        if not username or ' ' in username or username[0] in '0123456789':
            error = f"-{username}- exists or contains an error."
            return render_template("index.html", channels=channels, error=error)
        else:
            if username not in users:
                users.append(username)
            # Create session
            session["username"] = username
            session['logged_in'] = True
            return redirect(url_for('index'))
    return render_template("index.html", channels=channels, error=error, users=users)


@app.route("/logout")
def logout():
    # Destroy current session
    session.pop('username', None)
    session['logged_in'] = False
    return redirect(url_for('index'))


@socketio.on("create")
def create_channel(channel):
    """Create new channel if not exist."""

    # Check error on inputs and existing users
    if not channel or ' ' in channel:
        emit("created", {"success": False,
                         "error": f"Can't create empty channel."})
    elif channel[0] in '0123456789.;,:?/<>()@"}{!#^&*%`-_=+':
        emit("created", {"success": False,
                         "error": f"Channel's name can't start with a number or special caraters."})
    elif channel in channels:
        emit("created", {"success": False,
                         "error": f"This channel exists."})
    else:
        channels[channel], messages[channel] = [], []
        session["current_room"] = channel
        emit("created", {"success": True,
                         "channel": channel}, broadcast=True)


@socketio.on("join")
def on_join(channel):
    """Join the current room and update its messages."""

    user, room = session.get('username'), channel
    timestamp = datetime.now().strftime('%H:%M')
    statut = f"{user} has connected | {timestamp}"
    # Join this room
    if user != "" and user != None and room in channels and room != session.get('current_room'):
        join_room(room)
        session["current_room"] = room
        # Check user session id in this room (request.sid)
        if user not in channels[room]:
            channels[room].append(user)
            messages[room].append(['statut', timestamp, statut])
        # Clear room's messages has over 100
        if len(messages[channel]) > 100:
            messages[channel].pop(0)
        # Broadcast to this channel
        emit("joined", {"channel": room, "user": user,
                        "messages": messages[channel]}, room=request.sid)


@socketio.on("leave")
def on_leave(channel):
    """Leave the current room."""

    user = session.get('username')
    timestamp = datetime.now().strftime('%H:%M')
    room = str(channel).lower()
    if user in channels[room]:
        leave_room(room)
        channels[room].remove(user)
        messages[room].append(
            ['statut', timestamp, f"{user} has left | {timestamp}"])
        emit("left", {"channel": room, "user": user,
                      "messages": messages[room]}, room=room)


@socketio.on("send")
def send_message(data):
    """Send new messages to the current room."""

    user = session.get("username")
    timestamp = datetime.now().strftime('%H:%M')
    room = data["channel"].lower()
    message = data["message"]
    if message != "":
        messages[room].append([user, timestamp, message])
        emit("sent", {"user": user, "time": timestamp,
                      "message": message}, room=room)


@socketio.on("delete")
def delete_message(data):
    """Select a message and remove it from messages storage."""

    room = data["channel"]
    for message in messages[room]:
        for item in message:
            if item == data["message"]:
                messages[room].remove(message)
    emit("deleted", {
         "messages": messages[room], "user": session.get("username")}, room=request.sid)


if __name__ == "__main__":
    socketio.run(app, debug=True)
