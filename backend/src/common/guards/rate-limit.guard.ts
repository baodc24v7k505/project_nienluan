import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, { count: number; until: number }>();
  canActivate(context: ExecutionContext) {
    if (process.env.NODE_ENV === 'test') return true;
    const req = context.switchToHttp().getRequest<Request>();
    const path = String(req.path);
    const limit = /\/auth\/(login|register|password)/.test(path)
      ? 15
      : path === '/api/media' && req.method === 'POST'
        ? 30
        : path.endsWith('/messages') && req.method === 'POST'
          ? 60
          : 0;
    if (!limit) return true;
    const now = Date.now();
    for (const [key, bucket] of this.buckets)
      if (bucket.until <= now) this.buckets.delete(key);
    const key = `${req.ip}:${path}`;
    const bucket = this.buckets.get(key) ?? { count: 0, until: now + 60000 };
    bucket.count++;
    this.buckets.set(key, bucket);
    if (bucket.count > limit || this.buckets.size > 20000)
      throw new HttpException(
        'Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút',
        429,
      );
    return true;
  }
}
