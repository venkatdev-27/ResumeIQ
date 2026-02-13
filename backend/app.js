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

// ✅ Required for Render (real client IP for rate limiter)
app.set("trust proxy", 1);

// ================= SECURITY =================
app.use(helmet());

// ================= COMPRESSION =================
app.use(compression({ threshold: 1024 }));

// ================= BODY PARSER =================
app.use(express.json({ limit: '10mb' }));

// ================= CORS =================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  process.env.CLIENT_URL
].filter(Boolean); // 🔥 removes undefined

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false); // ❗ don't crash server
  },
  credentials: true,
}));

// ================= LOGGING =================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ================= ROOT ROUTE =================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running 🚀"
  });
});

// ✅ HEALTH CHECK (for Render)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

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
