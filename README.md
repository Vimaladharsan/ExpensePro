# ExpensePro: Personal Expense Tracker

**A full-stack personal finance tracker built with the MERN stack.**

Track income and expenses, set budgets, save toward goals, and see where your money goes. You can add a transaction by just typing a sentence like `250 pizza yesterday upi`.

[![CI](https://github.com/Vimaladharsan/ExpensePro/actions/workflows/ci.yml/badge.svg)](https://github.com/Vimaladharsan/ExpensePro/actions/workflows/ci.yml)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

---

## Highlights

- **Smart Quick Add:** type `1.2k shoes amazon card` or `salary 25000 credited` and the app fills in the amount, type, category, date and payment method. It uses keyword rules and runs entirely in the browser, with no AI service.
- **Live dashboard:** monthly totals with change vs last month, savings rate, insights, a budget ring and goal progress.
- **Budgets with alerts:** set an overall monthly limit and per-category limits, see a "safe to spend per day" figure, and get bell alerts as you approach or pass a limit.
- **Savings goals:** set a target and deadline, add or withdraw money, and see how much to save each month to finish on time.
- **Reports:** monthly statement, a spending calendar heatmap, category trends, payment-method and weekday breakdowns, top expenses, and print / save as PDF.
- **Private accounts:** JWT login with bcrypt-hashed passwords. Every API query is scoped to the logged-in user, and changing your password signs out your other devices.
- **Tested:** 38 automated tests (API and Quick Add parser) run on every push with GitHub Actions.
- **Polished UI:** light and dark themes, a responsive layout with bottom navigation on phones, keyboard shortcuts, CSV export, toasts, confirmation dialogs, loading skeletons and empty states.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Vite, Recharts, Lucide icons, plain CSS |
| Backend | Node.js, Express 5, REST + JSON |
| Database | MongoDB with Mongoose (aggregation pipelines for summaries and trends) |
| Auth and security | JSON Web Tokens, bcrypt password hashing, Helmet security headers, login rate limiting |
| Testing | Node's built-in test runner, Supertest, GitHub Actions CI |
| Tooling | npm workspaces, `concurrently` for one-command development |

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) 22 or newer
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone and install
```bash
git clone https://github.com/Vimaladharsan/ExpensePro.git
cd ExpensePro
npm install
```
This installs both the backend and the frontend (npm workspaces).

### 2. Configure the backend
Copy the example settings file:
```bash
cp backend/.env.example backend/.env
```
On Windows, use `copy backend\.env.example backend\.env` instead. Then edit `backend/.env`:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port for the API | `5050` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/expense-tracker-pro` |
| `JWT_SECRET` | Long random string used to sign login tokens | output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 3. Load demo data (optional)
```bash
npm run seed
```
This creates a demo account with six months of realistic transactions, budgets and savings goals. Run it again at any time to reset the demo data; other accounts are never touched.

### 4. Run
```bash
npm run dev
```
This starts the API at http://localhost:5050 and the website at **http://localhost:3030**. Vite forwards `/api` requests to the backend.

Click **Try the live demo** on the landing page, or log in with:

| Email | Password |
|---|---|
| `demo@expensetracker.app` | `demo1234` |

The demo account's password can't be changed, so the demo login always works.

### Production build
```bash
npm run build   # builds the React app into frontend/dist
npm start       # Express serves the website and the API on one port (5050)
```

### Run the tests
```bash
npm test
```
This runs 29 API tests and 9 Quick Add parser tests. The API tests use a separate database: your `MONGO_URI` database name with `-test` added, or `MONGO_URI_TEST` if you set it. The test database is emptied before and after each run, and the tests refuse to run against any database whose name doesn't end in `-test`, so your real data is never touched.

---

## Quick Add examples

| You type | Result |
|---|---|
| `250 pizza yesterday upi` | ₹250 expense · Food · yesterday · UPI |
| `1.2k shoes amazon card` | ₹1,200 expense · Shopping · today · Card |
| `salary 25000 credited` | ₹25,000 income · Salary |
| `350 dinner at Taj yesterday card` | ₹350 expense · Food · yesterday · Card |

Press **/** to open Quick Add from anywhere and **Enter** to save.

**Keyboard shortcuts:** `N` opens the full add form · `/` opens Quick Add · `Esc` closes pop-ups.

---

## REST API

All requests and responses are JSON. Routes marked 🔒 need the header `Authorization: Bearer <token>`.

<details>
<summary><b>Auth</b></summary>

| Method | Endpoint | | Description |
|---|---|---|---|
| POST | `/api/auth/register` | | Create an account → `{ token, user }` |
| POST | `/api/auth/login` | | Log in → `{ token, user }` |
| GET | `/api/auth/me` | 🔒 | Current user |
| PUT | `/api/auth/me` | 🔒 | Update name `{ name }` |
| PUT | `/api/auth/password` | 🔒 | Change password `{ currentPassword, newPassword }` |
</details>

<details>
<summary><b>Transactions</b></summary>

| Method | Endpoint | | Description |
|---|---|---|---|
| GET | `/api/transactions?month=2026-10` | 🔒 | Transactions for a month (`month=all` for everything). Optional: `type`, `category`, `search`, `sort`, `page`, `limit` |
| POST | `/api/transactions` | 🔒 | Create a transaction |
| PUT | `/api/transactions/:id` | 🔒 | Update a transaction |
| DELETE | `/api/transactions/:id` | 🔒 | Delete a transaction |
| GET | `/api/transactions/summary?month=2026-10` | 🔒 | Totals, savings rate, previous month, by category, per day, largest expense |
| GET | `/api/transactions/trend?end=2026-10&months=6` | 🔒 | Income and expenses per month |
| GET | `/api/transactions/category-trend?end=2026-10&months=6` | 🔒 | Spending per category per month |

Example body:
```json
{
  "type": "expense",
  "amount": 450,
  "category": "Food",
  "date": "2026-10-22",
  "paymentMethod": "UPI",
  "note": "Lunch with friends"
}
```
</details>

<details>
<summary><b>Budgets and goals</b></summary>

| Method | Endpoint | | Description |
|---|---|---|---|
| GET | `/api/budgets?month=2026-10` | 🔒 | Budgets with amount spent |
| PUT | `/api/budgets` | 🔒 | Create or update a budget `{ month, category, amount }` (`category: "Overall"` sets the monthly limit) |
| DELETE | `/api/budgets/:id` | 🔒 | Remove a budget |
| GET | `/api/goals` | 🔒 | List savings goals |
| POST | `/api/goals` | 🔒 | Create a goal `{ name, target, deadline?, icon?, color? }` |
| PUT | `/api/goals/:id` | 🔒 | Update a goal |
| POST | `/api/goals/:id/contribute` | 🔒 | Add money `{ amount: 500 }` or withdraw `{ amount: -500 }` |
| DELETE | `/api/goals/:id` | 🔒 | Delete a goal |
</details>

**Categories.** Expense: Food, Groceries, Rent, Travel, Shopping, Bills, Education, Health, Entertainment, Other. Income: Salary, Pocket Money, Freelance, Scholarship, Gift, Other.
**Payment methods:** UPI, Cash, Card, Bank Transfer.

---

## Project structure

```
├── .github/workflows/ci.yml    # runs the tests and build on every push
├── backend/
│   ├── .env.example            # settings template (copy to .env)
│   ├── test/                   # API tests (auth, transactions, budgets, goals)
│   └── src/
│       ├── app.js              # Express app: security, routes, serves the built frontend
│       ├── server.js           # loads settings, connects to MongoDB, starts the server
│       ├── seed.js             # demo account and sample data
│       ├── constants.js        # categories, payment methods, goal icons
│       ├── config/db.js        # MongoDB connection
│       ├── middleware/         # JWT auth guard, JSON error handler
│       ├── models/             # User, Transaction, Budget, Goal
│       └── routes/             # auth, transactions, budgets, goals
├── frontend/
│   ├── vite.config.js          # dev server on 3030, /api proxy
│   └── src/
│       ├── api.js              # fetch wrapper (adds token, handles errors)
│       ├── components/         # Layout, QuickAdd, Charts, AlertsBell, modals
│       ├── context/            # auth, toasts, app state (month, theme)
│       ├── pages/              # Landing, Dashboard, Transactions, Budgets, Goals, Reports, Settings
│       └── utils/              # Quick Add parser (with tests), formatting, CSV export
└── package.json                # npm workspaces and root scripts
```

## How it works

- **Authentication:** passwords are hashed with bcrypt, and login returns a JWT that is valid for 7 days. The `requireAuth` middleware verifies the token on every protected route and attaches the user. Every database query is filtered by that user's id, so one user can never read or change another user's data (covered by tests).
- **Security:** Helmet sets security headers, including a Content-Security-Policy that blocks inline scripts. Login and sign-up are rate-limited to 20 attempts per 15 minutes per IP. Each token carries a version number, so changing your password signs out every other device while keeping you logged in.
- **Validation:** forms are validated in the browser for instant feedback and again on the server. Mongoose schemas only accept known payment methods and a category that matches the type (for example, "Salary" only for income).
- **Reports:** monthly summaries, trends and category breakdowns are computed in MongoDB with aggregation pipelines, not in JavaScript, so only the results are sent to the browser.
- **Performance:** every page is loaded on demand with `React.lazy`, so the first visit downloads only the code it needs. An error boundary shows a friendly message instead of a blank screen if a page fails.

## Available scripts

Run from the project root:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the backend and frontend together with auto-reload |
| `npm run seed` | Creates or resets the demo account |
| `npm run build` | Builds the frontend for production |
| `npm start` | Runs the production server (API and website on one port) |
| `npm test` | Runs all tests (backend API and frontend parser) |

---

## License

Released under the [MIT License](LICENSE).

## Author

**Vimaladharsan**. If you found this project useful, consider giving it a ⭐.
