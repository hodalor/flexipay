# FlexiPay Monorepo

This repository contains the FlexiPay platform apps:

- `backend/` - Express API, PostgreSQL, Redis integration
- `dashboard/` - React operations dashboard
- `desktop/` - Electron desktop agent
- `mobile/` - React Native mobile app

## Prerequisites

- Node.js 20.x
- npm 10+

## Install

Install dependencies inside each app folder:

```powershell
npm install --prefix backend
npm install --prefix dashboard
npm install --prefix desktop
npm install --prefix mobile
```

## Test

Run the full repo test suite from the root:

```powershell
npm test
```

Run app-specific suites:

```powershell
npm run test:backend
npm run test:dashboard
npm run test:desktop
npm run test:mobile
```

## Build

```powershell
npm run build:dashboard
npm run build:desktop
```

## CI

GitHub Actions is configured in `.github/workflows/ci.yml` to install dependencies, run tests, and build the dashboard and desktop bundles.

## Docker

Docker support is included for:

- `backend/Dockerfile`
- `dashboard/Dockerfile`
- `docker-compose.yml`

Example:

```powershell
docker compose up --build
```

The compose file is aimed at local backend and dashboard container runs. Desktop and mobile are not containerized here.
