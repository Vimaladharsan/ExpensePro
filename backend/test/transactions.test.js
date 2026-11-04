import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, connectTestDb, disconnectTestDb, signUp } from './helpers.js';

before(connectTestDb);
after(disconnectTestDb);

const expense = (fields = {}) => ({
  type: 'expense', amount: 450, category: 'Food', date: '2026-10-22', paymentMethod: 'UPI', note: 'Lunch', ...fields,
});

// Adds transactions for a user and checks each one is saved
async function add(auth, ...items) {
  for (const item of items) await api().post('/api/transactions').set(auth).send(item).expect(201);
}

describe('create', () => {
  it('saves a valid transaction for the logged-in user', async () => {
    const { user, auth } = await signUp();
    const res = await api().post('/api/transactions').set(auth).send(expense({ amount: 99.999 })).expect(201);
    assert.equal(res.body.user, user.id);
    assert.equal(res.body.amount, 100); // rounded to 2 decimal places
    assert.equal(res.body.category, 'Food');
  });

  it('ignores a "user" field in the request, so nobody can add to another account', async () => {
    const victim = await signUp();
    const attacker = await signUp();
    const res = await api().post('/api/transactions').set(attacker.auth).send(expense({ user: victim.user.id })).expect(201);
    assert.equal(res.body.user, attacker.user.id);
  });

  it('validates amount, date, category and payment method', async () => {
    const { auth } = await signUp();
    const post = (fields) => api().post('/api/transactions').set(auth).send(expense(fields));

    await post({ amount: 'abc' }).expect(400);
    await post({ amount: 0 }).expect(400);
    await post({ date: 'not-a-date' }).expect(400);
    await post({ type: 'gift' }).expect(400);
    await post({ paymentMethod: 'Bitcoin' }).expect(400);

    // The category must match the type: "Salary" is income only
    const res = await post({ category: 'Salary' }).expect(400);
    assert.equal(res.body.errors.category, 'Choose a valid category');
    await post({ type: 'income', category: 'Salary' }).expect(201);
  });
});

describe('list', () => {
  it('filters by month, type and search text, with pagination', async () => {
    const { auth } = await signUp();
    await add(
      auth,
      expense({ note: 'Pizza night', date: '2026-10-05' }),
      expense({ note: 'Bus pass', category: 'Travel', date: '2026-10-31' }),
      expense({ note: 'Pizza again', date: '2026-09-30' }), // previous month
      { type: 'income', amount: 25000, category: 'Salary', date: '2026-10-01', note: 'October salary' },
    );

    const october = await api().get('/api/transactions?month=2026-10').set(auth).expect(200);
    assert.equal(october.body.total, 3);

    const expenses = await api().get('/api/transactions?month=2026-10&type=expense').set(auth).expect(200);
    assert.equal(expenses.body.total, 2);

    const pizza = await api().get('/api/transactions?month=all&search=PIZZA').set(auth).expect(200);
    assert.equal(pizza.body.total, 2);

    const page = await api().get('/api/transactions?month=2026-10&limit=2&page=2').set(auth).expect(200);
    assert.equal(page.body.items.length, 1);
    assert.equal(page.body.pages, 2);
  });

  it('treats search text literally, not as a pattern', async () => {
    const { auth } = await signUp();
    await add(auth, expense({ note: 'Coffee' }));
    const res = await api().get('/api/transactions?month=all&search=.*').set(auth).expect(200);
    assert.equal(res.body.total, 0);
  });

  it('rejects a badly formed month', async () => {
    const { auth } = await signUp();
    await api().get('/api/transactions?month=2026-13').set(auth).expect(400);
  });
});

describe('update and delete', () => {
  it('lets the owner edit and delete a transaction', async () => {
    const { auth } = await signUp();
    const { body: created } = await api().post('/api/transactions').set(auth).send(expense()).expect(201);

    const edited = await api().put(`/api/transactions/${created._id}`).set(auth).send(expense({ amount: 520 })).expect(200);
    assert.equal(edited.body.amount, 520);

    await api().delete(`/api/transactions/${created._id}`).set(auth).expect(200);
    await api().delete(`/api/transactions/${created._id}`).set(auth).expect(404);
  });

  it("never lets one user see, edit or delete another user's transactions", async () => {
    const owner = await signUp();
    const other = await signUp();
    const { body: created } = await api().post('/api/transactions').set(owner.auth).send(expense()).expect(201);

    const list = await api().get('/api/transactions?month=all').set(other.auth).expect(200);
    assert.equal(list.body.total, 0);
    await api().put(`/api/transactions/${created._id}`).set(other.auth).send(expense({ amount: 1 })).expect(404);
    await api().delete(`/api/transactions/${created._id}`).set(other.auth).expect(404);

    // Still there, unchanged, for the owner
    const mine = await api().get('/api/transactions?month=all').set(owner.auth).expect(200);
    assert.equal(mine.body.items[0].amount, 450);
  });

  it('answers 400 for an id that is not a valid id', async () => {
    const { auth } = await signUp();
    await api().delete('/api/transactions/not-an-id').set(auth).expect(400);
  });
});

describe('summary and trends', () => {
  it('adds up the month with MongoDB aggregation', async () => {
    const { auth } = await signUp();
    await add(
      auth,
      { type: 'income', amount: 20000, category: 'Salary', date: '2026-10-01' },
      expense({ amount: 3000, category: 'Rent', date: '2026-10-02' }),
      expense({ amount: 500, category: 'Food', date: '2026-10-02' }),
      expense({ amount: 1500, category: 'Food', date: '2026-10-15' }),
      expense({ amount: 800, category: 'Food', date: '2026-09-10' }), // last month
    );

    const { body } = await api().get('/api/transactions/summary?month=2026-10').set(auth).expect(200);
    assert.equal(body.income, 20000);
    assert.equal(body.expense, 5000);
    assert.equal(body.balance, 15000);
    assert.equal(body.savingsRate, 75);
    assert.equal(body.transactionCount, 4);
    assert.deepEqual(body.previous, { income: 0, expense: 800 });
    assert.deepEqual(
      body.byCategory.map((row) => [row.category, row.total]),
      [['Rent', 3000], ['Food', 2000]], // biggest first
    );
    assert.equal(body.daily.length, 31); // one entry per day of October
    assert.equal(body.daily[1].expense, 3500); // 2 October
    assert.equal(body.biggestExpense.amount, 3000);
  });

  it('returns one point per month for the trend chart', async () => {
    const { auth } = await signUp();
    await add(auth, expense({ amount: 100, date: '2026-08-10' }), expense({ amount: 200, date: '2026-10-10' }));

    const { body } = await api().get('/api/transactions/trend?end=2026-10&months=3').set(auth).expect(200);
    assert.deepEqual(body, [
      { month: '2026-08', income: 0, expense: 100 },
      { month: '2026-09', income: 0, expense: 0 },
      { month: '2026-10', income: 0, expense: 200 },
    ]);
  });
});
