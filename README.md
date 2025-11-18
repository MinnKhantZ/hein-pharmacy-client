# Hein Pharmacy Mobile App 📱

A comprehensive mobile application for pharmacy inventory and income management, built with React Native and Expo. Manage multiple pharmacy owners' inventory, record sales, and track income analytics with beautiful charts and real-time synchronization.

![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue)
![Expo](https://img.shields.io/badge/Expo-~54.0.12-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

## ✨ Features

### 🏥 Core Pharmacy Management
- **Multi-Owner Inventory**: Different pharmacy owners can manage their own inventory items
- **Sales Recording**: Interactive cart system with automatic income calculation
- **Real-Time Analytics**: Comprehensive income charts and reports with period filters
- **Cross-Platform**: Native iOS, Android, and Web support

### 📱 Mobile Experience
- **Intuitive UI**: Modern React Native interface with smooth animations
- **Offline-First**: Secure local storage with Expo Secure Store
- **Push Notifications**: Real-time alerts for low stock and important updates
- **Pull-to-Refresh**: Easy data synchronization across all screens
- **Responsive Design**: Optimized for phones and tablets

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based login system
- **Biometric Support**: Fingerprint/Face ID integration
- **Auto-Login**: Seamless experience with stored credentials
- **Protected Routes**: Role-based access control

### 📊 Analytics Dashboard
- **Income Trends**: Line charts showing income over time
- **Owner Analytics**: Bar charts comparing income by owner
- **Category Breakdown**: Pie charts for income distribution
- **Period Filters**: Daily, monthly, and yearly views
- **Summary Cards**: Quick stats for total income and sales

### 🛒 Sales Management
- **Smart Cart**: Add items with quantity validation
- **Customer Info**: Capture customer details for each sale
- **Payment Methods**: Support for cash, card, and mobile payments
- **Stock Validation**: Prevent overselling with real-time checks
- **Sales History**: Complete transaction history with search
- **Receipt Printing**: Print receipts on Bluetooth thermal printers (mobile) or browser (web)

### 🖨️ Receipt Printing (NEW)
- **Bluetooth Printing**: Connect to thermal printers on mobile devices
- **Web Printing**: Browser-based printing for web platform
- **Professional Receipts**: Formatted receipts with store info, items, and totals
- **Cross-Platform**: Works seamlessly on iOS, Android, and web

### 📦 Inventory Control
- **Full CRUD**: Create, read, update, delete inventory items
- **Advanced Search**: Search by name, description, or barcode
- **Category Management**: Organize items by categories
- **Low Stock Alerts**: Automatic notifications for minimum stock levels
- **Price Tracking**: Separate unit and selling prices
- **Owner Assignment**: Items assigned to specific owners

## 🛠️ Tech Stack

### Frontend Framework
- **React Native 0.81.4** with Expo SDK 54
- **Expo Router** for file-based navigation
- **React 19.1.0** with concurrent features
- **TypeScript 5** for type safety

### State Management & Data
- **React Query (@tanstack/react-query)** for server state
- **React Context API** for global state
- **Axios** for HTTP requests with interceptors
- **Expo Secure Store** for encrypted local storage

### UI & UX
- **React Native Chart Kit** for beautiful charts
- **Expo Vector Icons** for consistent iconography
- **React Native Reanimated** for smooth animations
- **React Native Gesture Handler** for touch interactions
- **Expo Image** for optimized image loading

### Development Tools
- **Expo Dev Client** for custom development builds
- **Expo Updates** for OTA updates
- **Expo Notifications** for push notifications
- **Expo Device** for device information
- **Expo Haptics** for tactile feedback

### Internationalization
- **i18next** for multi-language support
- **react-i18next** for React integration
- **Expo Localization** for device locale detection

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Git**
- **iOS Simulator** (macOS only) or **Android Studio** (for Android emulator)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd hein-pharmacy-client
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create `.env` file from example:

```bash
cp .env.example .env
```

**Required environment variables:**

```env
# API Configuration
API_BASE_URL=http://localhost:3000/api

# App Configuration
APP_NAME=Hein Pharmacy
APP_VERSION=1.0.0
```

### 4. Start Development Server

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

### 5. Backend Setup

Ensure the backend server is running:

```bash
cd ../hein-pharmacy-server
npm run dev
```

## 📱 App Structure

```
hein-pharmacy-client/
├── app/                          # Expo Router pages
│   ├── (auth)/                  # Authentication screens
│   │   ├── login.tsx           # Login screen
│   │   └── register.tsx        # Registration screen
│   ├── (tabs)/                 # Main app tabs
│   │   ├── _layout.tsx         # Tab navigation layout
│   │   ├── index.tsx           # Dashboard/Home
│   │   ├── inventory.tsx       # Inventory management
│   │   ├── sales.tsx           # Sales recording
│   │   ├── income.tsx          # Income analytics
│   │   └── profile.tsx         # User profile
│   ├── income-details.tsx      # Detailed income view
│   ├── modal.tsx               # Modal screens
│   └── _layout.tsx             # Root layout
├── components/                 # Reusable components
│   ├── ui/                    # UI components
│   ├── SearchableDropdown.tsx # Search dropdown
│   ├── OwnerSelector.tsx      # Owner selection
│   └── themed-text.tsx        # Themed text components
├── contexts/                  # React contexts
│   ├── AuthContext.js         # Authentication state
│   └── NotificationContext.js # Notification state
├── hooks/                     # Custom hooks
│   ├── useNotifications.ts    # Notification hook
│   └── use-theme-color.ts     # Theme color hook
├── services/                  # API services
│   ├── api.js                 # Axios instance & API calls
│   └── notificationService.js # Notification service
├── constants/                 # App constants
│   └── theme.ts               # Color theme
├── utils/                     # Utility functions
├── assets/                    # Static assets
│   └── images/               # App icons & images
└── package.json
```

## 🔧 Development

### Running the App

```bash
# Development mode (with hot reload)
npm start

# Clear cache and restart
npx expo start --clear

# Run on specific device
npx expo run:android
npx expo run:ios
```

### Building for Production

```bash
# Build for production
npx expo build:android
npx expo build:ios

# Submit to stores
npx expo submit --platform android
npx expo submit --platform ios
```

### Testing

```bash
# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🔐 Authentication Flow

1. **Registration**: New owners register with username, email, and password
2. **Login**: JWT token stored securely in Expo Secure Store
3. **Auto-login**: App checks for stored credentials on startup
4. **Protected Routes**: All API calls include JWT in Authorization header
5. **Logout**: Clears stored tokens and redirects to login

## 📊 API Integration

The app communicates with the backend via RESTful APIs:

- **Authentication**: `/api/auth/*`
- **Inventory**: `/api/inventory/*`
- **Sales**: `/api/sales/*`
- **Income Analytics**: `/api/income/*`

All requests include:
- JWT token in Authorization header
- JSON content type
- Error handling with user-friendly messages

## 🔔 Notifications

### Push Notifications
- **Low Stock Alerts**: When items reach minimum stock level
- **Sales Reminders**: Daily sales summary notifications
- **System Updates**: Important app updates and announcements

### Local Notifications
- **Scheduled**: Daily reminders for inventory checks
- **Interactive**: Actionable notifications with deep links

## 🎨 Theming

The app supports automatic dark/light mode:

- **System Preference**: Follows device theme
- **Manual Override**: User can set preferred theme
- **Consistent Colors**: Theme-aware color palette
- **Dynamic Icons**: Theme-appropriate icon variants

## 🌐 Internationalization

Multi-language support with:
- **English** (default)
- **Burmese/Myanmar** (planned)
- **Device Locale**: Automatic language detection
- **RTL Support**: Ready for right-to-left languages

## 🔍 Advanced Features

### Inventory Search & Filter
- Real-time search across name, description, barcode
- Category filtering
- Owner-based filtering
- Sort by name, quantity, price, date

### Sales Processing
- Smart cart with quantity validation
- Customer information capture
- Multiple payment method support
- Automatic inventory deduction
- Receipt generation (planned)

### Analytics & Reporting
- Interactive charts with touch gestures
- Date range selection
- Owner-specific analytics
- Export capabilities (planned)

## 🚀 Deployment

### App Store Deployment

1. **Build Production App**:
   ```bash
   npx expo build:ios
   npx expo build:android
   ```

2. **Configure App Store**:
   - Update app metadata
   - Set up in-app purchases (if needed)
   - Configure push notification certificates

3. **Submit for Review**:
   ```bash
   npx expo submit --platform ios
   npx expo submit --platform android
   ```

### OTA Updates

Expo enables over-the-air updates:

```javascript
// In app config
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork
6. Create a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow React Native best practices
- Use meaningful component and variable names
- Add comments for complex logic
- Test on both iOS and Android

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the [documentation](./docs/) folder
- Contact the development team

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Charts powered by [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit)
- Icons from [Expo Vector Icons](https://docs.expo.dev/guides/icons/)
- State management with [React Query](https://tanstack.com/query/latest)

---

**Happy coding! 🎉**
