import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));

// The Express app without starting a server or connecting to MongoDB,
// so the tests can use it directly (see server.js for the real start-up)
const app = express();

// Security headers (Content-Security-Policy, no MIME sniffing, no clickjacking, ...)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Allows the Google Fonts stylesheet and font files used by index.html
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        // Don't rewrite http:// to https:// when running on a laptop without HTTPS
        'upgrade-insecure-requests': null,
      },
    },
  })
);
app.use(express.json({ limit: '100kb' }));

// Slows down password guessing: at most 20 login / sign-up attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// REST API
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/budgets', requireAuth, budgetRoutes);
app.use('/api/goals', requireAuth, goalRoutes);
app.use('/api', notFound);

// After "npm run build", this same server also serves the React app (used for the demo / deployment)
const distPath = path.join(srcDir, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use(errorHandler);

export default app;
