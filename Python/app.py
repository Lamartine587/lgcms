# ml_app.py
from flask import Flask, jsonify, request
from pymongo import MongoClient # type: ignore
import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
import numpy as np
from flask_cors import CORS # Import CORS

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes in the Flask app

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/lgcms_db')
client = MongoClient(MONGO_URI)
db = client.get_database() # Gets the database specified in MONGO_URI

# Ensure collections exist for demonstration
users_collection = db.users
complaints_collection = db.complaints

@app.route('/')
def index():
    return "ML Backend is running!"

def get_complaints_dataframe():
    """Fetches complaints from MongoDB and returns a pandas DataFrame."""
    try:
        complaints_cursor = complaints_collection.find({})
        complaints_data = list(complaints_cursor)
        
        if not complaints_data:
            return pd.DataFrame() # Return empty DataFrame if no data

        df = pd.DataFrame(complaints_data)
        
        if '_id' in df.columns:
            df['_id'] = df['_id'].astype(str)
        if 'user' in df.columns:
            df['user'] = df['user'].astype(str) # Convert user ObjectId to string
        
        if 'createdAt' in df.columns:
            df['createdAt'] = pd.to_datetime(df['createdAt'])
        
        return df
    except Exception as e:
        print(f"Error fetching complaints for DataFrame: {e}")
        return pd.DataFrame()

def plot_to_base64(plt_figure):
    """Converts a Matplotlib figure to a base64 encoded PNG image."""
    buf = io.BytesIO()
    plt_figure.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(plt_figure) # Close the figure to free memory
    return image_base64

@app.route('/api/ml/complaint_status_distribution', methods=['GET'])
def get_complaint_status_distribution():
    """Generates a pie chart of complaint statuses."""
    df = get_complaints_dataframe()
    if df.empty:
        return jsonify({"message": "No complaints data available for analysis.", "image": ""}), 200

    status_counts = df['status'].value_counts()

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pie(status_counts, labels=status_counts.index, autopct='%1.1f%%', startangle=90,
           colors=plt.cm.Paired.colors)
    ax.set_title('Complaint Status Distribution')
    
    image_base64 = plot_to_base64(fig)
    return jsonify({"message": "Complaint status distribution generated.", "image": image_base64}), 200

@app.route('/api/ml/complaint_trends', methods=['GET'])
def get_complaint_trends():
    """Generates a line chart of complaint trends over time (e.g., daily counts)."""
    df = get_complaints_dataframe()
    if df.empty or 'createdAt' not in df.columns:
        return jsonify({"message": "No complaints data or 'createdAt' field available for trend analysis.", "image": ""}), 200

    df['date'] = df['createdAt'].dt.date
    daily_counts = df.groupby('date').size().sort_index()

    if daily_counts.empty:
        return jsonify({"message": "No daily complaint counts available.", "image": ""}), 200

    fig, ax = plt.subplots(figsize=(10, 5))
    daily_counts.plot(kind='line', marker='o', ax=ax, color='green')
    ax.set_title('Complaints Over Time')
    ax.set_xlabel('Date')
    ax.set_ylabel('Number of Complaints')
    ax.grid(True, linestyle='--', alpha=0.7)
    plt.xticks(rotation=45)
    plt.tight_layout()

    image_base64 = plot_to_base64(fig)
    return jsonify({"message": "Complaint trends generated.", "image": image_base64}), 200

@app.route('/api/ml/user_role_distribution', methods=['GET'])
def get_user_role_distribution():
    """Generates a pie chart of user role distribution."""
    try:
        users_cursor = users_collection.find({})
        users_data = list(users_cursor)
        
        if not users_data:
            return jsonify({"message": "No user data available for analysis.", "image": ""}), 200

        df_users = pd.DataFrame(users_data)
        
        if 'role' not in df_users.columns:
            return jsonify({"message": "User data missing 'role' field.", "image": ""}), 200

        role_counts = df_users['role'].value_counts()

        fig, ax = plt.subplots(figsize=(6, 6))
        ax.pie(role_counts, labels=role_counts.index, autopct='%1.1f%%', startangle=90,
               colors=plt.cm.Set3.colors)
        ax.set_title('User Role Distribution')
        
        image_base64 = plot_to_base64(fig)
        return jsonify({"message": "User role distribution generated.", "image": image_base64}), 200
    except Exception as e:
        print(f"Error fetching user role distribution: {e}")
        return jsonify({"message": f"Error: {str(e)}", "image": ""}), 500


@app.route('/api/ml/predict/resolution_time', methods=['POST'])
def predict_resolution_time():
    """
    A placeholder for a simple prediction model.
    This is a highly simplified example and would need proper ML pipeline.
    Expects JSON input like: {"complaint_description_length": 150, "num_evidence_files": 2}
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid input. Please provide JSON data."}), 400

    try:
        desc_length = data.get('complaint_description_length', 0)
        num_evidence = data.get('num_evidence_files', 0)

        # Create dummy training data if no real data is available or for initial setup
        X_train = np.array([[100, 1], [200, 2], [50, 0], [300, 3], [120, 1]])
        y_train = np.array([8, 15, 4, 20, 10]) # Resolution times in days

        model = LinearRegression()
        model.fit(X_train, y_train)

        # Predict for the input data
        predicted_days = model.predict([[desc_length, num_evidence]])[0]
        
        predicted_days = max(1, round(predicted_days, 1))

        return jsonify({
            "message": "Prediction generated successfully.",
            "predicted_resolution_time_days": predicted_days,
            "explanation": "This is a simplified prediction based on description length and number of evidence files. A more accurate model would require extensive historical data and feature engineering."
        }), 200

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({"message": f"Error during prediction: {str(e)}"}), 500

if __name__ == '__main__':
    try:
        client.admin.command('ping')
        print("MongoDB connection successful!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
    
    app.run(debug=True, port=5001)
