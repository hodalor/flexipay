# FlexiPay Dashboard

## Prerequisites

- Node.js 20.x
- npm 10+
- Backend package running on a reachable host

## Setup

1. `cd dashboard`
2. Copy `.env.example` to `.env`.
3. Install dependencies with `npm install`.
4. Start the backend from the `backend` folder with `npm run dev`.
5. Run all dashboard commands from inside this `dashboard` folder only.

## Run

- Development: `npm start`
- Production bundle: `npm run build`
- Run unit tests: `npm test`

## Platform Notes

- The dashboard is browser-based and remains portable across Windows and macOS.
- API and asset resolution use Webpack aliases to avoid deep relative imports.
