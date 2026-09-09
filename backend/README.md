# FlexiPay Backend

## Prerequisites

- Node.js 20.x
- npm 10+
- PostgreSQL 14+
- Redis 6+

## Setup

1. `cd backend`
2. Copy `.env.example` to `.env`.
3. Install dependencies with `npm install`.
4. Run database sync with `npm run migrate`.
5. Seed sample data with `npm run seed`.
6. Create or refresh the dashboard admin with `npm run seed:admin`.

## Run

- Development: `npm run dev`
- Start server: `npm start`
- Direct start: `node src/server.js`
- Seed or refresh only the super admin: `npm run seed:admin`
- Run unit tests: `npm test`

## Platform Notes

- Shared backend logic is platform-neutral and portable across Windows and macOS.
- `yarn start` requires a working database connection and will continue without Redis if Redis is unavailable.
- Redis is used for transient notification and gateway cache workflows.
- Admin tokens are derived from emails listed in `ADMIN_EMAILS`.
- Default seeded dashboard admin: `superadmin@flexipay.local` / `FlexiPayAdmin123!`
