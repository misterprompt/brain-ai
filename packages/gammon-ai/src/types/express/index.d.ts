import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: {
      id: string;
      role: string;
      email?: string;
      [key: string]: any;
    };
  }
}
