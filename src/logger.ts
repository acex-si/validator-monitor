import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const fileFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const consoleFormat = winston.format.printf(({ level, message }) => {
    return `[${level}]: ${message}`;
});


const dailyRotateOptions = {
    level: 'info',
    filename: `${process.env.LOG_PATH}uptime-monitor-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    format: winston.format.combine(
        winston.format.timestamp(),
        fileFormat
    ),
  };

const consoleOptions = {
    level: 'debug',
    handleExceptions: true,
    format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
    )
};

const loggerTransports = [];

if (process.env.NODE_ENV === 'production' && process.env.LOG_PATH) {
    loggerTransports.push(new DailyRotateFile(dailyRotateOptions));
}
if (process.env.NODE_ENV === 'develop') {
    loggerTransports.push(new winston.transports.Console(consoleOptions));
}

const logger = winston.createLogger({
    transports: loggerTransports,
    exitOnError: false
});

export default logger;
