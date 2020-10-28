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

const inspectHtmlWithSEO = insp.inspectionPipe<
  mod.HtmlSourceSupplier,
  string,
  Error
>(
  mod.inspectQueryableHtmlContent,
  mod.inspectCuratableContent,
  mod.inspectCurationTitle,
  mod.inspectTitleSEO,
  mod.inspectTwitterCardSEO,
  mod.inspectOpenGraphSEO,
);

const testCases: TestCase[] = [
  {
    htmlContentFileName: testFilePath("inspect-seo-spec-0.html.golden"),
    inspectionPipe: inspectHtmlWithSEO,
    tests: [{
      purpose: "no SEO issues",
      testFn: async (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): Promise<void> => {
        ta.assert(
          !insp.isInspectionIssue(content),
          "No content or SEO issues should be found",
        );
      },
    }],
  },
  {
    htmlContentFileName: testFilePath("inspect-seo-spec-1.html.golden"),
    inspectionPipe: inspectHtmlWithSEO,
    tests: [{
      purpose: "missing title and social graphs",
      testFn: async (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): Promise<void> => {
        ta.assert(insp.isDiagnosable(content));
        ta.assertEquals([
          "Title tag inside head tag should be provided in SEO-friendly sites",
          "Twitter Card should be provided in SEO-friendly sites",
          "OpenGraph should be provided in SEO-friendly sites",
        ], content.uniqueDiagnostics());
      },
    }],
  },
  {
    htmlContentFileName: testFilePath("inspect-seo-spec-2.html.golden"),
    inspectionPipe: inspectHtmlWithSEO,
    tests: [{
      purpose: "missing Twitter card (title and OpenGraph are good)",
      testFn: async (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): Promise<void> => {
        ta.assert(insp.isDiagnosable(content));
        ta.assertEquals([
          "Twitter Card should be provided in SEO-friendly sites",
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
