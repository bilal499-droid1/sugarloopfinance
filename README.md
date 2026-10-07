# Sugarloop Finance

Vendor billing and warehouse stock management for Sugarloop, a bakery chain. Staff enter vendor bills, managers verify and pay them, and verified bills add stock to the central warehouse. Amounts are in PKR, with no tax.

## Features

- **Bills (invoices).** Enter a vendor bill with its invoice number, date, amount and an optional list of items. Totals are quantity × unit price. A photo of the bill can be attached for reference; all values are typed by hand.
- **Verification and stock.** Stock is added to the warehouse only when a manager verifies a bill. Stock leaves the warehouse through transfers to bakery branches. Manual adjustments require a reason.
- **Payments.** Record full or partial payments per bill. A bill is cleared once fully paid, and the liabilities page shows what is owed month by month.
- **Vendors and items.** A vendor catalog with per-vendor totals, and an item catalog with units and reorder levels. Low-stock items appear on the dashboard.
- **Price change alerts.** When a vendor charges a different price than last time, the change is shown and highlighted.
- **Live updates.** Open pages refresh when someone else changes data.
- **Roles.**

  | Role    | Can do |
  |---------|--------|
  | ADMIN   | Everything, including managing users and deleting records |
  | MANAGER | Edit, verify and pay bills; manage vendors and items; adjust stock |
  | STAFF   | Enter bills and view data; cannot edit or delete |

## Tech stack

- **Client:** React 19, Vite, Tailwind CSS 4, React Router, Zustand, Axios
- **Server:** Node.js, Express 5, MongoDB with Mongoose, JWT auth, Zod validation, Multer for uploads

## Project structure

```
client/   React app (Vite dev server, proxies /api and /uploads to the server)
server/   Express API
  src/routes/     REST endpoints: auth, users, vendors, items, stock, records
  src/models/     Mongoose models
  src/services/   Business logic (invoices, stock, vendor totals, live updates)
  src/scripts/    Admin account script
  uploads/        Uploaded bill images
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- MongoDB running locally or a MongoDB Atlas connection string

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the server

Copy the example env file and edit it:

```bash
cp server/.env.example server/.env
```

| Variable         | Description                              |
|------------------|------------------------------------------|
| `PORT`           | API port (default `5000`)                |
| `MONGO_URI`      | MongoDB connection string                |
| `JWT_SECRET`     | Long random string used to sign logins   |
| `JWT_EXPIRES_IN` | Login session length, e.g. `12h`         |

### 3. Create an admin account

```bash
npm run create-admin --prefix server -- admin@example.com yourpassword "Admin Name"
```

The password must be at least 8 characters. Running it again with the same email resets that account's password.

### 4. (Optional) Load sample data

```bash
npm run seed --prefix server
```

This adds sample vendors and catalog items. It is safe to run more than once.

### 5. Run the app

```bash
npm run dev
```

This starts the API on `http://localhost:5000` and the client on `http://localhost:5173`. Open the client URL and sign in with the admin account.

To point the client at an API on a different address, set `API_URL` before starting it, e.g. `API_URL=http://localhost:5001`.

## Scripts

| Command (from repo root)                  | What it does                          |
|-------------------------------------------|---------------------------------------|
| `npm run dev`                             | Run server and client together        |
| `npm run install:all`                     | Install all dependencies              |
| `npm run build --prefix client`           | Production build of the client        |
| `npm run lint --prefix client`            | Lint the client                       |
| `npm start --prefix server`               | Start the API without file watching   |
| `npm run seed --prefix server`            | Load sample vendors and items         |
| `npm run create-admin --prefix server -- …` | Create or reset an admin account    |
