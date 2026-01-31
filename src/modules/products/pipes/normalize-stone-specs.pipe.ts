import { PipeTransform, Injectable } from "@nestjs/common";

/**
 * Flattens stoneSpecs so each item is the inner object when the client sends
 * { stoneSpecs: [ { stoneSpecs: { stoneName, quantity, ... }, stoneName, ... } ] }.
 * Runs before validation so the DTO only sees flat stone details.
 */
@Injectable()
export class NormalizeStoneSpecsPipe implements PipeTransform {
  transform(value: any): any {
    if (!value || typeof value !== "object") return value;
    const stoneSpecs = value.stoneSpecs;
    if (!Array.isArray(stoneSpecs)) return value;

    value.stoneSpecs = stoneSpecs.map((item: any) => {
      const flat = item?.stoneSpecs ?? item;
      if (flat && typeof flat.color === "string") {
        return { ...flat, color: { type: "DIAMOND" as const, value: flat.color } };
      }
      return flat;
    });
    return value;
  }
}
