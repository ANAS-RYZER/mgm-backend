import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";

/**
 * Normalizes request.body.stoneSpecs before the global ValidationPipe runs.
 * - Flattens each item: use item.stoneSpecs when present, else item.
 * - Converts string color to { type: "DIAMOND", value }.
 */
@Injectable()
export class NormalizeStoneSpecsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    if (body && Array.isArray(body.stoneSpecs)) {
      body.stoneSpecs = body.stoneSpecs.map((item: any) => {
        const flat = item?.stoneSpecs ?? item;
        if (flat && typeof flat.color === "string") {
          return {
            ...flat,
            color: { type: "DIAMOND" as const, value: flat.color },
          };
        }
        return flat;
      });
    }
    return next.handle();
  }
}
