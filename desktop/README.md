# FlexiPay Desktop Agent

## Prerequisites

- Node.js 20.x
- Yarn 1.22+
- Windows for service validation
- macOS for LaunchDaemon validation

## Setup

1. `cd desktop`
2. Copy `.env.example` to `.env`.
3. Install dependencies with `yarn install`.
4. Ensure `BACKEND_URL` points at the backend API.
5. Run `yarn bundle:renderer` once before first launch if needed.
6. Start the app and complete the first-run enrollment screen with the financed customer credentials.
7. Run all desktop commands from inside this `desktop` folder only.

## Run

- Launch app: `yarn start`
- Build local bundles: `yarn bundle`
- Package for distribution: `yarn make`
- Build the Windows installer only: `yarn make:win`

## Windows Installer Output

- Electron Forge builds the Windows package as `FlexiPayDesktop.exe`.
- The Squirrel installer output is named `FlexiPayDesktopSetup.exe`.
- Generated artifacts are written under `desktop/out/make`.

## Platform Notes

- Startup registration uses Electron login item settings for both Windows and macOS.
- Windows service installation is wrapped behind a `win32` platform check.
- macOS daemon creation is wrapped behind a `darwin` platform check.
- On first launch, the desktop app signs in the customer once, enrolls the device automatically, and stores the returned `deviceId` and `deviceToken` locally for future heartbeats.

## Persistence Notes

- In packaged production mode, the desktop agent is designed to persist at the OS level through startup registration and service or launch daemon installation where permissions allow.
- This survives app restarts, user sign-out, and operating system reboot.
- A normal application install does **not** survive disk formatting, OS reinstallation, or a true factory reset.
- To survive reset or reimage scenarios, the agent must be deployed through enterprise provisioning such as OEM imaging, Windows Autopilot/Intune, Apple Business Manager with supervised enrollment, or another device-owner style MDM workflow.
