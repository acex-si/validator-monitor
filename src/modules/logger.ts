import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonLogger } from '../services/logger';

@Module({
    imports: [ConfigModule.forRoot()],
    providers: [WinstonLogger],
    exports: [WinstonLogger],
})
export class LoggerModule {
}
