import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, connectTestDb, disconnectTestDb, signUp } from './helpers.js';

before(connectTestDb);
after(disconnectTestDb);

describe('register', () => {
  it('creates an account and returns a token without the password', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: '  Asha  ', email: 'Asha@Example.com', password: 'secret123' })
      .expect(201);

    assert.ok(res.body.token);
    assert.equal(res.body.user.name, 'Asha');
    assert.equal(res.body.user.email, 'asha@example.com'); // stored in lower case
    assert.equal(res.body.user.password, undefined);
  });

  it('rejects an email that is already used, in any letter case', async () => {
    await signUp({ email: 'taken@example.com' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'TAKEN@example.com', password: 'secret123' })
      .expect(409);
    assert.match(res.body.message, /already exists/);
  });

  it('validates name, email and password', async () => {
    await api().post('/api/auth/register').send({ name: '', email: 'a@b.co', password: 'secret123' }).expect(400);
    await api().post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: 'secret123' }).expect(400);
    await api().post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: '123' }).expect(400);
  });
});

describe('login', () => {
  it('logs in with the right password only', async () => {
    const { user, password } = await signUp();
    const ok = await api().post('/api/auth/login').send({ email: user.email, password }).expect(200);
    assert.ok(ok.body.token);

    const wrong = await api().post('/api/auth/login').send({ email: user.email, password: 'wrong-password' }).expect(401);
    assert.equal(wrong.body.message, 'Incorrect email or password');
  });

  it('gives the same answer for an unknown email, so accounts cannot be discovered', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'x' }).expect(401);
    assert.equal(res.body.message, 'Incorrect email or password');
  });
});

describe('protected routes', () => {
  it('need a valid token', async () => {
    await api().get('/api/auth/me').expect(401);
    await api().get('/api/auth/me').set({ Authorization: 'Bearer not-a-real-token' }).expect(401);
    await api().get('/api/transactions?month=2026-10').expect(401);
  });

  it('return the logged-in user', async () => {
    const { user, auth } = await signUp({ name: 'Ravi' });
    const res = await api().get('/api/auth/me').set(auth).expect(200);
    assert.equal(res.body.email, user.email);
    assert.equal(res.body.name, 'Ravi');
  });

  it('can update the name', async () => {
    const { auth } = await signUp();
    const res = await api().put('/api/auth/me').set(auth).send({ name: 'New Name' }).expect(200);
    assert.equal(res.body.name, 'New Name');
  });
});

describe('change password', () => {
  it('requires the current password', async () => {
    const { auth } = await signUp();
    const res = await api()
      .put('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'wrong-password', newPassword: 'brand-new-1' })
      .expect(400);
    assert.equal(res.body.message, 'Current password is incorrect');
  });

  it('signs out other devices but keeps this one logged in with a new token', async () => {
    const { user, auth, password } = await signUp();
    const otherDevice = (await api().post('/api/auth/login').send({ email: user.email, password }).expect(200)).body.token;

    const res = await api()
      .put('/api/auth/password')
      .set(auth)
      .send({ currentPassword: password, newPassword: 'brand-new-1' })
      .expect(200);

    // Tokens from before the change no longer work
    await api().get('/api/auth/me').set(auth).expect(401);
    await api().get('/api/auth/me').set({ Authorization: `Bearer ${otherDevice}` }).expect(401);
    // The token sent back with the reply does
    await api().get('/api/auth/me').set({ Authorization: `Bearer ${res.body.token}` }).expect(200);
    // Only the new password logs in
    await api().post('/api/auth/login').send({ email: user.email, password }).expect(401);
    await api().post('/api/auth/login').send({ email: user.email, password: 'brand-new-1' }).expect(200);
  });

  it('is turned off for the shared demo account', async () => {
    const { auth, password } = await signUp({ email: 'demo@expensetracker.app' });
    await api()
      .put('/api/auth/password')
      .set(auth)
      .send({ currentPassword: password, newPassword: 'brand-new-1' })
      .expect(403);
  });
});

describe('security headers', () => {
  it('are sent with every reply', async () => {
    const res = await api().get('/api/health').expect(200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
  });
});
