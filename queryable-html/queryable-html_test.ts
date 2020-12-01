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
  readonly provenanceURL: string;
  readonly htmlContentFileName: string;
  readonly inspectionPipe: mod.HtmlContentInspectionPipe;
  readonly tests: {
    purpose: string;
    testFn:
      | ((content: mod.HtmlContent) => void)
      | ((content: mod.HtmlContent) => Promise<void>);
  }[];
}

const enrichHtmlContent = insp.inspectionPipe<
  mod.HtmlSourceSupplier,
  string,
  Error
>(
  mod.inspectQueryableHtmlContent,
  mod.inspectCuratableContent,
  mod.inspectCurationTitle,
);

const testCases: TestCase[] = [
  {
    provenanceURL:
      "https://www.foxnews.com/lifestyle/photo-of-donald-trump-look-alike-in-spain-goes-viral",
    htmlContentFileName: testFilePath("queryable-html-spec-1.html.golden"),
    inspectionPipe: enrichHtmlContent,
    tests: [{
      purpose: "HTML JSON+LD",
      testFn: (content: mod.HtmlContent) => {
        ta.assert(mod.isQueryableHtmlContent(content));
        if (mod.isQueryableHtmlContent(content)) {
          const schemas = content.untypedSchemas(true);
          ta.assert(schemas);
          ta.assertEquals(schemas.length, 2);
          if (schemas && schemas[0]) {
            ta.assertEquals(schemas[0]["@type"], "NewsArticle");
            // now, can be used as: const article = schemas[0] as NewsArticle;
            ta.assertEquals(schemas[1]["@type"], "WebPage");
            // now, can be used as: const org = schemas[1] as WebPage;
          }
        }
      },
    }, {
      purpose: "OpenGraph",
      testFn: (content: mod.HtmlContent) => {
        ta.assert(mod.isCuratableContent(content));
        if (mod.isCuratableContent(content)) {
          ta.assertEquals(
            content.title,
            "Photo of Donald Trump 'look-alike' in Spain goes viral",
          );
          ta.assert(content.socialGraph);
          if (content.socialGraph) {
            const sg = content.socialGraph;
            ta.assert(sg.openGraph);
            ta.assertEquals(sg.openGraph.type, "article");
            ta.assertEquals(sg.openGraph.title, content.title);
          }
        }
      },
    }],
  },
  {
    provenanceURL: "https://www.impactbnd.com/blog/best-seo-news-sites",
    htmlContentFileName: testFilePath("queryable-html-spec-2.html.golden"),
    inspectionPipe: enrichHtmlContent,
    tests: [{
      purpose: "Twitter title",
      testFn: (content: mod.HtmlContent) => {
        ta.assert(mod.isCuratableContent(content));
        if (mod.isCuratableContent(content)) {
          ta.assert(content.socialGraph);
          if (content.socialGraph) {
            const sg = content.socialGraph;
            ta.assert(sg.twitter);
            ta.assertEquals(sg.twitter.title, content.title);
          }
        }
      },
    }, {
      purpose: "simple HTML page meta data",
      testFn: (content: mod.HtmlContent) => {
        ta.assert(mod.isQueryableHtmlContent(content));
        if (mod.isQueryableHtmlContent(content)) {
          ta.assert(content.meta());
        }
      },
    }],
  },
  {
    provenanceURL:
      "https://medicaleventsguide.com/manhattan-primary-care-midtown-manhattan",
    htmlContentFileName: testFilePath("queryable-html-spec-3.html.golden"),
    inspectionPipe: enrichHtmlContent,
    tests: [{
      purpose: "broken HTML JSON+LD",
      testFn: (content: mod.HtmlContent) => {
        ta.assert(mod.isQueryableHtmlContent(content));
        if (mod.isQueryableHtmlContent(content)) {
          let errorIndex = -1;
          const schemas = content.untypedSchemas(
            true,
            undefined,
            (_ctx, index) => {
              errorIndex = index;
            },
          );
          ta.assert(schemas);
          ta.assertEquals(schemas.length, 7);
          ta.assertEquals(errorIndex, -1);
        }
      },
    }],
  },
];

for (const tc of testCases) {
  for (const test of tc.tests) {
    Deno.test(`${test.purpose}: "${tc.htmlContentFileName}"`, async () => {
      const htmlSource = Deno.readTextFileSync(tc.htmlContentFileName);
      const context: mod.HtmlSourceSupplier = {
        uri: tc.provenanceURL,
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
