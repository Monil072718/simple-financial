This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Using Docker (Recommended)

#### Prerequisites
- Docker and Docker Compose installed on your system

#### Development with Docker

1. Create a `.env` file in the root directory (you can use the example below):
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/simple_financial
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=simple_financial
POSTGRES_PORT=5432
PGSSL=false
APP_PORT=3000
NODE_ENV=development
```

2. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

#### Production with Docker

1. Create a `.env` file with production values
2. Build and start the containers:
```bash
docker-compose up --build -d
```

3. The application will be available at [http://localhost:3000](http://localhost:3000)

#### Docker Commands

- Stop containers: `docker-compose down`
- View logs: `docker-compose logs -f`
- Rebuild containers: `docker-compose up --build`
- Access database: `docker exec -it simple-financial-db psql -U postgres -d simple_financial`

### Local Development (Without Docker)

First, make sure you have PostgreSQL running locally, then:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
