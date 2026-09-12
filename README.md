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

## 📦 Production Builds (EAS Build)

To generate release APK / AAB packages for distribution:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure your live AdMob App IDs in `app.json`:
   ```json
   "react-native-google-mobile-ads": {
     "androidAppId": "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy",
     "iosAppId": "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
   }
   ```
3. Set production environment variables in your EAS project dashboard or `.env`:
   ```env
   EXPO_PUBLIC_API_URL="https://api.yourdomain.com"
   EXPO_PUBLIC_ADMOB_BANNER_ID="ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz"
   ```
4. Trigger the build:
   ```bash
   eas build --platform android --profile production
   ```

---

## 📄 License
This project is proprietary and confidential. All rights reserved.
