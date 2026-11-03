import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(srcDir, '../.env') });

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error('Missing settings: copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '100kb' }));

// REST API
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
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

const PORT = process.env.PORT || 5050;
await connectDB(process.env.MONGO_URI);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
