import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./rfc-8288-web-link.ts";

Deno.test("parsing a proper RFC 8288 link header with next and last", () => {
  const testLinkText =
    '<https://api.github.com/user/9287/repos?client_id=1&client_secret=2&page=2&per_page=100>; rel="next" extraParam="multi word", ' +
    "<https://api.github.com/user/9287/repos?client_id=1&client_secret=2&page=3&per_page=100>; rel=last, " + // unquoted
    '<https://api.github.com/user/9287,123;/repos?client_id=1&client_secret=2&page=1&per_page=100>; rel="prev previous"'; // quoted multiple, creates two of same

  const links = mod.parseRfc8288LinkHeader(testLinkText);
  ta.assert(mod.isParsedWebLinks(links));
  ta.assert(links.parsed.length == 4);

  const link1 = links.parsed[0];
  ta.assertEquals(
    link1.targetIRI.toString(),
    new URL(
      "https://api.github.com/user/9287/repos?client_id=1&client_secret=2&page=2&per_page=100",
    ).toString(),
  );
  ta.assertEquals(link1.relationType, "next");
  ta.assertObjectMatch(
    link1.params,
    {
      client_id: "1",
      client_secret: "2",
      page: "2",
      per_page: "100",
      extraParam: "multi word",
    },
  );

  const link2 = links.parsed[1];
  ta.assertEquals(
    link2.targetIRI.toString(),
    new URL(
      "https://api.github.com/user/9287/repos?client_id=1&client_secret=2&page=3&per_page=100",
    ).toString(),
  );
  ta.assertEquals(link2.relationType, "last");
  ta.assertObjectMatch(
    link2.params,
    { client_id: "1", client_secret: "2", page: "3", per_page: "100" },
  );

  for (const linkMulti of [links.parsed[2], links.parsed[3]]) {
    ta.assertEquals(
      linkMulti.targetIRI.toString(),
      new URL(
        "https://api.github.com/user/9287,123;/repos?client_id=1&client_secret=2&page=1&per_page=100",
      ).toString(),
    );
    ta.assert(
      linkMulti.relationType == "prev" || linkMulti.relationType == "previous",
    );
    ta.assertObjectMatch(
      linkMulti.params,
      { client_id: "1", client_secret: "2", page: "1", per_page: "100" },
    );
  }
});

Deno.test("parsing empty RFC 8288 link", () => {
  const links = mod.parseRfc8288LinkHeader("");
  ta.assert(links.isEmpty);
  ta.assert(!mod.isParsedWebLinks(links));
});

Deno.test("parsing bad RFC 8288 format alone", () => {
  const links = mod.parseRfc8288LinkHeader("<improperly formatted");
  ta.assert(links.errors);
  ta.assert(links.isEmpty);
});

Deno.test("parsing bad RFC 8288 format preceding good format", () => {
  const links = mod.parseRfc8288LinkHeader(
    "<improperly formatted first,<https://api.github.com/user/9287/repos?client_id=1&client_secret=2&page=3&per_page=100>; rel=last",
  );
  ta.assert(links.errors);
  ta.assert(!links.isEmpty);
  ta.assert(mod.isParsedWebLinks(links));
  ta.assertEquals(links.parsed.length, 1);
});

Deno.test("parsing bad RFC 8288 format after good format", () => {
  const links = mod.parseRfc8288LinkHeader(
    "<https://api.github.com/user/9287/repos?client_id=1&client_secret=2&page=3&per_page=100>; rel=last,<improperly formatted second",
  );
  ta.assert(links.errors);
  ta.assert(!links.isEmpty);
  ta.assert(mod.isParsedWebLinks(links));
  ta.assertEquals(links.parsed.length, 1);
});
