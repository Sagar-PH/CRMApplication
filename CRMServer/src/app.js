const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const { connectDB }      = require('./config/database');
const { initPassport }   = require('./config/passport');
const apiRouter          = require('./routes/index');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger             = require('./utils/logger');

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: (process.env.ALLOWED_ORIGINS).split(','),
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── HTTP Logging ─────────────────────────────────────────────────────────────
app.use(morgan('dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Passport (Google OAuth) ──────────────────────────────────────────────────
initPassport();
app.use(passport.initialize());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── 404 + Global Error ───────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
