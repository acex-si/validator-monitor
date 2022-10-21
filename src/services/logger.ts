import * as path from 'path';
import { createLogger, format, Logger, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WinstonLogger implements LoggerService {

    logger: Logger;

    constructor(private readonly configService: ConfigService) {
        this.init();
    }

    init() {
        const environment = this.configService.get<string>('NODE_ENV');
        const logPath = this.configService.get<string>('LOG_PATH');

        const fileFormat = format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
        });
        const consoleFormat = format.printf(({ level, message }) => {
            return `[${level}]: ${message}`;
        });

        const dailyRotateOptions = {
            level: 'info',
            filename: path.join(logPath, 'uptime-monitor-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m',
            format: format.combine(
                format.timestamp(),
                format.json(),
                fileFormat
            ),
        };
        const consoleOptions = {
            level: 'debug',
            handleExceptions: true,
            format: format.combine(
                format.colorize(),
                format.json(),
                consoleFormat
            )
        };

        const loggerTransports = [];

        if (environment === 'production' && logPath) {
            loggerTransports.push(new DailyRotateFile(dailyRotateOptions));
        }
        if (environment === 'develop') {
            loggerTransports.push(new transports.Console(consoleOptions));
        }

        this.logger = createLogger({
            transports: loggerTransports,
            exitOnError: false
        });
    }

    log(message: any, ...optionalParams: any[]) {
        this.logger.info(message);
    }

    error(message: any, ...optionalParams: any[]) {
        this.logger.error(message);
    }

    warn(message: any, ...optionalParams: any[]) {
        this.logger.warn(message);
    }

    debug?(message: any, ...optionalParams: any[]) {
        this.logger.debug(message);
    }

    verbose?(message: any, ...optionalParams: any[]) {
        this.logger.verbose(message);
    }
}
