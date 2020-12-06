import { safety } from "./deps.ts";

export type Rfc8288WebLinkRelType =
  | "next"
  | "prev"
  | "previous"
  | "first"
  | "last"
  | string;

// https://tools.ietf.org/html/rfc8288
export interface Rfc8288WebLink {
  readonly targetIRI: URL;
  // https://www.iana.org/assignments/link-relations/link-relations.xhtml
  readonly relationType: Rfc8288WebLinkRelType;
  readonly params: { [key: string]: string };
}

export interface Rfc8288WebLinks {
  readonly source: string;
  readonly isEmpty: boolean;
  readonly errors: number;
  readonly parsed?: Rfc8288WebLink[];
  readonly relationType?: (
    rel: Rfc8288WebLinkRelType,
  ) => Rfc8288WebLink | undefined;
}

export interface ParsedRfc8288WebLinks extends Rfc8288WebLinks {
  readonly parsed: Rfc8288WebLink[];
  readonly relationType: (
    rel: Rfc8288WebLinkRelType,
  ) => Rfc8288WebLink | undefined;
}

export const isParsedWebLinks = safety.typeGuard<ParsedRfc8288WebLinks>(
  "source",
  "parsed",
  "relationType",
);

export interface Rfc8288PaginationWebLinksSuite extends ParsedRfc8288WebLinks {
  readonly first: Rfc8288WebLink;
  readonly next: Rfc8288WebLink;
  readonly previous: Rfc8288WebLink;
  readonly last: Rfc8288WebLink;
}

export const isRfc8288PaginationWebLinksSuite = safety.typeGuard<
  Rfc8288PaginationWebLinksSuite
>(
  "first",
  "next",
  "previous",
  "last",
);

export const isFirstPageRfc8288WebLink = safety.typeGuard<
  { first: Rfc8288WebLink }
>("first");

export const isNextPageRfc8288WebLink = safety.typeGuard<
  { next: Rfc8288WebLink }
>("next");

export const isPreviousPageRfc8288WebLink = safety.typeGuard<
  { previous: Rfc8288WebLink }
>("previous");

export const isLastPageRfc8288WebLink = safety.typeGuard<
  { last: Rfc8288WebLink }
>("last");

export function parseRfc8288LinkHeader(
  linkSpecText: string,
): Rfc8288WebLinks | ParsedRfc8288WebLinks | Rfc8288PaginationWebLinksSuite {
  if (!linkSpecText || linkSpecText.trim().length == 0) {
    return { errors: 0, isEmpty: true, source: linkSpecText };
  }
  const parsed: Rfc8288WebLink[] = [];
  const named: { [key: string]: Rfc8288WebLink } = {};
  let errors = 0;
  linkSpecText.split(/,\s*</)
    .forEach((linkComponent) => {
      const m = linkComponent.match(/<?([^>]*)>(.*)/);
      if (m) {
        const linkValue = new URL(m[1]);
        const linkParamsText = m[2].split(";");
        const linkParams: { [key: string]: string } = {};
        linkValue.searchParams.forEach((value, key) => {
          linkParams[key] = value;
        });
        if (linkParamsText.length == 2) {
          const attrsRegEx = /(\w+)=\s*"?([^"]+)"?/ig;
          for (const match of linkParamsText[1].matchAll(attrsRegEx)) {
            const [, key, value] = match;
            linkParams[key] = value;
          }
        }
        const relTypes = linkParams["rel"];
        if (relTypes) {
          for (const rel of relTypes.split(" ")) {
            const link = {
              targetIRI: linkValue,
              relationType: rel,
              params: linkParams,
            };
            switch (rel) {
              case "next":
                named.next = link;
                break;
              case "prev":
              case "previous":
                named.previous = link;
                break;
              case "first":
                named.first = link;
                break;
              case "last":
                named.last = link;
                break;
            }
            parsed.push(link);
          }
        }
      } else {
        errors++;
      }
    });

  const haveLinks = parsed.length > 0;
  return {
    source: linkSpecText,
    isEmpty: !haveLinks,
    errors,
    parsed: haveLinks ? parsed : undefined,
    relationType: haveLinks
      ? ((
        rel: Rfc8288WebLinkRelType,
      ): Rfc8288WebLink | undefined => {
        return parsed.find((link) => {
          return link.relationType == rel;
        });
      })
      : undefined,
    ...named,
  };
}
