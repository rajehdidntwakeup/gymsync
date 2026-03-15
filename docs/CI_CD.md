# GymSync CI/CD

Automated builds for GymSync mobile app using GitHub Actions.

## Workflows

### `expo-build.yml`

Triggers on push to `main`/`develop` branches when `mobile-expo/**` files change.

#### Jobs:

| Job | Trigger | Output |
|-----|---------|--------|
| **Test** | Every PR/push | Test results |
| **Build Web** | After tests pass | `web-build` artifact |
| **Build Android** | Main branch only | `android-apk` artifact |
| **EAS Cloud** | Main branch + EXPO_TOKEN | Expo cloud build |

## Setup

### 1. Enable GitHub Actions
Already configured in `.github/workflows/expo-build.yml`

### 2. For EAS Cloud Builds (Optional)

Add `EXPO_TOKEN` secret to GitHub:

```bash
# Get your token
npx eas login
npx eas whoami

# Create access token at https://expo.dev/settings/access-tokens
```

Then add to GitHub:
- Go to Settings → Secrets → Actions
- Add `EXPO_TOKEN` with your Expo access token

### 3. Manual Trigger

Go to Actions → Expo Build → Run workflow

## Build Outputs

| Platform | Location | Download |
|----------|----------|----------|
| Web | `mobile-expo/dist/` | Artifacts → web-build |
| Android APK | `android/app/build/outputs/apk/release/` | Artifacts → android-apk |
| EAS | Expo dashboard | QR code / link |

## Local Development

```bash
cd mobile-expo
npm install
npm start        # Expo dev server
npm test         # Run tests
npm run android  # Build locally
```