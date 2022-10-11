import * as dotenv from 'dotenv'
dotenv.config();

import { createServer } from "./express";
import logger from "./logger";



const port = process.env.PORT || 8501;

async function startServer() {
    const app = createServer();

    app.listen(port, () => {
        logger.info(`Server is listening on port ${port}`)
    });
}

startServer();

