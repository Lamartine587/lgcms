const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define a schema
const sensorDataSchema = new mongoose.Schema({
  sensorType: String,
  distance: Number,
  timestamp: Number,
  createdAt: { type: Date, default: Date.now }
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// API endpoint
app.post('/api/sensor-data', async (req, res) => {
  try {
    // Verify API key if needed
    if (req.headers.authorization !== process.env.API_KEY) {
      return res.status(401).send('Unauthorized');
    }
    
    const data = new SensorData(req.body);
    await data.save();
    res.status(201).send(data);
  } catch (err) {
    res.status(400).send(err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));