import os
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app)

# Setup the Flask-JWT-Extended extension
app.config["JWT_SECRET_KEY"] = secrets.token_hex(32)
jwt = JWTManager(app)

# This dictionary acts as a simple, in-memory database for users and questions.
# In a production environment, you would use a real database like PostgreSQL or MySQL.
users = {}
questions = [
    {
        "id": 1,
        "question": "What is the capital of France?",
        "options": ["Berlin", "Madrid", "Paris", "Rome"],
        "correct_answer": "Paris"
    },
    {
        "id": 2,
        "question": "Which planet is known as the Red Planet?",
        "options": ["Earth", "Mars", "Jupiter", "Saturn"],
        "correct_answer": "Mars"
    },
    {
        "id": 3,
        "question": "What is the largest ocean on Earth?",
        "options": ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        "correct_answer": "Pacific Ocean"
    },
    {
        "id": 4,
        "question": "Who wrote 'To Kill a Mockingbird'?",
        "options": ["Harper Lee", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald"],
        "correct_answer": "Harper Lee"
    },
    {
        "id": 5,
        "question": "What is the square root of 64?",
        "options": ["6", "7", "8", "9"],
        "correct_answer": "8"
    }
]

# --- User Authentication Endpoints ---
@app.route("/register", methods=["POST"])
def register():
    """Endpoint for user registration."""
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    if username in users:
        return jsonify({"msg": "User already exists"}), 409

    users[username] = password  # Storing password in plaintext for simplicity. In production, use hashing.
    return jsonify({"msg": "User registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    """Endpoint for user login and token generation."""
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400

    if username not in users or users[username] != password:
        return jsonify({"msg": "Invalid username or password"}), 401

    # Create a JWT token for the authenticated user
    access_token = create_access_token(identity=username)
    return jsonify(access_token=access_token)

# --- Exam Endpoints (Protected) ---
@app.route("/api/questions", methods=["GET"])
@jwt_required()
def get_questions():
    """Returns the list of exam questions."""
    # current_user = get_jwt_identity() # You can get the current user from the token if needed
    
    # We only send the question and options, not the correct answer
    question_data = [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in questions]
    return jsonify(question_data)

@app.route("/api/submit", methods=["POST"])
@jwt_required()
def submit_exam():
    """Receives user answers, scores the exam, and returns the results."""
    user_answers = request.get_json()
    score = 0
    total = len(questions)
    correct_answers = {}

    question_map = {q["id"]: q for q in questions}

    for answer in user_answers:
        q_id = answer["id"]
        user_option = answer["selected_option"]
        
        if q_id in question_map:
            correct_option = question_map[q_id]["correct_answer"]
            correct_answers[q_id] = correct_option
            if user_option == correct_option:
                score += 1
    
    return jsonify({
        "score": score,
        "total": total,
        "correct_answers": correct_answers
    })

# Main entry point for the application
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
