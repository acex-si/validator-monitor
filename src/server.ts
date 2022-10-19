import * as dotenv from 'dotenv'
import { exit } from 'process';
dotenv.config();

import { createServer } from "./express";
import logger from "./logger";



const port = process.env.PORT || 8501;

async function startServer() {
    const app = createServer();

    const server = app.listen(port, () => {
        logger.info(`Server is listening on port ${port}`)
    });

    const startGracefulShutdown = () => {
        logger.info('Starting shutdown of server');
        server.close(() => {
            logger.info('Server shut down');
            exit(1);
        });
    }
    process.on('SIGTERM', startGracefulShutdown);
    process.on('SIGINT', startGracefulShutdown);
}

startServer();
