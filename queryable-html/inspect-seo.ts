import { inspect as insp } from "./deps.ts";
import * as qh from "./queryable-html.ts";

// inspectors are required to be async
// deno-lint-ignore require-await
export async function inspectTitleSEO(
  html: qh.HtmlSourceSupplier | insp.InspectionResult<qh.HtmlSourceSupplier>,
  ctx?: insp.InspectionContext,
): Promise<
  | qh.HtmlSourceSupplier
  | insp.InspectionResult<qh.HtmlSourceSupplier>
  | insp.InspectionIssue<qh.HtmlSourceSupplier>
> {
  if (qh.isQueryableHtmlContent(html)) {
    const title = html.document("head > title").text();
    if (!title || title.length == 0) {
      return insp.inspectionIssue(
        html,
        "Title tag inside head tag should be provided in SEO-friendly sites",
      );
    }
    return html;
  }

  return insp.inspectionIssue(
    html,
    "SEO-friendly sites should have queryable HTML content",
  );
}

// deno-lint-ignore require-await
export async function inspectTwitterCardSEO(
  html: qh.HtmlSourceSupplier | insp.InspectionResult<qh.HtmlSourceSupplier>,
  ctx?: insp.InspectionContext,
): Promise<
  | qh.HtmlSourceSupplier
  | insp.InspectionResult<qh.HtmlSourceSupplier>
  | insp.InspectionIssue<qh.HtmlSourceSupplier>
> {
  if (qh.isCuratableContent(html)) {
    const sg = html.socialGraph;
    if (!sg.twitter) {
      return insp.inspectionIssue(
        html,
        "Twitter Card should be provided in SEO-friendly sites",
      );
    }

    const diags: string[] = [];
    if (!sg.twitter.title) diags.push("Twitter Card should have title");
    if (!sg.twitter.description) {
      diags.push("Twitter Card should have description");
    }
    if (!sg.twitter.imageURL) diags.push("Twitter Card should have imageURL");

    return diags.length > 0 ? insp.inspectionIssue(html, diags) : html;
  } else {
    return insp.inspectionIssue(
      html,
      "Social Graphs should be provided in SEO-friendly sites",
    );
  }
}

// deno-lint-ignore require-await
export async function inspectOpenGraphSEO(
  html: qh.HtmlSourceSupplier | insp.InspectionResult<qh.HtmlSourceSupplier>,
  ctx?: insp.InspectionContext,
): Promise<
  | qh.HtmlSourceSupplier
  | insp.InspectionResult<qh.HtmlSourceSupplier>
  | insp.InspectionIssue<qh.HtmlSourceSupplier>
> {
  if (qh.isCuratableContent(html)) {
    const sg = html.socialGraph;
    if (!sg.openGraph) {
      return insp.inspectionIssue(
        html,
        "OpenGraph should be provided in SEO-friendly sites",
      );
    }

    const diags: string[] = [];
    if (!sg.openGraph.title) diags.push("OpenGraph should have title");
    if (!sg.openGraph.description) {
      diags.push("OpenGraph should have description");
    }
    if (!sg.openGraph.imageURL) diags.push("OpenGraph should have imageURL");

    return diags.length > 0 ? insp.inspectionIssue(html, diags) : html;
  } else {
    return insp.inspectionIssue(
      html,
      "Social Graphs should be provided in SEO-friendly sites",
    );
  }
}
