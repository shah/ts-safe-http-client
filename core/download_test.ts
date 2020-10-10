import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./mod.ts";

Deno.test(`download image`, async () => {
  const endpoint =
    `https://upload.wikimedia.org/wikipedia/en/5/54/USS_Enterprise_%28NCC-1701-A%29.jpg`;
  const result = await mod.traverse(
    {
      request: endpoint,
      options: mod.defaultTraverseOptions(
        { trEnhancer: mod.TraversalResultDownloader.tempDirDownloader },
      ),
    },
  );
  ta.assert(result, "result should be defined");
  ta.assert(
    mod.isDownloadTraversalResult(result),
    "result should be a DownloadTraversalResult",
  );
  ta.assert(
    mod.isDownloadedContent(result.download),
    "result.download should be a successful download",
  );
  ta.assertEquals(result.download.wroteBytes, result.download.shouldWriteBytes);
});

Deno.test(`download PDF`, async () => {
  const endpoint = `http://ceur-ws.org/Vol-1401/paper-05.pdf`;
  const result = await mod.traverse(
    {
      request: `http://ceur-ws.org/Vol-1401/paper-05.pdf`,
      options: mod.defaultTraverseOptions(
        { trEnhancer: mod.TraversalResultDownloader.tempDirDownloader },
      ),
    },
  );
  ta.assert(result, "result should be defined");
  ta.assert(
    mod.isDownloadTraversalResult(result),
    "result should be a DownloadTraversalResult",
  );
  ta.assert(
    mod.isDownloadedContent(result.download),
    "result.download should be a successful download",
  );
  ta.assertEquals(result.download.wroteBytes, result.download.shouldWriteBytes);
});
