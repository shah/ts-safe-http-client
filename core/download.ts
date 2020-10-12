import { fs, mediaTypes, path, safety, uuid } from "./deps.ts";
import * as tr from "./traverse.ts";

// TODO: implement file download
// * see alos: https://github.com/denoland/deno/blob/master/std/mime/multipart.ts
// * see also: https://github.com/tomholford/media-downloader

export interface DownloadableContent {
  readonly isDownloadableContent: true;
}

export type DownloadableContentEnhancer = safety.Enhancer<
  tr.TraverseContext,
  DownloadableContent
>;

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

export const isDownloadTraversalResult = safety.typeGuardCustom<
  tr.TraversalResult,
  tr.SuccessfulTraversal & DownloadSupplier
>("download");

export interface FlexibleDownloadOption<T> {
  (tc: tr.TraversalContent, ctx: tr.TraverseContext): T;
}

export interface TraversalResultDownloaderOptions {
  readonly destPath?: string;
  readonly statusValidator?: tr.ValidateStatus;
  readonly destination?: FlexibleDownloadOption<
    [name: string, dest: Deno.File]
  >;
  readonly downloadFilter?: FlexibleDownloadOption<boolean>;
  readonly downloadEnhancer?: DownloadableContentEnhancer;
}

export function contentTypeFilter(
  ...allowed: string[]
): FlexibleDownloadOption<boolean> {
  return (tc: tr.TraversalContent): boolean => {
    return allowed.find((ct) => tc.contentType == ct) ? true : false;
  };
}

export const pdfFilter = contentTypeFilter("application/pdf");

export class TraversalResultDownloader implements tr.TraversalResultEnhancer {
  static readonly tempDirDownloader = new TraversalResultDownloader();
  static readonly tempDirPdfDownloader = new TraversalResultDownloader(
    { downloadFilter: pdfFilter },
  );

  readonly destPath: string;
  readonly statusValidator: tr.ValidateStatus;
  readonly destination: FlexibleDownloadOption<[string, Deno.File]>;
  readonly downloadFilter: FlexibleDownloadOption<boolean>;
  readonly downloadEnhancer: DownloadableContentEnhancer;

  constructor(
    options?: TraversalResultDownloaderOptions,
  ) {
    this.destPath = options?.destPath ||
      Deno.makeTempDirSync({ prefix: "ts-safe-http-client" });
    this.statusValidator = options?.statusValidator ||
      tr.ValidateStatus.singleton;
    this.downloadFilter = options?.downloadFilter || ((): boolean => {
      return true;
    });
    this.destination = options?.destination ||
      ((tc: tr.TraversalContent): [string, Deno.File] => {
        const cdfn = tc.contentDisposition
          ? tc.contentDisposition["filename"]
          : undefined;
        const fileExtn = mediaTypes.extension(tc.contentType);
        const fileName = path.join(
          this.destPath,
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
    this.downloadEnhancer = options?.downloadEnhancer ||
      safety.enhancementsPipe();
  }

  async enhance(
    ctx: tr.TraverseContext,
    str: tr.SuccessfulTraversal,
  ): Promise<
    | tr.TraversalResult
    | tr.TraversalResult & DownloadSupplier
  > {
    if (isDownloadTraversalResult(str)) return str;
    const instance = await this.statusValidator.enhance(ctx, str);
    if (tr.isTraversalContent(instance)) {
      if (this.downloadFilter(instance, ctx)) {
        await fs.ensureDir(this.destPath);
        const [fileName, file] = this.destination(instance, ctx);
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
        const result: tr.TraversalResult & DownloadSupplier = {
          ...instance,
          download: await this.downloadEnhancer.enhance(ctx, download),
        };
        return result;
      }
      const fdc: SkippedDownloadableContent = {
        isDownloadableContent: true,
        isSkippedDownloadableContent: true,
      };
      const result: tr.TraversalResult & DownloadSupplier = {
        ...instance,
        download: await this.downloadEnhancer.enhance(ctx, fdc),
      };
      return result;
    }
    return instance;
  }
}
