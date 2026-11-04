import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseQuickAdd } from './quickParse.js';

// A fixed "today" (Thursday 22 October 2026) so date results never change
const TODAY = new Date(2026, 9, 22, 12, 0);
const parse = (text) => parseQuickAdd(text, TODAY);

describe('parseQuickAdd', () => {
  it('reads amount, category, date and payment method', () => {
    assert.deepEqual(parse('250 pizza yesterday upi'), {
      type: 'expense', amount: 250, category: 'Food', date: '2026-10-21', paymentMethod: 'UPI', note: 'Pizza',
    });
  });

  it('understands "k" for thousands and picks the payment method', () => {
    const result = parse('1.2k shoes amazon card');
    assert.equal(result.amount, 1200);
    assert.equal(result.category, 'Shopping');
    assert.equal(result.paymentMethod, 'Card');
    assert.equal(result.date, '2026-10-22'); // today when no date is given
  });

  it('recognises income', () => {
    const result = parse('salary 25000 credited');
    assert.equal(result.type, 'income');
    assert.equal(result.category, 'Salary');
    assert.equal(result.amount, 25000);
  });

  it('keeps the note the way it was typed', () => {
    const result = parse('350 dinner at Taj yesterday card');
    assert.equal(result.note, 'Dinner at Taj');
    assert.equal(result.paymentMethod, 'Card');
  });

  it('handles ₹ and commas', () => {
    const result = parse('₹1,500 groceries');
    assert.equal(result.amount, 1500);
    assert.equal(result.category, 'Groceries');
  });

  it('does not mistake "3 days ago" for the amount', () => {
    const result = parse('3 days ago 120 auto');
    assert.equal(result.amount, 120);
    assert.equal(result.date, '2026-10-19');
    assert.equal(result.category, 'Travel');
  });

  it('understands weekdays and dates', () => {
    assert.equal(parse('last monday 90 metro cash').date, '2026-10-19');
    assert.equal(parse('15 aug 400 movie').date, '2026-08-15');
    // A date later in the year means last year, never the future
    assert.equal(parse('5 dec 400 movie').date, '2025-12-05');
  });

  it('matches whole words only', () => {
    // "team" contains "tea" but is not Food
    assert.equal(parse('500 team outing').category, 'Other');
  });

  it('returns null when there is no amount', () => {
    assert.equal(parse('coffee with friends'), null);
    assert.equal(parse('0 coffee'), null);
  });
});
