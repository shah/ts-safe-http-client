import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./mod.ts";

export interface TestType {
  readonly testPropName: string;
}

export type TestTypeArray = TestType[];

const [isTestType, isTestTypeArray] = mod.typeGuards<
  TestType,
  TestTypeArray
>("testPropName");

Deno.test(`type guard`, async () => {
  ta.assert(isTestType({ testPropName: "test prop value" }));
  ta.assert(!isTestType({ invalidPropName: "test prop value" }));
});

Deno.test(`type array guard`, async () => {
  ta.assert(
    isTestTypeArray(
      [
        { testPropName: "test prop value 1" },
        { testPropName: "test prop value 2" },
        { testPropName: "test prop value 3" },
      ],
    ),
  );
  ta.assert(
    !isTestTypeArray(
      [
        { testPropName: "test prop value 1" },
        { testPropName: "test prop value 2" },
        { wrongPropName: "test prop value 3" },
      ],
    ),
  );
});
