import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createTables } from './database';
import authRoutes from './routes/auth';
import monitorRoutes from './routes/monitors';
import profileRoutes from './routes/profile';
import diagnoseRoutes from './routes/diagnose';
import { startAllMonitors } from './services/pinger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'PulseBoard API is running' });
});

app.use('/auth', authRoutes);
app.use('/monitors', monitorRoutes);
app.use('/auth', profileRoutes);
app.use('/monitors', diagnoseRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, async () => {
  await createTables();
  await startAllMonitors();
  console.log(`Server running on port ${PORT}`);
});

export { io };