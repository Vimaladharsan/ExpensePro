import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(srcDir, '../.env') });

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error('Missing settings: copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}

const PORT = process.env.PORT || 5050;
await connectDB(process.env.MONGO_URI);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
