import { path, testingAsserts as ta } from "./deps-test.ts";
import { inspect as insp } from "./deps.ts";
import * as mod from "./mod.ts";

function testFilePath(relTestFileName: string): string {
  return path.join(
    path.relative(
      Deno.cwd(),
      path.dirname(import.meta.url).substr("file://".length),
    ),
    relTestFileName,
  );
}

interface TestCase {
  readonly htmlContentFileName: string;
  readonly inspectionPipe: mod.HtmlContentInspectionPipe;
  readonly tests: {
    purpose: string;
    testFn: (
      content:
        | mod.HtmlSourceSupplier
        | insp.InspectionResult<mod.HtmlSourceSupplier>,
    ) => Promise<void>;
  }[];
}

const inspectHtmlWithSchema = insp.inspectionPipe<
  mod.HtmlSourceSupplier,
  string,
  Error
>(
  mod.inspectQueryableHtmlContent,
  mod.inspectCuratableContent,
  mod.schemaInspector(),
);

const testCases: TestCase[] = [
  {
    htmlContentFileName: testFilePath("inspect-schema-spec-0.html.golden"),
    inspectionPipe: inspectHtmlWithSchema,
    tests: [{
      purpose: "check schema",
      testFn: async (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): Promise<void> => {
        ta.assert(
          !insp.isInspectionIssue(content),
          "No issue on Schema Check",
        );
      },
    }],
  },
  {
    htmlContentFileName: testFilePath("inspect-seo-spec-1.html.golden"),
    inspectionPipe: inspectHtmlWithSchema,
    tests: [{
      purpose: "missing schema check",
      testFn: async (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): Promise<void> => {
        ta.assert(insp.isDiagnosable(content));
        ta.assertEquals([
          "Missing schema identified",
        ], content.uniqueDiagnostics());
      },
    }],
  },
];

for (const tc of testCases) {
  for (const test of tc.tests) {
    Deno.test(`${test.purpose}: "${tc.htmlContentFileName}"`, async () => {
      const htmlSource = Deno.readTextFileSync(tc.htmlContentFileName);
      const context: mod.HtmlSourceSupplier = {
        uri: tc.htmlContentFileName,
        htmlSource: htmlSource,
      };
      const content = await tc.inspectionPipe(context);
      ta.assert(
        content,
        `Unable to create content for ${test.purpose}: "${tc.htmlContentFileName}"`,
      );
      ta.assert(
        mod.isHtmlContent(content),
        "Should be HTML content: " + content,
      );
      await test.testFn(content);
    });
  }
}
