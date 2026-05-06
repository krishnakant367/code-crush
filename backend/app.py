import base64
import cv2
import numpy as np
from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
from gesture_recognition import recognize_gesture

app = Flask(__name__, static_folder="../frontend", static_url_path="/")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)

from flask import request, jsonify

@app.route("/api/gesture", methods=["POST"])
def api_gesture():
    try:
        data = request.json
        if not data or "image" not in data:
            return jsonify({"error": "Missing 'image' in request body. Provide a base64 encoded image."}), 400
            
        img_str = data["image"]
        if "base64," in img_str:
            img_str = img_str.split("base64,")[1]
            
        img_data = base64.b64decode(img_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is not None:
            gesture_text = recognize_gesture(img)
            return jsonify({"gesture": gesture_text or "No clear gesture detected"})
        else:
            return jsonify({"error": "Invalid image format"}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@socketio.on("video_frame")
def handle_video_frame(data):
    try:
        # data is a base64 encoded jpeg image
        if "base64," in data:
            data = data.split("base64,")[1]
            
        # Decode base64 to image
        img_data = base64.b64decode(data)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is not None:
            gesture_text = recognize_gesture(img)
            if gesture_text:
                emit("gesture_result", {"text": gesture_text})
                
    except Exception as e:
        print(f"Error processing frame: {e}")

if __name__ == "__main__":
    print("Starting server on http://localhost:5001")
    socketio.run(app, host="0.0.0.0", port=5001)
