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
│   ├── EmployeeContext.jsx         # Global employee state & toasts
│   ├── OfficeContext.jsx           # Global office settings state
│   └── ThemeContext.js             # Theme switching (Light / Dark)
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

## 🔨 Building the Application

WorkPay can be built locally using Gradle for direct sideloading, or in the cloud using Expo Application Services (EAS).

### Prerequisites for Local Android Builds
1. **Java Development Kit (JDK)**: JDK 17 or higher installed (`java -version`).
2. **Android SDK**: Android SDK Platform 34/35 and Command-Line Tools installed via Android Studio.
3. **Environment Variables**:
   - `ANDROID_HOME` pointing to your Android SDK directory (e.g., `C:\Users\<username>\AppData\Local\Android\Sdk` on Windows).
   - `%ANDROID_HOME%\platform-tools` added to system `PATH` (for `adb`).
4. **SDK Path File**: Ensure `android/local.properties` contains:
   ```properties
   sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk
   ```

---

### Method A: Local Release APK Build (Recommended for Direct Device Testing)

This method produces a standalone `.apk` file that does not depend on Metro or Expo Go, perfect for sideloading to physical devices or sharing with testers.

#### Step 1: Export and Embed the Offline JavaScript Bundle
From the project root:
```bash
npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache
```

#### Step 2: Compile the Release APK with Gradle
Navigate to the `android` folder and compile:

- **On Windows (PowerShell / CMD)**:
  ```powershell
  cd android
  .\gradlew assembleRelease
  cd ..
  ```

- **On macOS / Linux**:
  ```bash
  cd android
  ./gradlew assembleRelease
  cd ..
  ```

#### Step 3: Locate the Built APK
The compiled release APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

#### Step 4: Install / Sideload via ADB
Connect your physical phone via USB (with **USB Debugging** enabled in Developer Options):
```bash
# Verify device connection
adb devices

# Install APK directly to connected device
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

*(If you get a signature mismatch error `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, uninstall the previous version first: `adb uninstall com.chiranjeebnayak.workPayApp`)*

---

### Method B: Google Play Store Release (AAB - Android App Bundle)

Google Play Store requires an **Android App Bundle (.aab)** for store publication:

```powershell
cd android
# On Windows:
.\gradlew bundleRelease

# On macOS/Linux:
./gradlew bundleRelease
cd ..
```

The resulting bundle is saved at:
```
android/app/build/outputs/bundle/release/app-release.aab
```
Upload this `.aab` file to Google Play Console under **Internal Testing**, **Closed Testing**, or **Production**.

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

3. **Trigger Cloud Builds**:
   - **Generate Standalone Testing APK**:
     ```bash
     eas build --platform android --profile preview
     ```
   - **Generate Google Play Store App Bundle (AAB)**:
     ```bash
     eas build --platform android --profile production
     ```

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
