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
    testFn:
      | ((
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ) => Promise<void>)
      | ((
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ) => void);
  }[];
}

const inspectHtmlWithAnalytics = insp.inspectionPipe<
  mod.HtmlSourceSupplier,
  string,
  Error
>(
  mod.inspectQueryableHtmlContent,
  mod.inspectCuratableContent,
  mod.googleTagManagerInspector({ gtmIdentity: "GTM-XXXX" }),
);

const testCases: TestCase[] = [
  {
    htmlContentFileName: testFilePath("inspect-analytics-spec-0.html.golden"),
    inspectionPipe: inspectHtmlWithAnalytics,
    tests: [{
      purpose: "no analytics issues",
      testFn: (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): void => {
        ta.assert(
          !insp.isInspectionIssue(content),
          "No content or SEO issues should be found",
        );
      },
    }],
  },
  {
    htmlContentFileName: testFilePath("inspect-seo-spec-1.html.golden"),
    inspectionPipe: inspectHtmlWithAnalytics,
    tests: [{
      purpose: "missing Google Tag Manager code",
      testFn: (
        content:
          | mod.HtmlSourceSupplier
          | insp.InspectionResult<mod.HtmlSourceSupplier>,
      ): void => {
        ta.assert(insp.isDiagnosable(content));
        ta.assertEquals([
          "Google Tag Manager code not found: `)(window,document,'script','dataLayer','GTM-XXXX');</script>`",
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
      const isAsync = test.testFn.constructor.name === "AsyncFunction";
      if (isAsync) {
        await test.testFn(content);
      } else {
        test.testFn(content);
      }
    });
  }
}
