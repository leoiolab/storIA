# Publishing StorIA to the iPhone App Store

This guide walks you through converting your StorIA web app into a native iOS app and publishing it to the App Store.

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program

2. **macOS Computer** (required for iOS development)
   - macOS 12.0 or later
   - Xcode 14.0 or later

3. **Xcode** (free from Mac App Store)
   - Install from [Mac App Store](https://apps.apple.com/app/xcode/id497799835)
   - Install Command Line Tools: `xcode-select --install`

4. **CocoaPods** (iOS dependency manager)
   ```bash
   sudo gem install cocoapods
   ```

## Step 1: Install Capacitor

Capacitor converts your web app into a native iOS app.

```bash
# Install Capacitor CLI and iOS platform
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize Capacitor
npx cap init

# When prompted:
# - App name: StorIA
# - App ID: com.leoiostudio.storia (or your own bundle ID)
# - Web dir: dist
```

## Step 2: Configure Capacitor

Create `capacitor.config.ts` in the root directory:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leoiostudio.storia',
  appName: 'StorIA',
  webDir: 'dist',
  server: {
    // For development, point to your local server
    // url: 'http://localhost:5173',
    // cleartext: true
    // For production, remove server config to use bundled app
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  }
};

export default config;
```

## Step 3: Build Your Web App

```bash
# Build the production version
npm run build:web
```

## Step 4: Add iOS Platform

```bash
# Add iOS platform to your project
npx cap add ios

# Sync your web build to iOS
npx cap sync ios
```

This creates an `ios/` directory with a native Xcode project.

## Step 5: Configure iOS Project in Xcode

1. **Open the project:**
   ```bash
   npx cap open ios
   ```
   Or manually: Open `ios/App/App.xcworkspace` in Xcode

2. **Set up Signing & Capabilities:**
   - Select the "App" target in the left sidebar
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team (your Apple Developer account)
   - Xcode will automatically create a provisioning profile

3. **Configure Bundle Identifier:**
   - Ensure it matches your App ID (e.g., `com.leoiostudio.storia`)
   - This must be unique and match your App Store Connect app

4. **Set Deployment Target:**
   - Minimum iOS version: iOS 13.0 or later (recommended: iOS 14.0)

5. **Configure App Icons:**
   - In Xcode, select "Assets" → "AppIcon"
   - Add your app icons in all required sizes:
     - 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024
   - You can use an online tool like [AppIcon.co](https://www.appicon.co) to generate all sizes from one image

6. **Configure Launch Screen:**
   - Update `ios/App/App/Base.lproj/LaunchScreen.storyboard` or create a launch image
   - Or use the default Capacitor launch screen

## Step 6: Handle API URLs for Production

Update your API configuration to work in the native app:

1. **Update `src/services/cloudStorage.ts`** to detect if running in Capacitor:
   ```typescript
   import { Capacitor } from '@capacitor/core';
   
   const API_URL = Capacitor.isNativePlatform() 
     ? 'https://storia-production.up.railway.app/api'  // Production API
     : import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
   ```

2. **Or use environment variables:**
   - Create `ios/App/App/Info.plist` entries for your API URL
   - Access via Capacitor's config

## Step 7: Test on Simulator

1. **Select a simulator:**
   - In Xcode, click the device selector (top toolbar)
   - Choose an iPhone simulator (e.g., "iPhone 14 Pro")

2. **Run the app:**
   - Click the Play button (▶️) or press `Cmd + R`
   - The app will build and launch in the simulator

3. **Test all features:**
   - Login/Registration
   - Project creation
   - Character editing
   - AI chat
   - All navigation

## Step 8: Test on Physical Device

1. **Connect your iPhone:**
   - Connect via USB
   - Trust the computer on your iPhone

2. **Select your device:**
   - In Xcode device selector, choose your iPhone

3. **Run the app:**
   - Click Play (▶️)
   - On your iPhone: Settings → General → VPN & Device Management
   - Trust your developer certificate

4. **Test thoroughly:**
   - Test all features on the real device
   - Check performance, touch interactions, keyboard behavior

## Step 9: Prepare for App Store Submission

### 9.1 Create App Store Connect Listing

1. **Go to App Store Connect:**
   - Visit [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Sign in with your Apple Developer account

2. **Create a new app:**
   - Click "My Apps" → "+" → "New App"
   - Fill in:
     - Platform: iOS
     - Name: StorIA
     - Primary Language: English (or your choice)
     - Bundle ID: Select the one you created (e.g., `com.leoiostudio.storia`)
     - SKU: A unique identifier (e.g., `storia-001`)
     - User Access: Full Access (or Limited if you have a team)

3. **Complete App Information:**
   - App Privacy: Answer privacy questions
   - Pricing: Set price (Free or Paid)
   - Availability: Select countries

### 9.2 Prepare App Store Assets

You'll need:

1. **App Icon:** 1024x1024 PNG (no transparency)
2. **Screenshots:**
   - Required for iPhone 6.7" (iPhone 14 Pro Max): 1290x2796
   - Required for iPhone 6.5" (iPhone 11 Pro Max): 1242x2688
   - Optional for other sizes
   - Minimum 3 screenshots, maximum 10 per device size
3. **App Preview Video:** Optional but recommended
4. **Description:** Up to 4000 characters
5. **Keywords:** Up to 100 characters (comma-separated)
6. **Support URL:** Your website or support page
7. **Marketing URL:** Optional
8. **Privacy Policy URL:** Required if you collect user data

### 9.3 Build Archive in Xcode

1. **Select "Any iOS Device" or "Generic iOS Device"** in device selector

2. **Create Archive:**
   - Menu: Product → Archive
   - Wait for build to complete
   - Organizer window will open

3. **Validate Archive:**
   - In Organizer, select your archive
   - Click "Validate App"
   - Fix any issues that appear

4. **Distribute App:**
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Select "Upload"
   - Follow the wizard:
     - Distribution options: App Store Connect
     - Distribution certificate: Automatic
     - Upload: Click "Upload"
   - Wait for upload to complete (can take 10-30 minutes)

## Step 10: Submit for Review

1. **In App Store Connect:**
   - Go to your app → "App Store" tab
   - Fill in all required information:
     - Screenshots
     - Description
     - Keywords
     - Support URL
     - Privacy Policy URL
     - Category
     - Age Rating (complete questionnaire)

2. **Build Selection:**
   - Scroll to "Build" section
   - Click "+" to add a build
   - Select the build you just uploaded (may take 10-60 minutes to appear)

3. **Version Information:**
   - Version: 1.0.0 (or your version)
   - Copyright: Your name/company
   - What's New: Release notes

4. **Submit for Review:**
   - Click "Add for Review"
   - Answer export compliance questions
   - Click "Submit for Review"

## Step 11: Review Process

- **Initial Review:** 24-48 hours typically
- **Status Updates:** Check App Store Connect for status
- **If Rejected:** 
  - Read rejection reasons
  - Fix issues
  - Resubmit

## Step 12: After Approval

Once approved:
- Your app will be available on the App Store
- You can set it to release automatically or manually
- Monitor reviews and ratings
- Update as needed with new versions

## Troubleshooting

### Common Issues:

1. **"No signing certificate found":**
   - Ensure you're logged into Xcode with your Apple ID
   - Go to Xcode → Settings → Accounts
   - Add your Apple Developer account

2. **"Bundle identifier already exists":**
   - Change your bundle ID to something unique
   - Update in Xcode and `capacitor.config.ts`

3. **API calls failing:**
   - Check Info.plist for App Transport Security settings
   - Add your API domain to allowed domains if using HTTP

4. **Build errors:**
   - Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
   - Delete Derived Data: Xcode → Settings → Locations → Derived Data → Delete

5. **Capacitor sync issues:**
   ```bash
   npx cap sync ios
   ```

## Updating Your App

For future updates:

1. Make changes to your web app
2. Build: `npm run build:web`
3. Sync: `npx cap sync ios`
4. Test in Xcode
5. Create new archive
6. Upload to App Store Connect
7. Submit new version for review

## Additional Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Cost Summary

- **Apple Developer Program:** $99/year (required)
- **App Store:** No additional fees (30% revenue share if paid app)
- **Total First Year:** $99

## Timeline Estimate

- **Setup & Development:** 1-2 days
- **Testing:** 1-2 days
- **App Store Connect Setup:** 1 day
- **Review Process:** 1-3 days
- **Total:** ~1 week from start to App Store

---

Good luck with your App Store submission! 🚀

