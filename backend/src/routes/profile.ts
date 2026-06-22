import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.put('/profile', async (req: AuthRequest, res: Response) => {
  const { full_name, email } = req.body;
  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND id != $2',
      [email, req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const result = await pool.query(
      'UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, full_name, email',
      [full_name, email, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/password', async (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;