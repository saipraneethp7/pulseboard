import { Router, Response } from 'express';
import pool from '../database';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { startMonitor, stopMonitor } from '../services/pinger';

const router = Router();

router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, url, interval_seconds } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO monitors (user_id, name, url, interval_seconds) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, name, url, interval_seconds || 30]
    );
    const monitor = result.rows[0];
    await startMonitor(monitor);
    res.status(201).json(monitor);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT m.*, 
        (SELECT status FROM pings WHERE monitor_id = m.id ORDER BY pinged_at DESC LIMIT 1) as last_status,
        (SELECT response_time FROM pings WHERE monitor_id = m.id ORDER BY pinged_at DESC LIMIT 1) as last_response_time,
        (SELECT COUNT(*) FROM pings WHERE monitor_id = m.id AND status = 'up' AND pinged_at > NOW() - INTERVAL '24 hours') as up_count,
        (SELECT COUNT(*) FROM pings WHERE monitor_id = m.id AND pinged_at > NOW() - INTERVAL '24 hours') as total_count
      FROM monitors m WHERE m.user_id = $1 ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    stopMonitor(Number(req.params.id));
    await pool.query('DELETE FROM monitors WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ message: 'Monitor deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/pings', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pings WHERE monitor_id = $1 ORDER BY pinged_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;