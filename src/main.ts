import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { WinstonLogger } from './services/logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true
    });
    app.useLogger(app.get(WinstonLogger));

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 8501;

    await app.listen(port, () => {
        Logger.log(`Server is listening on port ${port}`);
    });
}

bootstrap();
