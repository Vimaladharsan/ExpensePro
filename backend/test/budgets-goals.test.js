import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, connectTestDb, disconnectTestDb, signUp } from './helpers.js';

before(connectTestDb);
after(disconnectTestDb);

describe('budgets', () => {
  it('sets a budget once per category and shows the amount spent', async () => {
    const { auth } = await signUp();
    await api().post('/api/transactions').set(auth)
      .send({ type: 'expense', amount: 1200, category: 'Food', date: '2026-10-05' }).expect(201);

    await api().put('/api/budgets').set(auth).send({ month: '2026-10', category: 'Food', amount: 2000 }).expect(200);
    await api().put('/api/budgets').set(auth).send({ month: '2026-10', category: 'Food', amount: 1500 }).expect(200); // update
    await api().put('/api/budgets').set(auth).send({ month: '2026-10', category: 'Overall', amount: 10000 }).expect(200);

    const { body } = await api().get('/api/budgets?month=2026-10').set(auth).expect(200);
    assert.equal(body.categories.length, 1);
    assert.deepEqual(
      { category: body.categories[0].category, amount: body.categories[0].amount, spent: body.categories[0].spent },
      { category: 'Food', amount: 1500, spent: 1200 },
    );
    assert.equal(body.overall.amount, 10000);
    assert.equal(body.overall.spent, 1200);
  });

  it('rejects invalid categories, amounts and months', async () => {
    const { auth } = await signUp();
    const put = (body) => api().put('/api/budgets').set(auth).send(body);
    await put({ month: '2026-10', category: 'Salary', amount: 1000 }).expect(400); // income category
    await put({ month: '2026-10', category: 'Food', amount: 0 }).expect(400);
    await put({ month: 'October', category: 'Food', amount: 1000 }).expect(400);
  });

  it("can't remove someone else's budget", async () => {
    const owner = await signUp();
    const other = await signUp();
    const { body: budget } = await api().put('/api/budgets').set(owner.auth)
      .send({ month: '2026-10', category: 'Food', amount: 2000 }).expect(200);
    await api().delete(`/api/budgets/${budget._id}`).set(other.auth).expect(404);
    await api().delete(`/api/budgets/${budget._id}`).set(owner.auth).expect(200);
  });
});

describe('savings goals', () => {
  it('adds and withdraws money, but never below zero', async () => {
    const { auth } = await signUp();
    const { body: goal } = await api().post('/api/goals').set(auth)
      .send({ name: 'Goa trip', target: 15000, icon: 'plane' }).expect(201);
    assert.equal(goal.saved, 0);

    const added = await api().post(`/api/goals/${goal._id}/contribute`).set(auth).send({ amount: 5000 }).expect(200);
    assert.equal(added.body.saved, 5000);

    const withdrawn = await api().post(`/api/goals/${goal._id}/contribute`).set(auth).send({ amount: -2000 }).expect(200);
    assert.equal(withdrawn.body.saved, 3000);

    const tooMuch = await api().post(`/api/goals/${goal._id}/contribute`).set(auth).send({ amount: -5000 }).expect(400);
    assert.match(tooMuch.body.message, /at most/);
  });

  it('validates the goal', async () => {
    const { auth } = await signUp();
    await api().post('/api/goals').set(auth).send({ name: '', target: 1000 }).expect(400);
    await api().post('/api/goals').set(auth).send({ name: 'Laptop', target: 'lots' }).expect(400);
    await api().post('/api/goals').set(auth).send({ name: 'Laptop', target: 1000, icon: 'rocket' }).expect(400);
  });

  it("keeps each user's goals private", async () => {
    const owner = await signUp();
    const other = await signUp();
    const { body: goal } = await api().post('/api/goals').set(owner.auth).send({ name: 'Bike', target: 90000 }).expect(201);

    const list = await api().get('/api/goals').set(other.auth).expect(200);
    assert.equal(list.body.length, 0);
    await api().post(`/api/goals/${goal._id}/contribute`).set(other.auth).send({ amount: 100 }).expect(404);
    await api().delete(`/api/goals/${goal._id}`).set(other.auth).expect(404);
  });
});
