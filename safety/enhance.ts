export interface EnhancerSync<C, T> {
  enhance(ctx: C, instance?: T): T;
}

export function enhancerSync<C, T>(
  ...enhancers: EnhancerSync<C, T>[]
): EnhancerSync<C, T> {
  return new class implements EnhancerSync<C, T> {
    enhance(ctx: C, instance: T): T {
      let result = instance;
      for (const enhancer of enhancers) {
        result = enhancer.enhance(ctx, result);
      }
      return result;
    }
  }();
}

export interface Enhancer<C, T> {
  enhance(ctx: C, instance?: T): Promise<T>;
}

export function enhancer<C, T>(
  ...enhancers: Enhancer<C, T>[]
): Enhancer<C, T> {
  return new class implements Enhancer<C, T> {
    async enhance(ctx: C, instance: T): Promise<T> {
      let result = instance;
      for (const enhancer of enhancers) {
        result = await enhancer.enhance(ctx, result);
      }
      return result;
    }
  }();
}
