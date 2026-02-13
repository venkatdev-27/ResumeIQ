const dotenv = require('dotenv');

// Load env only in local development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = require('./app');
const connectDB = require('./config/db');

const startServer = async () => {
  try {
    await connectDB();

    const port = process.env.PORT || 5000;

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
