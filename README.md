# NexusFlow - Project Collaboration Platform

A modern, full-stack project management and team collaboration platform built with Next.js, featuring real-time Telegram notifications, AI-powered task suggestions, and secure authentication.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

## 🚀 Features

- **📊 Project Management**: Create and manage projects with detailed tracking
- **✅ Task Management**: Assign tasks, set priorities, and track progress
- **👥 Team Collaboration**: User profiles with role-based access control
- **💬 Communication Hub**: Integrated Telegram bot for real-time notifications
- **🤖 AI Integration**: AI-powered task assignment suggestions
- **📱 Telegram Notifications**: Get instant updates on task assignments
- **🔐 Secure Authentication**: JWT-based authentication system
- **📈 Milestone Tracking**: Set and monitor project milestones
- **📝 Todo Lists**: Personal todo list management
- **🌐 Responsive Design**: Works seamlessly on desktop and mobile

## 🛠️ Tech Stack

### Frontend

- **Next.js 15.5.4** - React framework with App Router
- **React 19.2.3** - UI library
- **TailwindCSS 4** - Utility-first CSS framework
- **TypeScript 5** - Type safety

### Backend

- **PostgreSQL** - Relational database
- **Neon** - Serverless PostgreSQL (production)
- **Node.js 20** - Runtime environment

### Integrations

- **Telegraf** - Telegram bot framework
- **JWT** - Authentication
- **Zod** - Schema validation
- **bcryptjs** - Password hashing

## 📋 Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- PostgreSQL database (local) or Neon account (production)
- Telegram account (for bot integration)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/simple-financial.git
cd simple-financial
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/nexusflow
PGSSL=false

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TG_WEBHOOK_SECRET=random-secret-string
APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
PORT=3000
```

### 4. Initialize Database

Run the database schema:

```bash
# If using PostgreSQL locally
psql -U postgres -d nexusflow < database.sql

# Or import via your database client
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 🔧 Environment Variables Explained

| Variable             | Description                              | Required | Default       |
| -------------------- | ---------------------------------------- | -------- | ------------- |
| `DATABASE_URL`       | PostgreSQL connection string             | Yes      | -             |
| `PGSSL`              | Enable SSL for database connection       | No       | `false`       |
| `JWT_SECRET`         | Secret key for JWT tokens (min 32 chars) | Yes      | -             |
| `JWT_EXPIRES_IN`     | JWT token expiration time                | No       | `7d`          |
| `TELEGRAM_BOT_TOKEN` | Telegram bot API token from @BotFather   | No       | -             |
| `TG_WEBHOOK_SECRET`  | Webhook secret for Telegram              | No       | -             |
| `APP_URL`            | Your application URL (for webhooks)      | No       | -             |
| `NODE_ENV`           | Environment mode                         | No       | `development` |

## 📦 Project Structure

```
simple-financial/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/             # API routes
│   │   │   ├── auth/        # Authentication endpoints
│   │   │   ├── projects/    # Project management
│   │   │   ├── tasks/       # Task management
│   │   │   ├── users/       # User management
│   │   │   └── telegram/    # Telegram bot webhook
│   │   └── page.tsx         # Home page
│   └── lib/                 # Utility functions
│       ├── db.ts            # Database connection
│       ├── auth.ts          # Authentication logic
│       ├── telegram.ts      # Telegram bot
│       ├── projects.ts      # Project operations
│       ├── tasks.ts         # Task operations
│       └── users.ts         # User operations
├── public/                  # Static assets
├── database.sql            # Database schema
├── next.config.ts          # Next.js configuration
├── tailwind.config.js      # TailwindCSS configuration
└── package.json            # Dependencies
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Create accounts**:

   - [Vercel](https://vercel.com) for hosting
   - [Neon](https://neon.tech) for PostgreSQL database

2. **Setup Database**:

   - Create a new project on Neon
   - Copy the connection string
   - Run `database.sql` in Neon SQL Editor

3. **Deploy to Vercel**:

   - Push code to GitHub
   - Import repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy!

4. **Configure Environment Variables in Vercel**:
   ```
   DATABASE_URL=postgresql://...@neon.tech/...?sslmode=require
   PGSSL=true
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   TG_WEBHOOK_SECRET=random-string
   TELEGRAM_BOT_TOKEN=your-bot-token
   APP_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```

See detailed deployment guides in:

- [Vercel Deployment Guide](./docs/vercel-deployment.md)
- [Quick Deploy Reference](./docs/quick-deploy.md)

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Application will be available at http://localhost:8082
```

## 🤖 Telegram Bot Setup

1. **Create Bot**:

   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Send `/newbot` and follow instructions
   - Copy the bot token

2. **Configure**:

   - Add `TELEGRAM_BOT_TOKEN` to your environment
   - Add `APP_URL` for webhook setup

3. **Link Account**:

   - Search for your bot in Telegram
   - Send `/start`
   - Share phone number to link your account

4. **Receive Notifications**:
   - Get instant task assignments via Telegram
   - Quick access to AI assistant for tasks

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build production version
npm run build

# Start production server
npm start
```

## 📝 Scripts

| Command         | Description                             |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start development server with Turbopack |
| `npm run build` | Build for production                    |
| `npm start`     | Start production server                 |
| `npm run lint`  | Run ESLint                              |

## 🔐 Security

- **Passwords**: Hashed using bcrypt
- **Authentication**: JWT tokens with configurable expiration
- **SQL Injection**: Protected via parameterized queries
- **Environment Variables**: Sensitive data stored in environment variables
- **HTTPS**: Enforced in production (Vercel)
- **CORS**: Configured appropriately

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for seamless deployment
- Neon for serverless PostgreSQL
- Telegram for bot API

## 📞 Support

For support, email support@yourapp.com or join our Telegram group.

## 🗺️ Roadmap

- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Integration with Slack, Discord
- [ ] Advanced AI features
- [ ] Team workspaces
- [ ] File attachments
- [ ] Video conferencing integration

## 📸 Screenshots

![Dashboard](./docs/screenshots/dashboard.png)
![Projects](./docs/screenshots/projects.png)
![Tasks](./docs/screenshots/tasks.png)

---

**Built with ❤️ using Next.js and PostgreSQL**

⭐ Star this repo if you find it helpful!
