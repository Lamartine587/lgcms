# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson.json_util import dumps
from datetime import datetime, timedelta
import random # For dummy coordinates

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- CORS Configuration ---
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5000", "supports_credentials": True}})

# Configure SECRET_KEY for JWT (from .env or fallback)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'super-secret-default-key-please-change')
print(f"Flask SECRET_KEY (app.config): {app.config['SECRET_KEY']}")

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set.")
client = MongoClient(MONGO_URI)
db = client.lgcms # Your database name (e.g., lgcms)

# --- ML/Analytics API Routes ---

@app.route('/api/ml/complaint_status_distribution', methods=['GET'])
def complaint_status_distribution():
    try:
        pipeline = [
            {'$group': {'_id': '$status', 'count': {'$sum': 1}}},
            {'$project': {'label': '$_id', 'value': '$count', '_id': 0}}
        ]
        results = list(db.complaints.aggregate(pipeline))

        chart_data = {
            'type': 'pie',
            'data': {
                'labels': [res['label'] for res in results],
                'datasets': [{
                    'data': [res['value'] for res in results],
                    'backgroundColor': ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
            }
        }
        return jsonify({"success": True, "data": chart_data})
    except Exception as e:
        print(f"Error in complaint_status_distribution: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/ml/complaint_trends', methods=['GET'])
def complaint_trends():
    try:
        end_date_str = request.args.get('end_date')
        start_date_str = request.args.get('start_date')

        end_date = datetime.strptime(end_date_str, '%Y-%m-%d') if end_date_str else datetime.now()
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d') if start_date_str else end_date - timedelta(days=30)

        pipeline = [
            {
                '$match': {
                    'createdAt': {'$gte': start_date, '$lte': end_date}
                }
            },
            {
                '$group': {
                    '_id': {
                        '$dateToString': { 'format': '%Y-%m-%d', 'date': '$createdAt' }
                    },
                    'count': { '$sum': 1 }
                }
            },
            { '$sort': { '_id': 1 } }
        ]

        trends = list(db.complaints.aggregate(pipeline))

        all_dates = []
        current_date = start_date
        while current_date <= end_date:
            all_dates.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)

        trend_map = {item['_id']: item['count'] for item in trends}
        counts = [trend_map.get(date, 0) for date in all_dates]

        chart_data = {
            'type': 'line',
            'data': {
                'labels': all_dates,
                'datasets': [{
                    'label': 'Complaints Over Time',
                    'data': counts,
                    'borderColor': 'rgb(75, 192, 192)',
                    'tension': 0.1,
                    'fill': False
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'scales': {
                    'y': { 'beginAtZero': True }
                }
            }
        }
        return jsonify({"success": True, "data": chart_data})
    except Exception as e:
        print(f"Error in complaint_trends: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/ml/complaint_department_distribution', methods=['GET'])
def complaint_department_distribution():
    try:
        pipeline = [
            {'$group': {'_id': '$department', 'count': {'$sum': 1}}},
            {'$project': {'label': '$_id', 'value': '$count', '_id': 0}}
        ]
        results = list(db.complaints.aggregate(pipeline))

        chart_data = {
            'type': 'doughnut',
            'data': {
                'labels': [res['label'] for res in results],
                'datasets': [{
                    'data': [res['value'] for res in results],
                    'backgroundColor': ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
            }
        }
        return jsonify({"success": True, "data": chart_data})
    except Exception as e:
        print(f"Error in complaint_department_distribution: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/ml/predict/resolution_time', methods=['POST'])
def predict_resolution_time():
    data = request.json
    complaint_description_length = data.get('complaint_description_length')
    num_evidence_files = data.get('num_evidence_files')
    category = data.get('category')
    priority = data.get('priority')

    if not all([complaint_description_length is not None, num_evidence_files is not None, category, priority]):
        return jsonify({"success": False, "message": "Missing prediction parameters"}), 400

    predicted_hours = 0
    explanation = "Based on dummy model calculation."

    if priority == "High":
        predicted_hours = 24 + num_evidence_files * 2
        explanation = "High priority complaints are expedited. More evidence can sometimes slightly increase initial review time."
    elif priority == "Medium":
        predicted_hours = 72 + complaint_description_length / 10 + num_evidence_files * 4
        explanation = "Medium priority complaints are standard. Longer descriptions and more evidence can extend resolution."
    elif priority == "Low":
        predicted_hours = 168 + complaint_description_length / 5 + num_evidence_files * 8
        explanation = "Low priority complaints take longer. Detailed descriptions and evidence can add to processing time."
    elif priority == "Critical":
        predicted_hours = 12 + num_evidence_files * 1
        explanation = "Critical issues receive immediate attention."
    else:
        predicted_hours = 120

    return jsonify({
        "success": True,
        "prediction_hours": round(predicted_hours, 2),
        "message": explanation
    })

@app.route('/api/ml/retrain_model', methods=['POST'])
def retrain_model():
    print("ML model retraining initiated...")
    import time
    time.sleep(2) # Simulate work
    return jsonify({"success": True, "message": "ML model retraining completed successfully!"})

@app.route('/api/ml/user_role_distribution', methods=['GET'])
def user_role_distribution():
    try:
        pipeline = [
            {'$group': {'_id': '$role', 'count': {'$sum': 1}}},
            {'$project': {'label': '$_id', 'value': '$count', '_id': 0}}
        ]
        results = list(db.users.aggregate(pipeline))

        chart_data = {
            'type': 'bar',
            'data': {
                'labels': [res['label'] for res in results],
                'datasets': [{
                    'label': 'User Role Count',
                    'data': [res['value'] for res in results],
                    'backgroundColor': ['#ADD8E6', '#87CEEB', '#6495ED'],
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'scales': { 'y': { 'beginAtZero': True } }
            }
        }
        return jsonify({"success": True, "data": chart_data})
    except Exception as e:
        print(f"Error in user_role_distribution: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/ml/resolution_time_distribution', methods=['GET'])
def resolution_time_distribution():
    try:
        # Aggregates actual resolution times from your complaints collection
        pipeline = [
            {
                '$match': {
                    'createdAt': {'$exists': True, '$ne': None},
                    'resolvedAt': {'$exists': True, '$ne': None}
                }
            },
            {
                '$addFields': {
                    'resolutionDurationHours': {
                        '$divide': [
                            {'$subtract': ['$resolvedAt', '$createdAt']},
                            3600000  # Convert milliseconds to hours
                        ]
                    }
                }
            },
            {
                '$bucket': {
                    'groupBy': '$resolutionDurationHours',
                    'boundaries': [0, 24, 72, 168, 336, float('inf')], # <1 day, 1-3 days, 3-7 days, 7-14 days, >14 days
                    'default': 'Unknown',
                    'output': {'count': {'$sum': 1}}
                }
            },
            {
                '$project': {
                    '_id': 0,
                    'range': {
                        '$switch': {
                            'branches': [
                                {'case': {'$eq': ['$_id', 0]}, 'then': '<1 Day'},
                                {'case': {'$eq': ['$_id', 24]}, 'then': '1-3 Days'},
                                {'case': {'$eq': ['$_id', 72]}, 'then': '3-7 Days'},
                                {'case': {'$eq': ['$_id', 168]}, 'then': '7-14 Days'},
                                {'case': {'$eq': ['$_id', 336]}, 'then': '>14 Days'},
                            ],
                            'default': 'Other'
                        }
                    },
                    'count': 1
                }
            },
            {'$sort': {'range': 1}} # Sort to keep labels consistent
        ]
        results = list(db.complaints.aggregate(pipeline))

        # Ensure all categories are present, even if count is 0
        labels = ['<1 Day', '1-3 Days', '3-7 Days', '7-14 Days', '>14 Days']
        counts_map = {item['range']: item['count'] for item in results}
        counts = [counts_map.get(label, 0) for label in labels]


        chart_data = {
            'type': 'bar',
            'data': {
                'labels': labels,
                'datasets': [{
                    'label': 'Number of Complaints',
                    'data': counts,
                    'backgroundColor': '#B0E0E6',
                }]
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'scales': { 'y': { 'beginAtZero': True } }
            }
        }
        return jsonify({"success": True, "data": chart_data})
    except Exception as e:
        print(f"Error in resolution_time_distribution: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ml/complaint_category_trends', methods=['GET'])
def complaint_category_trends():
    try:
        # Example: Get trends for specific categories over time
        # This assumes your complaints have a 'category' field and a 'createdAt' field
        end_date_str = request.args.get('end_date')
        start_date_str = request.args.get('start_date')

        end_date = datetime.strptime(end_date_str, '%Y-%m-%d') if end_date_str else datetime.now()
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d') if start_date_str else end_date - timedelta(days=90) # Last 90 days

        pipeline = [
            {
                '$match': {
                    'createdAt': {'$gte': start_date, '$lte': end_date},
                    'category': {'$exists': True, '$ne': None}
                }
            },
            {
                '$group': {
                    '_id': {
                        'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$createdAt'}},
                        'category': '$category'
                    },
                    'count': {'$sum': 1}
                }
            },
            {'$sort': {'_id.date': 1, '_id.category': 1}}
        ]
        results = list(db.complaints.aggregate(pipeline))

        # Process results into chart.js format
        all_categories = sorted(list(db.complaints.distinct('category'))) # Get all unique categories
        all_dates = []
        current_date = start_date
        while current_date <= end_date:
            all_dates.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)

        datasets = []
        # Assign distinct colors for categories (you can expand this list)
        colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED']

        for i, category in enumerate(all_categories):
            category_data = {}
            for item in results:
                if item['_id']['category'] == category:
                    category_data[item['_id']['date']] = item['count']

            data_points = [category_data.get(date, 0) for date in all_dates]
            datasets.append({
                'label': category,
                'data': data_points,
                'borderColor': colors[i % len(colors)], # Cycle through colors
                'fill': False,
                'tension': 0.1
            })

        chart_data = {
            'type': 'line',
            'data': {
                'labels': all_dates,
                'datasets': datasets
            },
            'options': {
                'responsive': True,
                'maintainAspectRatio': False,
                'scales': { 'y': { 'beginAtZero': True } }
            }
        }
        return jsonify({"success": True, "data": chart_data})
    except Exception as e:
        print(f"Error in complaint_category_trends: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ml/complaint_heatmap_data', methods=['GET'])
def complaint_heatmap_data():
    try:
        
        kakamega_lat_min, kakamega_lat_max = 0.28, 0.5
        kakamega_lon_min, kakamega_lon_max = 34.5, 34.8

        complaints_cursor = db.complaints.find({}, {'latitude': 1, 'longitude': 1, '_id': 0})
        
        
        heatmap_points = []
        for complaint in complaints_cursor:
            lat = complaint.get('latitude')
            lng = complaint.get('longitude')

            if lat is None or lng is None:
                # Assign dummy coordinates for visualization if not present
                lat = round(random.uniform(kakamega_lat_min, kakamega_lat_max), 4)
                lng = round(random.uniform(kakamega_lon_min, kakamega_lon_max), 4)
                # You might want to update the document in real life, but not here
                # db.complaints.update_one({'_id': complaint['_id']}, {'$set': {'latitude': lat, 'longitude': lng}})

            # The third value is the 'intensity' or 'weight' of the point.
            # For simplicity, we'll use 1. You could use priority (e.g., High=3, Medium=2, Low=1)
            heatmap_points.append([float(lat), float(lng), 1]) # Convert to float for safety

        return jsonify({"success": True, "data": heatmap_points})
    except Exception as e:
        print(f"Error in complaint_heatmap_data: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({"message": "Flask ML API is running!"})

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)