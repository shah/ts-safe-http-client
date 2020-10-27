import { inspect as insp } from "./deps.ts";
import * as qh from "./queryable-html.ts";

export const seoInspectionPipe = insp.inspectionPipe<qh.HtmlContent>(
  inspectTitleSEO,
  inspectTwitterCardSEO,
  inspectOpenGraphSEO,
);

export async function inspectTitleSEO(
  target: qh.HtmlContent | insp.InspectionResult<qh.HtmlContent>,
  ctx?: insp.InspectionContext,
): Promise<
  | qh.HtmlContent
  | insp.InspectionResult<qh.HtmlContent>
  | insp.InspectionIssue<qh.HtmlContent>
> {
  const html = insp.inspectionTarget(target);
  if (qh.isQueryableHtmlContent(html)) {
    const title = html.document("head > title").text();
    if (!title || title.length == 0) {
      return insp.inspectionIssue(
        target,
        "Title should be provided in SEO-friendly sites",
      );
    }
    return target;
  }

  return insp.inspectionIssue(
    target,
    "SEO-friendly sites should have queryable HTML content",
  );
}

export async function inspectTwitterCardSEO(
  target: qh.HtmlContent | insp.InspectionResult<qh.HtmlContent>,
  ctx?: insp.InspectionContext,
): Promise<
  | qh.HtmlContent
  | insp.InspectionResult<qh.HtmlContent>
  | insp.InspectionResult<qh.HtmlContent> & qh.CuratableContent
> {
  const html = insp.inspectionTarget(target);
  if (qh.isCuratableContent(html)) {
    const sg = html.socialGraph;
    if (!sg.twitter) {
      return insp.inspectionIssue(
        target,
        "Twitter Card should be provided in SEO-friendly sites",
      );
    }

    const diags: string[] = [];
    if (!sg.twitter.title) diags.push("Twitter Card should have title");
    if (!sg.twitter.description) {
      diags.push("Twitter Card should have description");
    }
    if (!sg.twitter.imageURL) diags.push("Twitter Card should have imageURL");

    return diags.length > 0 ? insp.inspectionIssue(target, diags) : target;
  } else {
    return insp.inspectionIssue(
      target,
      "Social Graphs should be provided in SEO-friendly sites",
    );
  }
}

export async function inspectOpenGraphSEO(
  target: qh.HtmlContent | insp.InspectionResult<qh.HtmlContent>,
  ctx?: insp.InspectionContext,
): Promise<
  | qh.HtmlContent
  | insp.InspectionResult<qh.HtmlContent>
  | insp.InspectionResult<qh.HtmlContent> & qh.CuratableContent
> {
  const html = insp.inspectionTarget(target);
  if (qh.isCuratableContent(html)) {
    const sg = html.socialGraph;
    if (!sg.openGraph) {
      return insp.inspectionIssue(
        target,
        "OpenGraph should be provided in SEO-friendly sites",
      );
    }

    const diags: string[] = [];
    if (!sg.openGraph.title) diags.push("OpenGraph should have title");
    if (!sg.openGraph.description) {
      diags.push("OpenGraph should have description");
    }
    if (!sg.openGraph.imageURL) diags.push("OpenGraph should have imageURL");

    return diags.length > 0 ? insp.inspectionIssue(target, diags) : target;
  } else {
    return insp.inspectionIssue(
      target,
      "Social Graphs should be provided in SEO-friendly sites",
    );
  }
}
