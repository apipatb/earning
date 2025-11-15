# EarnTrack - Multi-Platform Earnings Tracker

A full-stack web application for tracking earnings across multiple platforms with analytics, insights, and goal management.

## Overview

EarnTrack helps freelancers, gig workers, and multi-platform earners track their income, analyze performance, and set goals. Built with modern technologies for scalability and user experience.

## Features

- **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- **Platform Management** - Add and track multiple earning platforms (Upwork, Fiverr, DoorDash, etc.)
- **Earnings Tracking** - Record earnings with date, amount, hours, and notes
- **Analytics Dashboard** - Visualize earnings trends, platform breakdowns, and performance metrics
- **Time Filtering** - View data by today, week, month, or year
- **Responsive Design** - Mobile-first design that works on all devices
- **Real-time Updates** - Instant updates when adding or editing data

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Relational database
- **Prisma ORM** - Database toolkit and query builder
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Zod** - Schema validation

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Charting library
- **Lucide React** - Icon library
- **date-fns** - Date utilities

## Project Structure

```
app/
├── backend/           # Node.js + Express backend
│   ├── prisma/       # Database schema and migrations
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth and error handling
│   │   ├── routes/       # API route definitions
│   │   ├── utils/        # JWT, validation helpers
│   │   └── server.ts     # Express app setup
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   ├── lib/          # API client, utilities
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── TECH_SPEC.md       # Technical specification
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### 1. Clone the repository

```bash
git clone <repository-url>
cd earning/app
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env with your database credentials:
# DATABASE_URL="postgresql://user:password@localhost:5432/earntrack"
# JWT_SECRET="your-secret-key-here"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env with your backend URL:
# VITE_API_URL=http://localhost:3001/api/v1

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Access the application

Open your browser and navigate to `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Platforms
- `GET /api/v1/platforms` - Get all platforms
- `POST /api/v1/platforms` - Create platform
- `PUT /api/v1/platforms/:id` - Update platform
- `DELETE /api/v1/platforms/:id` - Delete platform

### Earnings
- `GET /api/v1/earnings?period=month` - Get earnings (today/week/month/all)
- `POST /api/v1/earnings` - Create earning
- `PUT /api/v1/earnings/:id` - Update earning
- `DELETE /api/v1/earnings/:id` - Delete earning

### Analytics
- `GET /api/v1/analytics?period=month` - Get analytics (week/month/year)

## Database Schema

### User
- id (UUID)
- email (unique)
- passwordHash
- name
- timezone
- currency

### Platform
- id (UUID)
- userId (FK)
- name
- category (freelance/delivery/services/other)
- color
- expectedRate
- isActive

### Earning
- id (UUID)
- userId (FK)
- platformId (FK)
- date
- hours (optional)
- amount
- notes

### Goal
- id (UUID)
- userId (FK)
- title
- targetAmount
- currentAmount
- deadline
- status

## Development

### Backend

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Frontend

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Deployment

### Backend (Railway/Render)

1. Create a PostgreSQL database
2. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret key for JWT
   - `PORT` - Server port (default: 3001)
3. Deploy the backend directory
4. Run migrations: `npx prisma migrate deploy`

### Frontend (Vercel)

1. Set environment variable:
   - `VITE_API_URL` - Backend API URL (e.g., `https://api.earntrack.com/api/v1`)
2. Deploy the frontend directory
3. Build command: `npm run build`
4. Output directory: `dist`

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens for authentication
- HTTPS-only in production
- CORS enabled for frontend domain
- Rate limiting on API endpoints
- Input validation with Zod schemas
- SQL injection prevention via Prisma

## Future Enhancements

### Phase 2
- Goal tracking and progress visualization
- Email notifications for milestones
- Export data to CSV/Excel
- Multiple currency support
- Team collaboration features

### Phase 3
- API integrations (Upwork, PayPal, Stripe)
- Automatic earnings import
- Tax calculation and reports
- Invoice generation
- Mobile app (React Native)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Email: support@earntrack.com

## Acknowledgments

Built from the comprehensive earning strategy guides:
- Daily Earning Strategy Guide
- 12-Week Action Plan
- Thai Earning Opportunities
- Platform Application Templates
- Earnings Calculator
- Automation & Productivity Tools

---

**EarnTrack** - Track smarter, earn better.
