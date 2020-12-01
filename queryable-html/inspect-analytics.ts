import { inspect as insp } from "./deps.ts";
import * as qh from "./queryable-html.ts";

export interface GoogleTagManagerInspectorOptions {
  readonly gtmIdentity: string;
}

export function googleTagManagerInspector(
  options: GoogleTagManagerInspectorOptions,
): qh.HtmlContentInspector {
  const findGTM = [
    `)(window,document,'script','dataLayer','${options.gtmIdentity}');</script>`,
    `iframe src="https://www.googletagmanager.com/ns.html?id=${options.gtmIdentity}"`,
  ];
  // deno-lint-ignore require-await
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
      for (const find of findGTM) {
        if (supplier.htmlSource.indexOf(find) < 0) {
          return insp.inspectionIssue(
            target,
            `Google Tag Manager code not found: \`${find}\``,
          );
        }
      }
    }

    return target;
  };
}
