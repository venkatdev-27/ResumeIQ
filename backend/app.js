const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const atsRoutes = require('./routes/ats.routes');
const aiRoutes = require('./routes/ai.routes');

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const apiLimiter = require('./middlewares/rateLimit.middleware');

const app = express();

// ================= SECURITY =================
app.use(helmet());

// ================= COMPRESSION =================
app.use(compression({ threshold: 1024 }));

// ================= BODY PARSER =================
app.use(express.json({ limit: '10mb' }));

// ================= CORS =================
const allowedOrigins = [
  "http://localhost:5173", // local Vite
  "http://localhost",      // nginx
  process.env.CLIENT_URL   // production domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ================= LOGGING =================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ================= RATE LIMIT =================
app.use('/api', apiLimiter);

// ================= ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/ai', aiRoutes);

// ================= ERROR HANDLING =================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
