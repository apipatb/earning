# EarnTrack Backend API

REST API for tracking earnings across multiple platforms.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Server will run on `http://localhost:3001`

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
Most endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

#### Platforms
- `GET /platforms` - Get all platforms (with stats)
- `POST /platforms` - Create new platform
- `PUT /platforms/:id` - Update platform
- `DELETE /platforms/:id` - Delete platform

#### Earnings
- `GET /earnings` - Get all earnings (with filters)
- `POST /earnings` - Create new earning
- `PUT /earnings/:id` - Update earning
- `DELETE /earnings/:id` - Delete earning

#### Analytics
- `GET /analytics/summary` - Get summary analytics

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Deployment

### Railway (Recommended)

1. Install Railway CLI
```bash
npm install -g @railway/cli
```

2. Login and initialize
```bash
railway login
railway init
```

3. Add PostgreSQL
```bash
railway add postgresql
```

4. Set environment variables in Railway dashboard

5. Deploy
```bash
railway up
```

### Manual Deployment

1. Build
```bash
npm run build
```

2. Set environment variables

3. Run migrations
```bash
npm run db:migrate
```

4. Start server
```bash
npm start
```

## 📝 Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="production"
ALLOWED_ORIGINS="https://yourfrontend.com"
```

## 🏗️ Project Structure

```
src/
├── controllers/      # Request handlers
├── routes/          # API routes
├── middleware/      # Express middleware
├── utils/           # Utility functions
├── lib/             # Third-party libraries
├── types/           # TypeScript types
└── server.ts        # Entry point
```

## 🔐 Security

- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens for authentication
- Rate limiting (100 requests/15min)
- Input validation with Zod
- SQL injection prevention (Prisma ORM)

## 📊 Database Schema

See `schema.prisma` for complete schema.

Key tables:
- `users` - User accounts
- `platforms` - Earning platforms
- `earnings` - Earning entries
- `goals` - Income goals (future)

## 🐛 Debugging

View database in Prisma Studio:
```bash
npm run db:studio
```

Check logs:
```bash
# Development
Check console output

# Production (Railway)
railway logs
```

## 📄 License

MIT
