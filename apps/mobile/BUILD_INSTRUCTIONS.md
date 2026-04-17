# Build Instructions for Prompt Closet Mobile App

## Prerequisites

1. **Login to Expo**

   ```bash
   eas login
   ```

2. **Link or Create Expo Project**
   - If you already have an Expo project: `eas project:link`
   - To create a new project: `eas project:create`

## Building for Android

### Development/Preview APK

For testing on Android devices (development build):

```bash
eas build --platform android --profile preview
```

This builds an APK that can be installed directly on Android devices for demo purposes. The APK includes the JS bundle and works without Metro bundler.

## Building for iOS

### TestFlight (Production)

1. **Apple Developer Account Required**
   - You need an Apple Developer Program account
   - Ensure your bundle identifier `com.promptcloset.app` is registered in App Store Connect

2. **Configure iOS Credentials**

   ```bash
   eas credentials --platform ios
   ```

   Follow the prompts to set up your Apple certificates and provisioning profile.

3. **Build for TestFlight**
   ```bash
   eas build --platform ios --profile production
   ```

## Building for Android Play Store

The production profile is configured for Android Play Store submission:

```bash
eas build --platform android --profile production
```

Before submitting, update `eas.json` with your Google Play service account key path:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./path-to-your-service-account.json"
    }
  }
}
```

## Quick Reference

| Command                                             | Purpose                      |
| --------------------------------------------------- | ---------------------------- |
| `eas build --platform android --profile preview`    | Build Android APK for demo   |
| `eas build --platform android --profile production` | Build for Android Play Store |
| `eas build --platform ios --profile production`     | Build for iOS TestFlight     |
| `eas credentials --platform ios`                    | Configure iOS certificates   |
| `eas login`                                         | Login to Expo                |
| `eas project:link`                                  | Link existing Expo project   |
