import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    clientId?: string;
    user?: any;
    apiClient?: any;
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    req.requestId = randomUUID();
    const rawClientId = req.headers['x-client-id'];
    req.clientId = Array.isArray(rawClientId) ? rawClientId[0] : rawClientId;
    next();
  }
}