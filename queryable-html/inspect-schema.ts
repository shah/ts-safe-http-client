import { inspect as insp } from "./deps.ts";
import * as qh from "./queryable-html.ts";

export function schemaInspector(): qh.HtmlContentInspector {
  const findSchema = [
    `'@context': "http://schema.org"`,
  ];
  return async (
    target:
      | qh.HtmlSourceSupplier
      | insp.InspectionResult<qh.HtmlSourceSupplier>,
    ctx?: insp.InspectionContext,
  ): Promise<
    | qh.HtmlSourceSupplier
    | insp.InspectionResult<qh.HtmlSourceSupplier>
    | insp.InspectionIssue<qh.HtmlSourceSupplier>
  > => {
    if (qh.isQueryableHtmlContent(target)) {
      const supplier = target.inspectionTarget;
      for (const find of findSchema) {
        if (supplier.htmlSource.indexOf(find) < 0) {
          return insp.inspectionIssue(
            target,
            `Schema block not  found: \`${find}\``,
          );
        }
      }
    }

    return target;
  };
}
