from flask import Flask, jsonify, request
from pymongo import MongoClient
import pandas as pd
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
import numpy as np
from flask_cors import CORS
import os
from dotenv import load_dotenv
import joblib
import logging
from functools import lru_cache
import jwt
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/ml/*": {"origins": os.getenv('CLIENT_URL', 'http://localhost:5000')}})

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/lgcms_db')
client = MongoClient(MONGO_URI, maxPoolSize=50)  # Connection pooling
db = client.get_database()

# Collections
users_collection = db.users
complaints_collection = db.complaints

# Model persistence
MODEL_PATH = 'resolution_time_model.joblib'
label_encoders = {}

# JWT Secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')

@app.route('/')
def index():
    return "ML Backend is running!"

@lru_cache(maxsize=1)
def get_complaints_dataframe():
    """Fetches complaints from MongoDB and returns a cached pandas DataFrame."""
    try:
        logger.info("Fetching complaints from MongoDB")
        complaints_cursor = complaints_collection.find({})
        complaints_data = list(complaints_cursor)
        
        if not complaints_data:
            logger.warning("No complaints data found")
            return pd.DataFrame()

        df = pd.DataFrame(complaints_data)
        
        if '_id' in df.columns:
            df['_id'] = df['_id'].astype(str)
        if 'user' in df.columns:
            df['user'] = df['user'].astype(str)
        if 'createdAt' in df.columns:
            df['createdAt'] = pd.to_datetime(df['createdAt'])
        if 'updatedAt' in df.columns:
            df['updatedAt'] = pd.to_datetime(df['updatedAt'])
        
        logger.info(f"Loaded {len(df)} complaints")
        return df
    except Exception as e:
        logger.error(f"Error fetching complaints: {e}")
        return pd.DataFrame()

def train_resolution_model():
    """Trains a linear regression model for resolution time prediction."""
    try:
        df = get_complaints_dataframe()
        if df.empty or 'createdAt' not in df.columns or 'updatedAt' not in df.columns:
            logger.warning("Insufficient data for training model")
            return None, None

        # Calculate resolution time (days)
        df['resolution_time'] = (df['updatedAt'] - df['createdAt']).dt.total_seconds() / (24 * 3600)
        df = df[df['status'] == 'resolved']  # Only use resolved complaints

        if df.empty:
            logger.warning("No resolved complaints for training")
            return None, None

        # Feature engineering
        df['desc_length'] = df['description'].apply(lambda x: len(str(x).split()))
        df['num_evidence'] = df.get('evidenceImages', []).apply(len)  # Adjust based on your schema
        
        # Encode categorical features
        global label_encoders
        if 'category' in df.columns:
            label_encoders['category'] = LabelEncoder()
            df['category_encoded'] = label_encoders['category'].fit_transform(df['category'])
        if 'priority' in df.columns:
            label_encoders['priority'] = LabelEncoder()
            df['priority_encoded'] = label_encoders['priority'].fit_transform(df['priority'])

        features = ['desc_length', 'num_evidence']
        if 'category' in df.columns:
            features.append('category_encoded')
        if 'priority' in df.columns:
            features.append('priority_encoded')

        X = df[features]
        y = df['resolution_time']

        model = LinearRegression()
        model.fit(X, y)
        
        # Save model and encoders
        joblib.dump(model, MODEL_PATH)
        for key, encoder in label_encoders.items():
            joblib.dump(encoder, f'{key}_encoder.joblib')

        logger.info("Model trained and saved successfully")
        return model, features
    except Exception as e:
        logger.error(f"Error training model: {e}")
        return None, None

def load_model():
    """Loads the trained model and label encoders."""
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            for key in ['category', 'priority']:
                if os.path.exists(f'{key}_encoder.joblib'):
                    label_encoders[key] = joblib.load(f'{key}_encoder.joblib')
            logger.info("Model and encoders loaded")
            return model
        return None
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None

@app.route('/api/ml/complaint_status_distribution', methods=['GET'])
def get_complaint_status_distribution():
    """Returns Chart.js-compatible data for complaint status distribution."""
    try:
        df = get_complaints_dataframe()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date and end_date:
            df = df[(df['createdAt'] >= pd.to_datetime(start_date)) & 
                    (df['createdAt'] <= pd.to_datetime(end_date))]

        if df.empty:
            return jsonify({"message": "No complaints data available.", "data": {}}), 200

        status_counts = df['status'].value_counts()

        chart_data = {
            "type": "pie",
            "data": {
                "labels": status_counts.index.tolist(),
                "datasets": [{
                    "data": status_counts.values.tolist(),
                    "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
                }]
            },
            "options": {
                "responsive": true,
                "plugins": {"title": {"display": True, "text": "Complaint Status Distribution"}}
            }
        }
        
        return jsonify({"message": "Complaint status distribution generated.", "data": chart_data}), 200
    except Exception as e:
        logger.error(f"Error generating status distribution: {e}")
        return jsonify({"message": f"Error: {str(e)}", "data": {}}), 500

@app.route('/api/ml/complaint_trends', methods=['GET'])
def get_complaint_trends():
    """Returns Chart.js-compatible data for complaint trends over time."""
    try:
        df = get_complaints_dataframe()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date and end_date:
            df = df[(df['createdAt'] >= pd.to_datetime(start_date)) & 
                    (df['createdAt'] <= pd.to_datetime(end_date))]

        if df.empty or 'createdAt' not in df.columns:
            return jsonify({"message": "No complaints data available.", "data": {}}), 200

        df['date'] = df['createdAt'].dt.date
        daily_counts = df.groupby('date').size().sort_index()

        chart_data = {
            "type": "line",
            "data": {
                "labels": daily_counts.index.map(str).tolist(),
                "datasets": [{
                    "label": "Complaints",
                    "data": daily_counts.values.tolist(),
                    "borderColor": "#36A2EB",
                    "fill": False
                }]
            },
            "options": {
                "responsive": True,
                "plugins": {"title": {"display": True, "text": "Complaints Over Time"}},
                "scales": {
                    "x": {"title": {"display": True, "text": "Date"}},
                    "y": {"title": {"display": True, "text": "Number of Complaints"}}
                }
            }
        }
        
        return jsonify({"message": "Complaint trends generated.", "data": chart_data}), 200
    except Exception as e:
        logger.error(f"Error generating trends: {e}")
        return jsonify({"message": f"Error: {str(e)}", "data": {}}), 500

@app.route('/api/ml/user_role_distribution', methods=['GET'])
def get_user_role_distribution():
    """Returns Chart.js-compatible data for user role distribution."""
    try:
        users_cursor = users_collection.find({})
        users_data = list(users_cursor)
        
        if not users_data:
            return jsonify({"message": "No user data available.", "data": {}}), 200

        df_users = pd.DataFrame(users_data)
        
        if 'role' not in df_users.columns:
            return jsonify({"message": "User data missing 'role' field.", "data": {}}), 200

        role_counts = df_users['role'].value_counts()

        chart_data = {
            "type": "pie",
            "data": {
                "labels": role_counts.index.tolist(),
                "datasets": [{
                    "data": role_counts.values.tolist(),
                    "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
                }]
            },
            "options": {
                "responsive": True,
                "plugins": {"title": {"display": True, "text": "User Role Distribution"}}
            }
        }
        
        return jsonify({"message": "User role distribution generated.", "data": chart_data}), 200
    except Exception as e:
        logger.error(f"Error generating role distribution: {e}")
        return jsonify({"message": f"Error: {str(e)}", "data": {}}), 500

def verify_jwt_token(token):
    """Verify JWT token for admin access."""
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        if decoded['role'] != 'admin':
            raise jwt.InvalidTokenError("Admin access required")
        return decoded
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError as e:
        raise Exception(f"Invalid token: {str(e)}")

@app.route('/api/ml/retrain_model', methods=['POST'])
def retrain_model():
    """Retrain the resolution time prediction model (admin only)."""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"message": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(' ')[1]
        verify_jwt_token(token)

        model, features = train_resolution_model()
        if model is None:
            return jsonify({"message": "Failed to train model due to insufficient data"}), 400

        return jsonify({"message": "Model retrained successfully", "features": features}), 200
    except Exception as e:
        logger.error(f"Error retraining model: {e}")
        return jsonify({"message": f"Error: {str(e)}"}), 500

@app.route('/api/ml/predict/resolution_time', methods=['POST'])
def predict_resolution_time():
    """Predicts complaint resolution time based on features."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid input. Please provide JSON data."}), 400

        desc_length = data.get('complaint_description_length', 0)
        num_evidence = data.get('num_evidence_files', 0)
        category = data.get('category', 'Other')
        priority = data.get('priority', 'Low')

        model = load_model()
        if model is None:
            model, _ = train_resolution_model()
            if model is None:
                return jsonify({"message": "No trained model available and insufficient data to train."}), 400

        # Prepare features
        features = [desc_length, num_evidence]
        if 'category' in label_encoders:
            try:
                features.append(label_encoders['category'].transform([category])[0])
            except ValueError:
                features.append(0)  # Default for unknown category
        if 'priority' in label_encoders:
            try:
                features.append(label_encoders['priority'].transform([priority])[0])
            except ValueError:
                features.append(0)  # Default for unknown priority

        predicted_days = model.predict([features])[0]
        predicted_days = max(1, round(predicted_days, 1))

        return jsonify({
            "message": "Prediction generated successfully.",
            "predicted_resolution_time_days": predicted_days,
            "explanation": "Prediction based on description length, evidence files, category, and priority."
        }), 200
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"message": f"Error during prediction: {str(e)}"}), 500

@app.route('/api/ml/resolution_time_distribution', methods=['GET'])
def get_resolution_time_distribution():
    """Returns Chart.js-compatible data for resolution time distribution."""
    try:
        df = get_complaints_dataframe()
        if df.empty or 'createdAt' not in df.columns or 'updatedAt' not in df.columns:
            return jsonify({"message": "No resolved complaints data available.", "data": {}}), 200

        df = df[df['status'] == 'resolved']
        df['resolution_time'] = (df['updatedAt'] - df['createdAt']).dt.total_seconds() / (24 * 3600)
        
        bins = np.histogram_bin_edges(df['resolution_time'], bins=10)
        hist, _ = np.histogram(df['resolution_time'], bins=bins)

        chart_data = {
            "type": "histogram",
            "data": {
                "labels": [f"{int(bins[i])}-{int(bins[i+1])} days" for i in range(len(bins)-1)],
                "datasets": [{
                    "label": "Resolution Time",
                    "data": hist.tolist(),
                    "backgroundColor": "#36A2EB"
                }]
            },
            "options": {
                "responsive": True,
                "plugins": {"title": {"display": True, "text": "Resolution Time Distribution"}},
                "scales": {
                    "x": {"title": {"display": True, "text": "Resolution Time (days)"}},
                    "y": {"title": {"display": True, "text": "Number of Complaints"}}
                }
            }
        }
        
        return jsonify({"message": "Resolution time distribution generated.", "data": chart_data}), 200
    except Exception as e:
        logger.error(f"Error generating resolution time distribution: {e}")
        return jsonify({"message": f"Error: {str(e)}", "data": {}}), 500

if __name__ == '__main__':
    try:
        client.admin.command('ping')
        logger.info("MongoDB connection successful")
        # Train model on startup if not exists
        if not os.path.exists(MODEL_PATH):
            train_resolution_model()
        app.run(debug=True, port=5001)
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")