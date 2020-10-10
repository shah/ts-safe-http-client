export interface TypeGuard<T> {
  (o: unknown): o is T;
}

export interface TypeGuardCustom<X, T extends X> {
  (o: X): o is T;
}

export function typeGuard<T, K extends keyof T = keyof T>(
  ...requireKeysInSingleT: K[] // = [...keyof T] TODO: default this to all required keys
): TypeGuard<T> {
  return (o: unknown): o is T => {
    // Make sure that the object passed is a real object and has all required props
    return o && typeof o === "object" &&
      !requireKeysInSingleT.find((p) => !(p in o));
  };
}

export function typeGuardCustom<X, T extends X, K extends keyof T = keyof T>(
  ...requireKeysInSingleT: K[] // = [...keyof T] TODO: default this to all required keys
): TypeGuardCustom<X, T> {
  return (o: X): o is T => {
    // Make sure that the object passed is a real object and has all required props
    return o && typeof o === "object" &&
      !requireKeysInSingleT.find((p) => !(p in o));
  };
}

export function typeGuardArrayOf<
  T,
  ArrayT extends T[],
  K extends keyof T = keyof T,
>(
  ...requireKeysInSingleT: K[] // = [...keyof T] TODO: default this to all required keys
): TypeGuard<ArrayT> {
  const guard = typeGuard<T>(...requireKeysInSingleT);
  return (o: unknown): o is ArrayT => {
    return o && Array.isArray(o) && !o.find((i) => !guard(i));
  };
}

export function typeGuards<
  SingleT,
  MultipleT extends SingleT[],
  K extends keyof SingleT = keyof SingleT,
>(
  ...requireKeysInSingleT: K[]
): [TypeGuard<SingleT>, TypeGuard<MultipleT>] {
  return [
    typeGuard<SingleT>(...requireKeysInSingleT),
    typeGuardArrayOf<SingleT, MultipleT>(...requireKeysInSingleT),
  ];
}
