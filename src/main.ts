import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './module';
import { WinstonLogger } from './services/logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true
    });
    app.useLogger(app.get(WinstonLogger));
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const config = new DocumentBuilder()
        .setTitle('Validator monitoring')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 8501;
    await app.listen(port, () => {
        Logger.log(`Server is listening on port ${port}`);
    });
}

bootstrap();
