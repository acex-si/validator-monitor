import express from 'express';
import { getContentType, getMetrics } from '../tools/metrics-tools';

const router = express.Router();

router.get('/uptime', async (req, res) => {
    res.set('Content-Type', getContentType());
    res.send(await getMetrics());
});

export default router;
