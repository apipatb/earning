# EarnTrack Frontend

React + TypeScript frontend for EarnTrack earning tracker app.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

App will run on `http://localhost:5173`

## 🏗️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Axios** - API client
- **React Hook Form** - Forms
- **Recharts** - Charts
- **Lucide React** - Icons
- **date-fns** - Date utilities

## 📁 Project Structure

```
src/
├── components/      # Reusable components
├── pages/          # Page components
├── store/          # Zustand stores
├── lib/            # Utilities (API client, etc.)
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## 🎨 Features

- ✅ User authentication (register/login)
- ✅ Dashboard with stats and charts
- ✅ Platform management
- ✅ Earnings tracking
- ✅ Analytics and insights
- ✅ Responsive design (mobile-first)
- ✅ Dark mode (coming soon)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI
```bash
npm install -g vercel
```

2. Deploy
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `VITE_API_URL` - Your backend API URL

### Manual Deployment

1. Build
```bash
npm run build
```

2. Serve the `dist/` folder with any static host

## 🔧 Environment Variables

```env
VITE_API_URL=https://your-api-url.com/api/v1
```

## 📄 License

MIT
