import { Router, Response } from 'express';
import Groq from 'groq-sdk';
import pool from '../database';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.use(authMiddleware);

router.get('/:id/diagnose', async (req: AuthRequest, res: Response) => {
  try {
    const monitorResult = await pool.query(
      'SELECT * FROM monitors WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (monitorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const monitor = monitorResult.rows[0];

    const pingsResult = await pool.query(
      'SELECT * FROM pings WHERE monitor_id = $1 ORDER BY pinged_at DESC LIMIT 20',
      [req.params.id]
    );

    const pings = pingsResult.rows;
    const recentIncidents = pings.filter((p: any) => p.status === 'down');
    const avgResponseTime = pings.length > 0
      ? Math.round(pings.filter((p: any) => p.response_time).reduce((acc: number, p: any) => acc + p.response_time, 0) / pings.length)
      : 0;

    const prompt = `You are an API reliability expert. Analyze this API monitor data and provide a diagnosis.

Monitor Name: ${monitor.name}
URL: ${monitor.url}
Current Status: ${pings[0]?.status || 'unknown'}
Average Response Time: ${avgResponseTime}ms
Recent Incidents (last 20 pings): ${recentIncidents.length} failures

Recent ping details:
${pings.slice(0, 5).map((p: any) => `- Status: ${p.status}, Response Time: ${p.response_time}ms, Status Code: ${p.status_code || 'N/A'}, Error: ${p.error_message || 'none'}, Time: ${new Date(p.pinged_at).toLocaleString()}`).join('\n')}

Based on this data provide:
1. A brief diagnosis of what might be causing any issues (2-3 sentences)
2. 3 specific actionable steps to fix or improve reliability
3. Whether this looks like a temporary outage, a configuration issue, or a performance issue

Keep the response concise and technical. Format it as JSON with keys: diagnosis, steps (array of strings), issue_type (one of: temporary_outage, configuration_issue, performance_issue, all_good).`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze monitor' });
  }
});

export default router;