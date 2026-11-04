// Shared set-up for the API tests: a separate test database and a quick way to create logged-in users
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';

process.env.NODE_ENV = 'test'; // turns off the login rate limit
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
process.env.JWT_SECRET ||= 'test-secret';

// MONGO_URI_TEST if set, otherwise MONGO_URI with "-test" added to the database name
function testDatabaseUri() {
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  const base = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense-tracker-pro';
  const [, host, db, options] = base.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)\/?([^?]*)(.*)$/);
  return `${host}/${db || 'expense-tracker-pro'}-test${options}`;
}

export const api = () => request(app);

// Connects to an empty test database. Refuses any database whose name doesn't end in "-test",
// so the tests can never wipe real data.
export async function connectTestDb() {
  await mongoose.connect(testDatabaseUri());
  const name = mongoose.connection.db.databaseName;
  if (!name.endsWith('-test')) {
    await mongoose.disconnect();
    throw new Error(`Refusing to run tests against "${name}": the test database name must end in "-test"`);
  }
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes(); // e.g. the unique email index
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

// Creates a new account and returns its token, user and an "Authorization" header to send
let count = 0;
export async function signUp({ name = 'Test User', password = 'secret123', email } = {}) {
  count += 1;
  const body = { name, email: email || `user${count}-${Date.now()}@example.com`, password };
  const res = await api().post('/api/auth/register').send(body).expect(201);
  return { ...res.body, password, auth: { Authorization: `Bearer ${res.body.token}` } };
}
