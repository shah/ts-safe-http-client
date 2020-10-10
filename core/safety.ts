export interface TypeGuard<T> {
  (o: unknown): o is T;
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

export function typeGuards<
  SingleT,
  MultipleT,
  K extends keyof SingleT = keyof SingleT,
>(
  ...requireKeysInSingleT: K[] // TODO: default this to all required keys, not sure how?
): [TypeGuard<SingleT>, TypeGuard<MultipleT>] {
  return [
    typeGuard(...requireKeysInSingleT),
    (o: unknown): o is MultipleT => {
      // Make sure that the object passed is in is an array and that each
      // element of the array is an object with required props
      return o && Array.isArray(o) &&
        o.filter((i) =>
            !(i && typeof i === "object" &&
              !requireKeysInSingleT.find((p) => !(p in o)))
          ).length == 0;
    },
  ];
}
