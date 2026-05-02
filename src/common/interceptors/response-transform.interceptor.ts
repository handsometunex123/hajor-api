import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

/**
 * Recursively walks a plain object / array and converts every Prisma Decimal
 * instance to a JS number so the JSON response never contains quoted decimals.
 */

function serializeDecimals(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as Prisma.Decimal).toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => serializeDecimals(v, seen));
  if (typeof value === 'object') {
    // Only recurse into plain objects
    if (Object.prototype.toString.call(value) === '[object Object]') {
      if (seen.has(value as object)) {
        return '[Circular]';
      }
      seen.add(value as object);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = serializeDecimals(v, seen);
      }
      seen.delete(value as object);
      return out;
    }
    // For non-plain objects, just return as-is (or toString if needed)
    return value;
  }
  return value;
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest() as any;
    const response = ctx.getResponse();
    return next.handle().pipe(
      map((data) => {
        // If controller already returned the standard shape, pass through
        if (data && data._standardResponse) return data;

        const statusCode = response?.statusCode || 200;
        const payload = {
          statusCode,
          timestamp: new Date().toISOString(),
          path: request?.url,
          requestId: request?.id || request?.headers?.['x-request-id'] || null,
          data: serializeDecimals(data === undefined ? null : data),
          code: statusCode === 200 ? 'OK' : `E${statusCode}`,
        };
        return payload;
      }),
    );
  }
}
