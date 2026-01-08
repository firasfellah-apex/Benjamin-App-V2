# 📱 Capacitor Setup Guide

This guide will help you set up Capacitor to build native iOS and Android apps from your Benjamin web app.

## ✅ What's Already Done

- ✅ Capacitor packages installed (`@capacitor/core`, `@capacitor/cli`, and plugins)
- ✅ `capacitor.config.ts` created with app configuration
- ✅ Vite config updated for Capacitor compatibility
- ✅ Package.json scripts added for Capacitor commands
- ✅ Main.tsx updated with Capacitor initialization
- ✅ .gitignore updated to exclude native folders

## ⚠️ Prerequisites

**Important:** Capacitor 8 requires **Node.js 22+**. Your current Node version is 18.20.3.

### Option 1: Upgrade Node.js (Recommended)

```bash
# Using nvm (if installed)
nvm install 22
nvm use 22

# Or download from nodejs.org
# https://nodejs.org/
```

### Option 2: Use Capacitor 7 (Compatible with Node 18)

If you can't upgrade Node, downgrade to Capacitor 7:

```bash
pnpm remove @capacitor/core @capacitor/cli @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen
pnpm add -D @capacitor/core@7 @capacitor/cli@7
pnpm add @capacitor/app@7 @capacitor/haptics@7 @capacitor/keyboard@7 @capacitor/status-bar@7 @capacitor/splash-screen@7
```

## 🚀 Next Steps

### 1. Build Your Web App

First, build the production version:

```bash
pnpm build
```

This creates the `dist/` folder that Capacitor will use.

### 2. Add iOS Platform

**Requirements:**
- macOS with Xcode installed
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`

```bash
# Add iOS platform
pnpm cap add ios

# Sync web assets to iOS
pnpm cap sync ios

# Open in Xcode
pnpm cap open ios
```

### 3. Add Android Platform

**Requirements:**
- Android Studio installed
- Java Development Kit (JDK) 17+
- Android SDK configured

```bash
# Add Android platform
pnpm cap add android

# Sync web assets to Android
pnpm cap sync android

# Open in Android Studio
pnpm cap open android
```

### 4. Development Workflow

#### Build and Sync

```bash
# Build web app and sync to native platforms
pnpm build
pnpm cap sync

# Or use the convenience scripts:
pnpm cap:build:ios      # Build + sync + open iOS
pnpm cap:build:android  # Build + sync + open Android
```

#### Live Reload (Development)

For faster development, you can use Capacitor's live reload:

1. Start your dev server:
   ```bash
   pnpm dev
   ```

2. Update `capacitor.config.ts` to point to your dev server:
   ```typescript
   server: {
     url: 'http://localhost:5173', // Your Vite dev server
     cleartext: true
   }
   ```

3. Sync:
   ```bash
   pnpm cap sync
   ```

4. Run the app from Xcode/Android Studio

**Note:** Remember to remove the `server.url` before production builds!

## 📱 Platform-Specific Configuration

### iOS Configuration

1. **App Icons & Splash Screens:**
   - Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Replace placeholder icons with your app icons
   - Update splash screen in `ios/App/App/Assets.xcassets/Splash.imageset/`

2. **Info.plist:**
   - Location: `ios/App/App/Info.plist`
   - Add required permissions (camera, location, etc.)
   - Configure URL schemes if needed

3. **Signing:**
   - Open project in Xcode
   - Select your target → Signing & Capabilities
   - Choose your development team
   - Configure provisioning profiles

### Android Configuration

1. **App Icons & Splash Screens:**
   - Icons: `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - Splash: `android/app/src/main/res/drawable/splash.xml`

2. **AndroidManifest.xml:**
   - Location: `android/app/src/main/AndroidManifest.xml`
   - Add required permissions
   - Configure app metadata

3. **Build Configuration:**
   - `android/app/build.gradle` - App-level config
   - `android/build.gradle` - Project-level config
   - Update `minSdkVersion`, `targetSdkVersion`, etc.

## 🔧 Available Scripts

```bash
# Sync web assets to native platforms
pnpm cap:sync

# Copy web assets (without updating native dependencies)
pnpm cap:copy

# Update native dependencies
pnpm cap:update

# Open iOS project in Xcode
pnpm cap:ios

# Open Android project in Android Studio
pnpm cap:android

# Build + sync + open iOS
pnpm cap:build:ios

# Build + sync + open Android
pnpm cap:build:android
```

## 📦 Capacitor Plugins Installed

- **@capacitor/app** - App lifecycle and URL handling
- **@capacitor/haptics** - Haptic feedback
- **@capacitor/keyboard** - Keyboard management
- **@capacitor/status-bar** - Status bar styling
- **@capacitor/splash-screen** - Splash screen control

## 🔌 Additional Plugins You May Need

```bash
# Camera
pnpm add @capacitor/camera

# Geolocation
pnpm add @capacitor/geolocation

# Push Notifications
pnpm add @capacitor/push-notifications

# Local Notifications
pnpm add @capacitor/local-notifications

# Filesystem
pnpm add @capacitor/filesystem

# Network
pnpm add @capacitor/network

# After installing, sync:
pnpm cap sync
```

## 🧪 Testing

### iOS Simulator
1. Open in Xcode: `pnpm cap open ios`
2. Select a simulator
3. Click Run (▶️)

### Android Emulator
1. Open in Android Studio: `pnpm cap open android`
2. Start an emulator or connect a device
3. Click Run (▶️)

### Physical Devices

**iOS:**
- Connect iPhone via USB
- Trust computer on device
- Select device in Xcode
- Run

**Android:**
- Enable USB debugging on device
- Connect via USB
- Select device in Android Studio
- Run

## 📱 App Store Preparation

### iOS (App Store)

1. **App Icons:** 1024x1024px required
2. **Screenshots:** Required for all device sizes
3. **Privacy Policy:** Required URL
4. **App Store Connect:**
   - Create app record
   - Fill metadata
   - Upload build via Xcode or Transporter

### Android (Google Play)

1. **App Icons:** 512x512px required
2. **Feature Graphic:** 1024x500px
3. **Screenshots:** Required for phones and tablets
4. **Privacy Policy:** Required URL
5. **Google Play Console:**
   - Create app
   - Fill store listing
   - Upload APK/AAB

## 🐛 Troubleshooting

### "Capacitor CLI requires NodeJS >=22.0.0"
- Upgrade Node.js to version 22+
- Or downgrade to Capacitor 7

### "Command not found: cap"
- Run: `pnpm install` to ensure packages are installed
- Try: `npx cap` instead of `cap`

### Build Errors
- Clean build folders: `rm -rf ios/build android/app/build`
- Re-sync: `pnpm cap sync`
- Clear caches and rebuild

### iOS Build Issues
- Update CocoaPods: `cd ios/App && pod update`
- Clean Xcode: Product → Clean Build Folder (⇧⌘K)

### Android Build Issues
- Sync Gradle: File → Sync Project with Gradle Files
- Invalidate caches: File → Invalidate Caches / Restart

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Setup Guide](https://capacitorjs.com/docs/ios)
- [Android Setup Guide](https://capacitorjs.com/docs/android)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

## ✅ Checklist Before App Store Submission

- [ ] Node.js upgraded to 22+ (or Capacitor downgraded to 7)
- [ ] iOS platform added and configured
- [ ] Android platform added and configured
- [ ] App icons added for all sizes
- [ ] Splash screens configured
- [ ] Permissions configured in Info.plist and AndroidManifest.xml
- [ ] App tested on physical devices
- [ ] Build configurations verified
- [ ] Version numbers updated
- [ ] Privacy policy URL added
- [ ] App Store assets prepared (screenshots, descriptions)

---

**Next Steps:**
1. Upgrade Node.js or downgrade Capacitor
2. Build your app: `pnpm build`
3. Add iOS platform: `pnpm cap add ios`
4. Add Android platform: `pnpm cap add android`
5. Test on simulators/emulators
6. Test on physical devices
7. Prepare for app store submission

Good luck! 🚀

