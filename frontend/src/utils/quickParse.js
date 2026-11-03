// Smart Quick Add: turns a sentence like "250 pizza yesterday upi" into a transaction.
// Simple keyword rules (no AI service): find the date, amount, payment method, type and category.

const CATEGORY_WORDS = {
  income: {
    Salary: ['salary', 'paycheck', 'payslip', 'wages'],
    'Pocket Money': ['pocket money', 'pocket', 'allowance', 'from home', 'from dad', 'from mom', 'from parents'],
    Freelance: ['freelance', 'client', 'project', 'gig', 'tutoring'],
    Scholarship: ['scholarship', 'stipend'],
    Gift: ['gift', 'birthday', 'cashback', 'reward'],
  },
  expense: {
    Food: ['food', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'coffee', 'tea', 'snack', 'snacks', 'swiggy', 'zomato',
      'restaurant', 'canteen', 'biryani', 'juice', 'cafe', 'dosa', 'maggi', 'chai', 'meal', 'shawarma', 'ice cream'],
    Groceries: ['grocery', 'groceries', 'vegetables', 'veggies', 'fruits', 'milk', 'bigbasket', 'blinkit', 'zepto', 'supermarket', 'eggs'],
    Rent: ['rent', 'hostel', 'pg'],
    Travel: ['uber', 'ola', 'auto', 'cab', 'bus', 'metro', 'train', 'petrol', 'fuel', 'flight', 'travel', 'rapido', 'taxi', 'parking', 'toll'],
    Shopping: ['shopping', 'amazon', 'flipkart', 'myntra', 'shoes', 'clothes', 'shirt', 't-shirt', 'jeans', 'headphones', 'watch', 'bag', 'dress'],
    Bills: ['bill', 'bills', 'recharge', 'electricity', 'wifi', 'wi-fi', 'internet', 'broadband', 'water', 'gas', 'dth'],
    Education: ['book', 'books', 'course', 'fees', 'fee', 'exam', 'stationery', 'tuition', 'udemy', 'notes', 'printout', 'xerox'],
    Health: ['medicine', 'medicines', 'doctor', 'pharmacy', 'gym', 'hospital', 'health', 'clinic', 'tablets'],
    Entertainment: ['movie', 'movies', 'netflix', 'spotify', 'game', 'games', 'concert', 'party', 'prime', 'hotstar', 'bowling', 'cinema'],
  },
};

// Words that mean the money came in
const INCOME_WORDS = ['salary', 'received', 'earned', 'income', 'credited', 'refund', 'allowance', 'stipend', 'scholarship',
  'freelance', 'pocket money', 'from dad', 'from mom', 'from home', 'from parents', 'cashback'];

const PAYMENT_WORDS = {
  UPI: ['upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim'],
  Cash: ['cash'],
  Card: ['credit card', 'debit card', 'card', 'credit', 'debit', 'visa', 'mastercard', 'rupay'],
  'Bank Transfer': ['bank transfer', 'bank', 'neft', 'imps', 'rtgs', 'transfer', 'netbanking'],
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Words left out of the note
const FILLER = new Set(['spent', 'spend', 'paid', 'pay', 'on', 'for', 'via', 'with', 'by', 'using', 'rs', 'inr', 'rupees', 'from',
  'at', 'the', 'a', 'an', 'got', 'received', 'earned', 'credited', 'in', 'to', 'of', 'my', 'and', 'last']);

const pad = (n) => String(n).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// Whole-word (or whole-phrase) search, so "tea" doesn't match "team"
const wordPattern = (word) => new RegExp(`(^|[^a-z])${word.replace(/-/g, '\\-')}(?=[^a-z]|$)`);

// Returns { type, amount, category, date, paymentMethod, note }, or null when there's no amount
export function parseQuickAdd(input, today = new Date()) {
  let text = ` ${input.toLowerCase().replace(/,/g, '').replace(/[^a-z0-9₹./\s-]/g, ' ')} `;
  const remove = (part) => {
    text = text.replace(part, ' ');
  };
  let match;

  // 1. Date first, so "3 days ago" isn't read as ₹3
  let date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const notFuture = (d) => (d > today ? new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()) : d);
  if ((match = text.match(wordPattern('yesterday')))) {
    date.setDate(date.getDate() - 1);
    remove(match[0]);
  } else if ((match = text.match(wordPattern('today')))) {
    remove(match[0]);
  } else if ((match = text.match(/(\d+)\s*days?\s*ago/))) {
    date.setDate(date.getDate() - Number(match[1]));
    remove(match[0]);
  } else if ((match = text.match(/(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/))) {
    date = notFuture(new Date(today.getFullYear(), MONTHS.indexOf(match[2]), Number(match[1])));
    remove(match[0]);
  } else if ((match = text.match(/(?:on\s+)?(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?/))) {
    date = notFuture(new Date(today.getFullYear(), Number(match[2]) - 1, Number(match[1])));
    remove(match[0]);
  } else if ((match = text.match(/(?:on\s+|last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)(?=[^a-z])/))) {
    const back = (today.getDay() - DAYS.indexOf(match[1].slice(0, 3)) + 7) % 7 || 7; // the most recent one before today
    date.setDate(date.getDate() - back);
    remove(match[0]);
  }

  // 2. Amount: the first number left, with optional ₹/rs, and "k" for thousands ("2.5k" = 2500)
  match = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|rs\.?|inr|rupees)?(?=\s)/);
  if (!match) return null;
  const amount = Math.round(parseFloat(match[1]) * (match[2] === 'k' ? 1000 : 1) * 100) / 100;
  if (!amount) return null;
  remove(match[0]);

  // 3. Payment method (UPI if none is mentioned)
  let paymentMethod = 'UPI';
  for (const [method, words] of Object.entries(PAYMENT_WORDS)) {
    const word = words.find((w) => wordPattern(w).test(text));
    if (word) {
      paymentMethod = method;
      remove(text.match(wordPattern(word))[0]);
      break;
    }
  }

  // 4. Income or expense, then the category
  const type = INCOME_WORDS.some((w) => wordPattern(w).test(text)) ? 'income' : 'expense';
  let category = 'Other';
  let categoryWord = '';
  for (const [name, words] of Object.entries(CATEGORY_WORDS[type])) {
    const word = words.find((w) => wordPattern(w).test(text));
    if (word) {
      category = name;
      categoryWord = word;
      break;
    }
  }

  // 5. Note: the words that are left, written the way the user typed them ("Dinner at Taj", not "dinner at taj")
  // Filler words ("spent ... on ... via") are only trimmed from the start and end, so "Dinner at Taj" keeps its "at"
  const words = text.split(/\s+/).filter((w) => w && !/^[\d./₹-]+$/.test(w));
  while (words.length && FILLER.has(words[0])) words.shift();
  while (words.length && FILLER.has(words[words.length - 1])) words.pop();
  const typed = input.replace(/,/g, '').split(/\s+/);
  const original = words.map((word) => {
    const index = typed.findIndex((t) => t.toLowerCase().replace(/[^a-z0-9₹./-]/g, '') === word);
    return index === -1 ? word : typed.splice(index, 1)[0].replace(/[^\w₹./-]/g, '');
  });
  let note = original.join(' ') || categoryWord;
  note = note ? note[0].toUpperCase() + note.slice(1) : '';

  return { type, amount, category, date: toISO(date), paymentMethod, note: note.slice(0, 120) };
}
