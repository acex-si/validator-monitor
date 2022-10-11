import express from 'express';
import cors from 'cors';
import metrics from './routes/metrics-routes';


export function createServer() {
    const app = express();

    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req, res) => {
        res.send({ healthy: true });
    });
    app.use('/metrics', metrics);
    return app;
}
