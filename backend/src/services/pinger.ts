import axios from 'axios';
import pool from '../database';
import { io } from '../index';

interface Monitor {
  id: number;
  user_id: number;
  name: string;
  url: string;
  interval_seconds: number;
  is_active: boolean;
}

const activeTimers = new Map<number, NodeJS.Timeout>();

export const pingMonitor = async (monitor: Monitor) => {
  const start = Date.now();
  let status = 'down';
  let statusCode = null;
  let responseTime = null;
  let errorMessage = null;

  try {
    const response = await axios.get(monitor.url, { timeout: 10000 });
    responseTime = Date.now() - start;
    statusCode = response.status;
    status = response.status < 400 ? 'up' : 'down';
  } catch (err: any) {
    responseTime = Date.now() - start;
    errorMessage = err.message;
    statusCode = err.response?.status || null;
    status = 'down';
  }

  await pool.query(
    'INSERT INTO pings (monitor_id, status, response_time, status_code, error_message) VALUES ($1, $2, $3, $4, $5)',
    [monitor.id, status, responseTime, statusCode, errorMessage]
  );

  io.emit(`monitor:${monitor.id}`, {
    monitor_id: monitor.id,
    status,
    response_time: responseTime,
    status_code: statusCode,
    pinged_at: new Date()
  });

  console.log(`Pinged ${monitor.name}: ${status} (${responseTime}ms)`);
};

export const startMonitor = async (monitor: Monitor) => {
  if (activeTimers.has(monitor.id)) {
    clearInterval(activeTimers.get(monitor.id));
  }

  await pingMonitor(monitor);

  const timer = setInterval(() => pingMonitor(monitor), monitor.interval_seconds * 1000);
  activeTimers.set(monitor.id, timer);
};

export const stopMonitor = (monitorId: number) => {
  if (activeTimers.has(monitorId)) {
    clearInterval(activeTimers.get(monitorId));
    activeTimers.delete(monitorId);
  }
};

export const startAllMonitors = async () => {
  const result = await pool.query('SELECT * FROM monitors WHERE is_active = true');
  const monitors = result.rows as Monitor[];
  console.log(`Starting ${monitors.length} monitors`);
  for (const monitor of monitors) {
    await startMonitor(monitor);
  }
};