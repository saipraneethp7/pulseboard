# PulseBoard — Real-Time API Health Monitor

Know when your APIs go down before your users do.

**Live Demo:** https://pulseboard-app.netlify.app

## What is PulseBoard?

PulseBoard is a real-time API monitoring dashboard that pings your endpoints every 30 seconds and shows live response time graphs, uptime percentages and incident history. When something goes wrong, the AI diagnosis feature analyzes recent ping data and suggests exactly what to fix.

## Features

- Real-time response time graphs updating live via WebSockets
- Status history bar showing last 20 pings as green/red blocks
- AI-powered diagnosis using Groq API and LLaMA 3.3 70B
- Monitor detail page with min, max and avg response time stats
- Incident log showing every downtime event with error messages
- JWT authentication with bcrypt password hashing
- Settings page to update profile and password
- Clean light mode UI inspired by Linear

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Recharts, Socket.io Client |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL on Neon |
| Real-time | Socket.io WebSockets |
| AI | Groq API with LLaMA 3.3 70B |
| Auth | JWT tokens, bcrypt |
| Deployment | Railway (backend), Netlify (frontend) |

## Getting Started

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Environment Variables

Create a `.env` file in the `backend` folder:

```env
PORT=5001
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
```

## How It Works

When you add a monitor, the backend immediately pings the URL and starts a 30 second interval timer. Each ping result is saved to PostgreSQL and emitted via Socket.io to all connected browsers. The frontend listens for these events and updates the graph and status in real time without any page refresh.

When you click AI Diagnose, the backend sends the last 20 ping results to the Groq API which analyzes response times, error messages and status codes to identify whether the issue is a temporary outage, configuration problem or performance degradation.

## License

MIT
