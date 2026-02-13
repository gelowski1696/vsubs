import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  log(message: any, context?: string) {
    console.log(JSON.stringify({ level: 'info', message, context, ts: new Date().toISOString() }));
  }
  error(message: any, trace?: string, context?: string) {
    console.error(JSON.stringify({ level: 'error', message, trace, context, ts: new Date().toISOString() }));
  }
  warn(message: any, context?: string) {
    console.warn(JSON.stringify({ level: 'warn', message, context, ts: new Date().toISOString() }));
  }
  debug(message: any, context?: string) {
    console.debug(JSON.stringify({ level: 'debug', message, context, ts: new Date().toISOString() }));
  }
  verbose(message: any, context?: string) {
    console.info(JSON.stringify({ level: 'verbose', message, context, ts: new Date().toISOString() }));
  }
}