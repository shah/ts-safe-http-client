// TODO: putting this into deps.ts did not work, so including it directly here
// from: https://github.com/justjavac/deno_cheerio
// @deno-types="https://cdn.jsdelivr.net/gh/justjavac/deno_cheerio/cheerio.d.ts"
import cheerio from "https://dev.jspm.io/cheerio/index.js";
import { inspect as insp, safety } from "./deps.ts";

// const $ = cheerio.load('<h2 class="title">Hello world</h2>');

// $("h2.title").text("Hello Deno!");
// $("h2").addClass("deno");

// console.log($.html());

export type ContentTitle = string;
export type ContentAbstract = string;

// NOTE: for all GovernedContent and related interfaces be careful using functions
// (unless the functions are properties) because the spread operator is used for copying
// of contents often (especially in content transfomers).

export interface HtmlSourceSupplier {
  readonly uri: string;
  readonly htmlSource: string;
}

export const isHtmlContentSupplier = safety.typeGuard<HtmlSourceSupplier>(
  "uri",
  "htmlSource",
);

export interface HtmlContent extends insp.InspectionResult<HtmlSourceSupplier> {
  readonly isHtmlContent: true;
}

export type HtmlContentInspectionPipe = insp.InspectionPipe<HtmlSourceSupplier>;

export const isHtmlContent = safety.typeGuard<HtmlContent>("isHtmlContent");

export interface HtmlAnchor {
  readonly href: string;
  readonly label?: string;
}

export interface AnchorFilter {
  (retain: HtmlAnchor): boolean;
}

export interface HtmlImage {
  readonly src?: string;
  readonly alt?: string;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly imageElem: CheerioElement;
}

export interface ImageFilter {
  (retain: HtmlImage): boolean;
}

export interface PageIcon {
  readonly name: string;
  readonly type: string;
  readonly href: string;
  readonly sizes: string;
}

export class HtmlMeta {
  [key: string]: string
}

// deno-lint-ignore no-explicit-any
export type UntypedObject = any;

export interface UntypedObjectFilter {
  (retain: UntypedObject): boolean;
}

export interface SchemaParseErrorHandler {
  (
    ctx: HtmlSourceSupplier,
    index: number,
    elem: CheerioElement,
    err: Error,
  ): void;
}

export interface CuratableContent extends HtmlContent {
  readonly title: ContentTitle;
  readonly socialGraph: SocialGraph;
}

export const isCuratableContent = safety.typeGuard<CuratableContent>(
  "socialGraph",
  "title",
);

export interface QueryableHtmlContent extends HtmlContent {
  readonly htmlSource: string;
  readonly document: CheerioStatic;
  readonly anchors: (retain?: AnchorFilter) => HtmlAnchor[];
  readonly images: (retain?: ImageFilter) => HtmlImage[];
  readonly untypedSchemas: (
    unwrapGraph: boolean,
    retain?: UntypedObjectFilter,
    eh?: SchemaParseErrorHandler,
  ) => UntypedObject[] | undefined;
  readonly pageIcons: () => PageIcon[];
  readonly meta: () => HtmlMeta;
}

export const isQueryableHtmlContent = safety.typeGuard<QueryableHtmlContent>(
  "htmlSource",
  "document",
);

export interface OpenGraph {
  type?: string;
  title?: ContentTitle;
  description?: ContentAbstract;
  imageURL?: string;
  keywords?: string[];
}

export interface TwitterCard {
  title?: ContentTitle;
  description?: ContentAbstract;
  imageURL?: string;
  site?: string;
  creator?: string;
}

export interface SocialGraph {
  readonly openGraph?: Readonly<OpenGraph>;
  readonly twitter?: Readonly<TwitterCard>;
}

export type SocialGraphInspector = insp.Inspector<SocialGraph>;

export interface TransformedHtmlContent
  extends
    insp.InspectionResult<HtmlSourceSupplier>,
    insp.TransformerProvenance<HtmlContent> {
}

export const isTransformedHtmlContent = safety.typeGuard<
  TransformedHtmlContent
>(
  "from",
  "position",
);

const pageIconSelectors = [
  ["defaultIcon", "link[rel='icon']"],
  ["shortcutIcon", "link[rel='shortcut icon']"],
  ["appleTouchIcon", "link[rel='apple-touch-icon']"],
  ["appleTouchIconPrecomposed", "link[rel='apple-touch-icon-precomposed']"],
  ["appleTouchStartupImage", "link[rel='apple-touch-startup-image']"],
  ["maskIcon", "link[rel='mask-icon']"],
  ["fluidIcon", "link[rel='fluid-icon']"],
];

export function typedAttribute(
  elem: CheerioElement,
  name: string,
): string | number {
  const value = elem.attribs[name];
  const int = parseInt(value);
  const float = parseFloat(value);
  return isNaN(float) ? (isNaN(int) ? value : int) : float;
}

export function anchors(
  document: CheerioStatic,
  retain?: AnchorFilter,
): HtmlAnchor[] {
  const result: HtmlAnchor[] = [];
  document("a").each((_, anchorTag): void => {
    const href = anchorTag.attribs["href"];
    if (href) {
      const anchor: HtmlAnchor = {
        href: href,
        label: document(anchorTag).text(),
      };
      if (retain) {
        if (retain(anchor)) result.push(anchor);
      } else {
        result.push(anchor);
      }
    }
  });
  return result;
}

export function images(
  document: CheerioStatic,
  retain?: ImageFilter,
): HtmlImage[] {
  const result: HtmlImage[] = [];
  document("img").each((_, imgElem): void => {
    const image: HtmlImage = {
      src: imgElem.attribs["src"],
      alt: imgElem.attribs["alt"],
      width: typedAttribute(imgElem, "width"),
      height: typedAttribute(imgElem, "height"),
      imageElem: imgElem,
    };
    if (retain) {
      if (retain(image)) result.push(image);
    } else {
      result.push(image);
    }
  });
  return result;
}

export function untypedSchemas(
  ctx: HtmlSourceSupplier,
  document: CheerioStatic,
  unwrapGraph: boolean,
  retain?: UntypedObjectFilter,
  eh?: SchemaParseErrorHandler,
): UntypedObject[] | undefined {
  const result: UntypedObject[] = [];
  document('script[type="application/ld+json"]').each(
    (index, scriptElem): void => {
      const script = scriptElem.children[0].data;
      if (script) {
        try {
          const ldJSON: UntypedObject = JSON.parse(script);
          if (ldJSON["@graph"]) {
            if (unwrapGraph) {
              for (const node of ldJSON["@graph"]) {
                if (retain) {
                  if (retain(node)) result.push(node);
                } else {
                  result.push(node);
                }
              }
              return;
            }
          }
          if (retain) {
            if (retain(ldJSON)) result.push(ldJSON);
          } else {
            result.push(ldJSON);
          }
        } catch (err) {
          if (eh) eh(ctx, index, scriptElem, err);
        }
      }
    },
  );
  return result;
}

export function pageIcons(document: CheerioStatic): PageIcon[] {
  const result: PageIcon[] = [];
  pageIconSelectors.forEach((selector) => {
    document(selector[1]).each((_, linkElem) => {
      const { href, sizes, type } = linkElem.attribs;
      if (href && href !== "#") {
        const icon = {
          name: selector[0],
          sizes,
          href,
          type,
        };
        result.push(icon);
      }
    });
  });
  return result;
}

export function meta(document: CheerioStatic): HtmlMeta {
  const meta: HtmlMeta = {};
  document("meta").each((_, metaElem): void => {
    const name = metaElem.attribs["name"];
    const property = metaElem.attribs["property"];
    if (name || property) {
      meta[name || property] = metaElem.attribs["content"];
    }
  });
  return meta;
}

export async function inspectQueryableHtmlContent(
  content: HtmlSourceSupplier | insp.InspectionResult<HtmlSourceSupplier>,
  ctx?: insp.InspectionContext,
): Promise<
  | HtmlSourceSupplier
  | insp.InspectionResult<HtmlSourceSupplier>
  | QueryableHtmlContent
> {
  if (isQueryableHtmlContent(content)) {
    // it's already queryable so don't touch it
    return content;
  }

  // enrich the existing content with cheerio static document
  const supplier = insp.inspectionTarget(content);
  const document = cheerio.load(supplier.htmlSource, {
    normalizeWhitespace: true,
    decodeEntities: true,
    lowerCaseTags: true,
    lowerCaseAttributeNames: true,
  });
  return {
    isInspectionResult: true,
    inspectionTarget: supplier,
    isHtmlContent: true,
    htmlSource: supplier.htmlSource,
    document: document,
    anchors: (retain?: AnchorFilter): HtmlAnchor[] => {
      return anchors(document, retain);
    },
    images: (retain?: ImageFilter): HtmlImage[] => {
      return images(document, retain);
    },
    untypedSchemas: (
      unwrapGraph: boolean,
      retain?: UntypedObjectFilter,
      eh?: SchemaParseErrorHandler,
    ): UntypedObject[] | undefined => {
      return untypedSchemas(supplier, document, unwrapGraph, retain, eh);
    },
    pageIcons: (): PageIcon[] => {
      return pageIcons(document);
    },
    meta: (): HtmlMeta => {
      return meta(document);
    },
  };
}

export function parseOpenGraph(document: CheerioStatic): OpenGraph {
  const result: OpenGraph = {};
  const metaTransformers: {
    [key: string]: (v: string) => void;
  } = {
    "og:type": (v: string) => {
      result.type = v;
    },
    "og:title": (v: string) => {
      result.title = v;
    },
    "og:description": (v: string) => {
      result.description = v;
    },
    "og:image": (v: string) => {
      result.imageURL = v;
    },
    "og:keywords": (v: string) => {
      result.keywords = v.split(",").map((kw) => kw.trim());
    },
  };
  // deno-lint-ignore no-explicit-any
  const meta = document("meta") as any;
  const keys = Object.keys(meta);
  for (const outerKey in metaTransformers) {
    keys.forEach(function (innerKey) {
      if (
        meta[innerKey].attribs &&
        meta[innerKey].attribs.property &&
        meta[innerKey].attribs.property === outerKey
      ) {
        metaTransformers[outerKey](meta[innerKey].attribs.content);
      }
    });
  }
  return result;
}

export function parseTwitterCard(document: CheerioStatic): TwitterCard {
  const result: TwitterCard = {};
  const metaTransformers: {
    [key: string]: (v: string) => void;
  } = {
    "twitter:title": (v: string) => {
      result.title = v;
    },
    "twitter:image": (v: string) => {
      result.imageURL = v;
    },
    "twitter:description": (v: string) => {
      result.description = v;
    },
    "twitter:site": (v: string) => {
      result.site = v;
    },
    "twitter:creator": (v: string) => {
      result.creator = v;
    },
  };
  // deno-lint-ignore no-explicit-any
  const meta = document("meta") as any;
  const keys = Object.keys(meta);
  for (const outerKey in metaTransformers) {
    keys.forEach(function (innerKey) {
      if (
        meta[innerKey].attribs &&
        meta[innerKey].attribs.name &&
        meta[innerKey].attribs.name === outerKey
      ) {
        metaTransformers[outerKey](meta[innerKey].attribs.content);
      }
    });
  }
  return result;
}

export function parseSocialGraph(
  document: CheerioStatic,
): SocialGraph {
  const og = parseOpenGraph(document);
  const tc = parseTwitterCard(document);
  const result: { [key: string]: OpenGraph | TwitterCard } = {};
  if (Object.keys(og).length > 0) result.openGraph = og;
  if (Object.keys(tc).length > 0) result.twitter = tc;
  return result as SocialGraph;
}

export function title(
  document: CheerioStatic,
  sg?: SocialGraph,
): string {
  // If an og:title is available, use it otherwise use twitter:title otherwise use page title
  const socialGraph = sg ? sg : parseSocialGraph(document);
  let result = document("head > title").text();
  if (socialGraph.twitter?.title) {
    result = socialGraph.twitter.title;
  }
  if (socialGraph.openGraph?.title) {
    result = socialGraph.openGraph.title;
  }
  return result;
}

export async function inspectCuratableContent(
  target: HtmlSourceSupplier | insp.InspectionResult<HtmlSourceSupplier>,
  ctx?: insp.InspectionContext,
): Promise<
  | HtmlSourceSupplier
  | insp.InspectionResult<HtmlSourceSupplier>
  | insp.InspectionResult<HtmlSourceSupplier> & CuratableContent
> {
  let content:
    | HtmlSourceSupplier
    | insp.InspectionResult<HtmlSourceSupplier>
    | QueryableHtmlContent = target;

  if (!isQueryableHtmlContent(content)) {
    content = await inspectQueryableHtmlContent(content, ctx);
  }

  if (isQueryableHtmlContent(content)) {
    const socialGraph = parseSocialGraph(content.document);
    return {
      ...content,
      title: title(content.document, socialGraph),
      socialGraph: socialGraph,
    };
  } else {
    return insp.inspectionIssue(
      target,
      `"[inspectCuratableContent] isQueryableHtmlContent(content) should be true"`,
    );
  }
}

export async function inspectCurationTitle(
  target: HtmlSourceSupplier | insp.InspectionResult<HtmlSourceSupplier>,
  ctx?: insp.InspectionContext,
): Promise<
  | HtmlSourceSupplier
  | insp.InspectionResult<HtmlSourceSupplier>
  | TransformedHtmlContent
> {
  let result:
    | HtmlSourceSupplier
    | insp.InspectionResult<HtmlSourceSupplier>
    | HtmlContent
    | CuratableContent
    | TransformedHtmlContent = target;

  if (!isCuratableContent(result)) {
    result = await inspectCuratableContent(result);
  }

  if (isCuratableContent(result)) {
    const suggested = result.title;
    const sourceNameAfterPipeRegEx = / \| .*$/;
    const standardized = suggested.replace(
      sourceNameAfterPipeRegEx,
      "",
    );
    if (suggested != standardized) {
      const transformed: CuratableContent & TransformedHtmlContent = {
        ...result,
        title: standardized,
        from: result,
        position: insp.nextTransformerProvenancePosition(result),
        remarks: `Standardized title (was "${suggested}")`,
      };
      return transformed;
    }
  }
  return target;
}
