require('dotenv').config(); // Load .env file
const mongoose = require('mongoose');
const Department = require('./models/Department');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;

console.log('MONGO_URI:', MONGO_URI); // Debug: Log MONGO_URI to verify

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const departments = [
  {
    name: 'Finance and Economic Planning',
    description: 'Manages county budgets, revenue collection, and economic policy development, including fiscal strategy and planning.'
  },
  {
    name: 'Health Services',
    description: 'Oversees county health facilities, public health programs, and medical services, including Kakamega County General Teaching & Referral Hospital.'
  },
  {
    name: 'Public Works, Infrastructure, and Transport',
    description: 'Handles road construction, maintenance, transport infrastructure, and public works like street lighting.'
  },
  {
    name: 'Lands, Physical Planning, Housing, and Urban Development',
    description: 'Manages land administration, urban planning, housing projects, and land digitization initiatives.'
  },
  {
    name: 'Education, Science, and Technology',
    description: 'Oversees early childhood development, vocational training, polytechnics, and science and technology programs.'
  },
  {
    name: 'Water, Environment, Natural Resources, and Climate Change',
    description: 'Manages water supply, sanitation, waste management, environmental protection, and climate change initiatives.'
  },
  {
    name: 'Agriculture, Livestock, Fisheries, and Cooperatives',
    description: 'Supports sugarcane farming, livestock management, fisheries, irrigation, and cooperative societies.'
  },
  {
    name: 'Trade, Industrialization, and Tourism',
    description: 'Promotes trade, industrialization (e.g., Mumias and Kabras Sugar), and tourism, including Kakamega Forest.'
  },
  {
    name: 'Public Service and Administration',
    description: 'Manages human resources, job creation, county administration, and public service delivery.'
  },
  {
    name: 'Social Services, Sports, Youth, Gender, and Culture',
    description: 'Oversees youth programs, sports, gender equality, cultural activities, and social services.'
  },
  {
    name: 'ICT, Innovation, and Digital Economy',
    description: 'Manages ICT infrastructure, e-services, and digital initiatives like county call centers.'
  },
  {
    name: 'Sub-County Administration',
    description: 'Coordinates administration across Kakamega’s 12 sub-counties and 60 wards.'
  }
];

async function seedDepartments() {
  try {
    // Clear existing departments
    await Department.deleteMany({});
    console.log('Cleared existing departments');

    // Insert new departments
    const inserted = await Department.insertMany(departments);
    console.log(`Successfully seeded ${inserted.length} departments`);

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error seeding departments:', err);
    process.exit(1);
  }
}

// Run the seeding function
seedDepartments();