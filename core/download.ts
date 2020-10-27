import { fs, inspect as insp, mediaTypes, path, safety, uuid } from "./deps.ts";
import * as tr from "./traverse.ts";

// TODO: implement file download
// * see alos: https://github.com/denoland/deno/blob/master/std/mime/multipart.ts
// * see also: https://github.com/tomholford/media-downloader

export interface DownloadableContent {
  readonly isDownloadableContent: true;
}

export type DownloadableContentInspector = insp.InspectionPipe<RequestInfo>;

export interface DownloadedContent extends DownloadableContent {
  readonly isDownloadedContent: true;
  readonly suggestedFileName?: string;
  readonly fileName: string;
  readonly shouldWriteBytes: number;
  readonly wroteBytes: number;
}

export const isDownloadedContent = safety.typeGuardCustom<
  DownloadableContent,
  DownloadedContent
>("isDownloadedContent");

export interface SkippedDownloadableContent extends DownloadableContent {
  readonly isSkippedDownloadableContent: true;
}

export interface DownloadSupplier {
  readonly download: DownloadableContent;
}

export interface DownloadTraversalResult
  extends tr.SuccessfulTraversal, DownloadSupplier {
}

export const isDownloadTraversalResult = safety.typeGuard<
  DownloadTraversalResult
>("download");

export interface FlexibleDownloadOption<T> {
  (tc: tr.TraversalContent, ctx?: insp.InspectionContext): T;
}

export interface TraversalResultDownloaderOptions {
  readonly destPath?: string;
  readonly statusValidator?: tr.RequestInfoInspector;
  readonly destination?: FlexibleDownloadOption<
    [name: string, dest: Deno.File]
  >;
  readonly downloadFilter?: FlexibleDownloadOption<boolean>;
}

export function contentTypeFilter(
  ...allowed: string[]
): FlexibleDownloadOption<boolean> {
  return (tc: tr.TraversalContent): boolean => {
    return allowed.find((ct) => tc.contentType == ct) ? true : false;
  };
}

export const pdfFilter = contentTypeFilter("application/pdf");

export function makeTemppDirPath(prefix = "ts-safe-http-client"): string {
  return Deno.makeTempDirSync({ prefix: prefix });
}

export function downloadInspector(
  options?: TraversalResultDownloaderOptions,
): tr.RequestInfoInspector {
  const destPath = options?.destPath || makeTemppDirPath();
  const statusValidator = options?.statusValidator ||
    tr.inspectHttpStatus;
  const downloadFilter = options?.downloadFilter || ((): boolean => {
    return true;
  });
  const destination = options?.destination ||
    ((tc: tr.TraversalContent): [string, Deno.File] => {
      const cdfn = tc.contentDisposition
        ? tc.contentDisposition["filename"]
        : undefined;
      const fileExtn = mediaTypes.extension(tc.contentType);
      const fileName = path.join(
        destPath,
        cdfn ? cdfn : `${uuid.v4.generate()}.${fileExtn || "download"}`,
      );
      return [
        fileName,
        Deno.openSync(
          fileName,
          { create: true, write: true },
        ),
      ];
    });

  return async (
    target: RequestInfo | insp.InspectionResult<RequestInfo>,
    ctx?: insp.InspectionContext,
  ): Promise<
    | RequestInfo
    | insp.InspectionResult<RequestInfo>
    | DownloadTraversalResult
  > => {
    if (isDownloadTraversalResult(target)) return target;
    const instance = await statusValidator(target);
    if (tr.isTraversalContent(instance)) {
      if (downloadFilter(instance, ctx)) {
        await fs.ensureDir(destPath);
        const [fileName, file] = destination(instance, ctx);
        const shouldWriteBytes = await instance.writeContent(file);
        file.close();
        const stats = Deno.statSync(fileName);
        const download: DownloadedContent = {
          isDownloadableContent: true,
          isDownloadedContent: true,
          suggestedFileName: instance.contentDisposition
            ? instance.contentDisposition["filename"]
            : undefined,
          fileName,
          shouldWriteBytes,
          wroteBytes: stats.size,
        };
        const result: DownloadTraversalResult = {
          ...instance,
          download: download,
        };
        return result;
      }
      const fdc: SkippedDownloadableContent = {
        isDownloadableContent: true,
        isSkippedDownloadableContent: true,
      };
      const result: DownloadTraversalResult = {
        ...instance,
        download: fdc,
      };
      return result;
    }
    return instance;
  };
}
