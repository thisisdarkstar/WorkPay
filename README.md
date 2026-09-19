# WorkPay — Mobile Application 📱

WorkPay is a comprehensive mobile workforce management application built with **React Native** and **Expo**. It provides end-to-end solutions for attendance tracking with GPS geofencing, leave applications, payroll monitoring, advance requests, and multi-office administration.

---

## 🌟 Key Features

### 👨‍💼 Admin Portal
- **Real-Time Attendance Dashboard**: View live present, absent, and late employee metrics filtered by office branch.
- **Bulk Attendance Finalization**: Automatically mark absent employees at the end of the shift.
- **Employee Management**: Onboard new employees, update profiles, deactivate accounts, and configure salaries/overtime rates.
- **Leave Request Approvals**: Review pending leave applications with single-tap approvals or rejections.
- **Salary & Payroll Oversight**: Track monthly salaries, disburse salary advances, manage deductions, and monitor overtime payouts.
- **Multi-Office Settings**: Create and configure office branches with GPS coordinates (latitude, longitude) and geofence radii.
- **Holiday Calendar**: Define annual company holidays that automatically integrate with leave calculations.

### 👨‍💻 Employee Portal
- **Geofenced Check-In / Check-Out**: Mark daily attendance securely only when physically within the designated office perimeter.
- **Leave Applications**: Apply for time off with automated holiday exclusion and real-time paid/unpaid balance previews.
- **Attendance History**: View detailed monthly attendance logs, overtime minutes, and working hours.
- **Paystub & Transaction Ledger**: Track base salary, salary advances, overtime payments, and deductions.
- **Profile & Bank Details**: View employment details, update bank account/IFSC information, and change passwords.

---

## 🛠️ Tech Stack

- **Framework**: [React Native 0.79](https://reactnative.dev/) with [Expo SDK 53](https://expo.dev/)
- **Routing**: [Expo Router v5](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **UI & Styling**: [React Native Paper](https://callstack.github.io/react-native-paper/), Vector Icons, Custom Responsive Layouts
- **Security & Storage**: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) for hardware-backed JWT storage
- **Device APIs**:
  - `expo-location`: Foreground GPS positioning for geofence validation
  - `expo-image`: Optimized cached image rendering
  - `expo-haptics`: Tactile feedback on user actions
- **Monetization**: `react-native-google-mobile-ads` (Google AdMob Banner support)
- **Networking**: `axios` with unified error handling and bearer token interceptors

---

## 📂 Project Structure

```
WorkPay/
├── app/                            # Expo Router file-based pages
│   ├── (admin)/                    # Admin-specific routes
│   │   ├── (dashboard)/            # Dashboard, AttendanceStatus, LeaveRequests
│   │   ├── (employeeManagement)/   # Employee listing & details
│   │   ├── (settings)/             # Office & Holiday configurations
│   │   ├── SalaryManagement.jsx    # Payroll, advances & deductions
│   │   └── _layout.jsx             # Admin tab layout & navigation
│   ├── (employee)/                 # Employee-specific routes
│   │   ├── (home)/                 # Check-in, geofence, profile
│   │   ├── Attendance.jsx          # Monthly attendance records
│   │   ├── Leave.jsx               # Leave requests & balance
│   │   ├── Payment.jsx             # Salary & transactions
│   │   └── _layout.jsx             # Employee tab layout & navigation
│   ├── ForgotPassword.jsx          # Password recovery screen
│   ├── index.jsx                   # Role-based login (Admin / Employee)
│   └── _layout.tsx                 # App entry root layout & providers
├── components/                     # Reusable UI components & cards
├── constants/
│   ├── AdsConfig.ts                # AdMob banner ad configurations
│   ├── Colors.ts                   # Design system color palettes
│   └── EnvValue.js                 # Centralized backend URL loader
├── context/
│   ├── EmployeeContext.js          # Global employee state & toasts
│   └── OfficeContext.js            # Global office settings state
├── services/
│   └── ApiService.js               # SecureStore tokens & error sanitization
└── utils/
    └── TimeUtils.js                # Geolocation distance & date math helpers
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`
- **Development Tools**:
  - For Android: [Android Studio](https://developer.android.com/studio) with configured Android Virtual Device (AVD)
  - For iOS (macOS only): Xcode with simulator
  - (Optional) [Expo Go](https://expo.dev/go) on a physical mobile device

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/thisisdarkstar/WorkPay.git
cd WorkPay

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```

Configure the backend URL according to your testing target:

| Target | `EXPO_PUBLIC_API_URL` Value |
| :--- | :--- |
| **Android Studio Emulator** | `http://10.0.2.2:3000` |
| **iOS Simulator** | `http://localhost:3000` |
| **Physical Phone (Wi-Fi)** | `http://<your-computer-local-ip>:3000` *(e.g. `http://192.168.1.50:3000`)* |
| **Production Backend** | `https://api.yourdomain.com` *(Must use HTTPS)* |

### 4. Running the Development Server
```bash
# Start Metro bundler
npm run start

# Or launch directly into Android emulator
npm run android

# Or launch directly into iOS simulator
npm run ios
```

---

## 📢 Google AdMob Setup & Credentials

The app uses `react-native-google-mobile-ads` to display banner ads. Two types of credentials are required:

### 1. AdMob App ID (SDK Initialization)
Required natively by the Google Mobile Ads SDK when the application launches.

- **Locations in Project**:
  1. `app.json`:
     ```json
     [
       "react-native-google-mobile-ads",
       {
         "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
         "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
         "userTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you."
       }
     ]
     ```
  2. `android/app/src/main/AndroidManifest.xml`:
     ```xml
     <meta-data
         android:name="com.google.android.gms.ads.APPLICATION_ID"
         android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
         tools:replace="android:value"/>
     ```

- **Official Google Test App IDs (Safe for Development)**:
  - **Android**: `ca-app-pub-3940256099942544~3347511713`
  - **iOS**: `ca-app-pub-3940256099942544~1458002511`

---

### 2. Ad Unit IDs (Banner, App Open, & Interstitial)
Identifies individual ad units rendered across app flows.

- **Locations in Project**:
  Define in your `.env` or `.env.local` file:
  ```env
  # Google AdMob Banner Ad Unit ID (Display Banners)
  EXPO_PUBLIC_ADMOB_BANNER_ID="ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"

  # Google AdMob App Open Ad Unit ID (App Launch / Splash Transition)
  EXPO_PUBLIC_ADMOB_APP_OPEN_ID="ca-app-pub-XXXXXXXXXXXXXXXX/AAAAAAAAAA"

  # Google AdMob Interstitial Ad Unit ID (Post-Checkout Shift Completion)
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID="ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII"
  ```

- **Official Google Test Ad Unit IDs**:
  - **Banner (320x50)**: `ca-app-pub-3940256099942544/6300978111`
  - **Adaptive Banner**: `ca-app-pub-3940256099942544/9214589741`
  - **App Open Ad**: `ca-app-pub-3940256099942544/9257395921`
  - **Interstitial Ad**: `ca-app-pub-3940256099942544/1033173712`

- **Fallback & Safety Logic (`constants/AdsConfig.ts` & `services/AdService.ts`)**:
  - In development mode (`__DEV__ === true`), the app **always** loads Google's official test ad units to protect your account from invalid traffic.
  - In release builds, if any ad unit ID variable is left blank, it safely falls back to test ads rather than crashing.
  - **App Open Ad**: Fires on app launch / cold-start with in-memory session throttling so users are never spammed.
  - **Interstitial Ad**: Pre-cached in memory and triggered at the natural workflow completion point right after the attendance checkout API returns success.

> [!WARNING]
> **AdMob Policy Reminder**: Never click your own live ads or load production ad units on personal devices during development. Doing so will flag invalid traffic and can lead to permanent account suspension. Always verify ad display using test IDs or register your device as a test device in the [Google AdMob Console](https://admob.google.com/).

---

## 🔨 Building & Deploying the Application

WorkPay can be built locally using Gradle for direct sideloading (`.apk`) or for Google Play Store publication (`.aab`).

---

### ⚡ Quick Copy-Paste One-Liners (PowerShell on Windows)

#### 1. Build Standalone Release APK & Install Directly to Phone
Runs the offline bundle export with cache reset, builds the native release APK, and streams it to your connected device via ADB:

```powershell
npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache; cd android; .\gradlew assembleRelease; cd ..; adb install -r android/app/build/outputs/apk/release/app-release.apk
```

#### 2. Build Google Play Store Android App Bundle (.aab)
Exports the production offline bundle with cache reset and compiles the signed release App Bundle required by Google Play Console:

```powershell
npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache; cd android; .\gradlew bundleRelease; cd ..
```

---

### 📋 Production Build & Release Guide

You can compile both the **Standalone APK** (for direct device installation) and the **Android App Bundle (.aab)** (for Google Play Console release) locally using the steps below.

> [!IMPORTANT]
> **Working Directory Rule**:
> - **Always run `npx expo ...` commands from the project root** (`WorkPay/`), NOT inside `WorkPay/android/`. Running Expo inside `android/` will result in `ConfigError: package.json does not exist`.
> - Gradle commands (`.\gradlew ...`) are executed inside `WorkPay/android/`.

---

#### ⚡ Quick Method: Build Both .AAB and .APK in One Shot & Copy to Root

Run this single PowerShell command from the **`WorkPay/`** root directory:

```powershell
npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache; cd android; .\gradlew :app:bundleRelease :app:assembleRelease --rerun-tasks; cd ..; Copy-Item "android\app\build\outputs\bundle\release\app-release.aab" -Destination "app-release.aab" -Force; Copy-Item "android\app\build\outputs\apk\release\app-release.apk" -Destination "app-release.apk" -Force; Get-ChildItem "app-release.aab", "app-release.apk" | Select-Object Name, Length, LastWriteTime
```

**What this one-liner does:**
1. Exports the production Hermes JavaScript bundle and static assets from Metro.
2. Changes to `android/` and runs both `bundleRelease` (AAB) and `assembleRelease` (APK) with `--rerun-tasks` to ensure a completely fresh build.
3. Automatically returns to the project root and copies both `app-release.aab` and `app-release.apk` to `WorkPay/` for immediate access.

---

#### Method A: Local Release APK (Direct Device Sideloading & Testing)

1. **Export and Embed the Offline JavaScript Bundle** *(from `WorkPay/` root)*:
   ```powershell
   npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache
   ```
   - `--dev false`: Compiles production-optimized code with Hermes bytecode and strips debug overhead.
   - `--reset-cache`: Ensures changes to `.env` / `.env.local` are freshly evaluated.

2. **Compile the Release APK with Gradle**:
   ```powershell
   cd android
   .\gradlew assembleRelease
   cd ..
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`

3. **Install to Physical Device via ADB**:
   ```powershell
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```
   *(If an old debug version is installed, uninstall it first: `adb uninstall com.chiranjeebnayak.workPayApp`)*

---

#### Method B: Google Play Store Release (AAB - Android App Bundle)

Google Play Store requires an **Android App Bundle (.aab)** format:

1. **Export the Offline JavaScript Bundle** *(from `WorkPay/` root)*:
   ```powershell
   npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache
   ```

2. **Compile the Signed Release App Bundle**:
   ```powershell
   cd android
   .\gradlew bundleRelease
   cd ..
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`

3. **Bring AAB to Root for Easy Access**:
   ```powershell
   Copy-Item "android\app\build\outputs\bundle\release\app-release.aab" -Destination "app-release.aab" -Force
   ```

4. **Upload to Google Play Console**:
   - Open [Google Play Console](https://play.google.com/console/).
   - Go to your App &rarr; **Production** (or **Closed / Internal Testing**).
   - Click **Create new release** and drag-and-drop `app-release.aab`.

---

#### 🛡️ Play Console Production Checklist

Before uploading, verify these requirements are met (all are pre-configured in this repository):

| Requirement | Configuration Location | Status |
| :--- | :--- | :--- |
| **Target SDK 36** | `android/app/build.gradle` & `android/build.gradle` | ✅ Targets API 36 (Android 16 preview / Android 15+ ready) |
| **R8 Code Obfuscation** | `android/app/build.gradle` (`minifyEnabled true`) | ✅ Code minified; `proguard.map` embedded inside AAB metadata |
| **Advertising ID (`AD_ID`)** | `android/app/src/main/AndroidManifest.xml` & `app.json` | ✅ `com.google.android.gms.permission.AD_ID` declared |
| **16 KB Page-Size Support** | `android/app/build.gradle` (`-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON`) | ✅ Compliant with Android 15+ 16 KB page memory architecture |
| **Version Code Increment** | `app.json` (`versionCode`) & `android/app/build.gradle` | ✅ Must increment `versionCode` by 1 for each new Play Store release |

> [!TIP]
> **Deobfuscation File**: If Google Play Console requests a mapping file, R8 generates it at:
> `android/app/build/outputs/mapping/release/mapping.txt`. (Note: in Modern AABs, Gradle automatically embeds this in `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map` inside the `.aab`).

---

### Method C: Cloud Builds with EAS (Expo Application Services)

If you prefer building in the cloud without configuring local Android SDKs:

1. **Install EAS CLI and Log In**:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure Production Credentials**:
   Ensure live `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_ADMOB_BANNER_ID` are set in your EAS secrets or `.env`:
   ```env
   EXPO_PUBLIC_API_URL="https://work-pay-service.vercel.app"
   EXPO_PUBLIC_ADMOB_BANNER_ID="ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"
   ```

3. **Trigger Cloud Builds (Android & iOS)**:
   - **Android - Standalone Testing APK**:
     ```bash
     eas build --platform android --profile preview
     ```
   - **Android - Google Play Store App Bundle (AAB)**:
     ```bash
     eas build --platform android --profile production
     ```
   - **iOS - Simulator Build (No Apple Developer Account Required)**:
     ```bash
     eas build --platform ios --profile preview-simulator
     ```
     *Produces a `.tar.gz` containing `WorkPay.app`. Drag-and-drop directly into any iOS Simulator on a Mac.*
   - **iOS - Physical Device Testing (Ad-Hoc / Internal Distribution)**:
     ```bash
     # 1. Register your physical iPhone / iPad UDID:
     eas device:create
     
     # 2. Trigger the internal distribution build:
     eas build --platform ios --profile preview
     ```
     *EAS provides an installation web link with a QR code. Open the link in Safari on your registered iPhone to install the `.ipa` over-the-air.*
   - **iOS - TestFlight / App Store Release**:
     ```bash
     eas build --platform ios --profile production
     eas submit --platform ios
     ```

---

### 🍏 iOS Testing & Deployment Guide

Testing on iOS requires specific handling depending on your environment:

#### 1. Testing on Physical iOS Devices (iPhone / iPad)
Apple strictly enforces cryptographic code-signing for all physical devices. You have two options:

##### Option A: Internal Ad-Hoc Distribution (Fastest for Internal Teams)
1. Register your iPhone/iPad with your Apple Developer account via EAS:
   ```bash
   npx eas device:create
   ```
   *(Scan the QR code displayed with your iPhone camera to register your device's UDID automatically).*
2. Build the Ad-Hoc installable `.ipa`:
   ```bash
   npx eas build --platform ios --profile preview
   ```
3. Once the build succeeds, EAS outputs a public installation page. Open this link in **Safari on your iPhone** and tap **Install**.

##### Option B: Apple TestFlight (Best for External Testers & Clients)
1. Ensure your Apple Developer Account ($99/year) is connected in EAS.
2. Build for production:
   ```bash
   npx eas build --platform ios --profile production
   ```
3. Upload to App Store Connect:
   ```bash
   npx eas submit --platform ios
   ```
4. In [App Store Connect](https://appstoreconnect.apple.com), navigate to **TestFlight**, add internal/external tester emails. Testers download the free **TestFlight** app from the App Store and tap **Accept** to install.

#### 2. Testing on iOS Simulator (Mac)
If you or a team member have a Mac with Xcode installed:
- Build command:
  ```bash
  npx eas build --platform ios --profile preview-simulator
  ```
- **No Apple Developer account required**. EAS compiles a `.tar.gz` bundle on Expo's macOS cloud.
- Unpack and drag `WorkPay.app` directly onto the Xcode iOS Simulator window.

#### 3. iOS Permissions & Privacy Keys Configured
The following iOS permissions are pre-configured in `app.json` (`expo.ios.infoPlist`):
- `NSLocationWhenInUseUsageDescription`: Allows location verification against office geo-fencing for clock-in.
- `NSLocationAlwaysAndWhenInUseUsageDescription`: Extended location permission for persistent office presence verification.
- `ITSAppUsesNonExemptEncryption: false`: Eliminates App Store export compliance questionnaires.
- `userTrackingUsageDescription`: Required by Apple App Tracking Transparency (ATT) framework for Google AdMob (`react-native-google-mobile-ads`).

---

### 🧹 Build Maintenance & Clean Commands

If you ever encounter build cache errors, out-of-memory errors, or stale native dependencies:

```powershell
# Stop any stuck Gradle daemons
cd android
.\gradlew --stop

# Clean build artifacts
.\gradlew clean
cd ..

# Clear Metro / Expo bundler cache
npx expo start -c
```

---

## 📄 License
This project is proprietary and confidential. All rights reserved.
