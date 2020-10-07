import * as enh from "./enhance.ts";
import * as tr from "./traverse.ts";
import type * as rt from "./runtime.ts";
import type { mediaTypes } from "./deps.ts";

export interface DownloadAttemptResult {
  readonly isDownloadAttemptResult: true;
  readonly sizeExpected: number;
}

export function isDownloadAttemptResult(
  o: unknown,
): o is DownloadAttemptResult {
  return o && typeof o === "object" && "isDownloadAttemptResult" in o;
}

export interface DownloadSkipResult extends DownloadAttemptResult {
  readonly downloadSkippedReason: string;
}

export function isDownloadSkipResult(o: unknown): o is DownloadSkipResult {
  return o && typeof o === "object" && "downloadSkippedReason" in o;
}

export interface DownloadErrorResult extends DownloadAttemptResult {
  readonly sizeDownloaded: number;
  readonly downloadError: Error;
}

export function isDownloadErrorResult(o: unknown): o is DownloadErrorResult {
  return o && typeof o === "object" && "downloadError" in o;
}

export interface DownloadSuccessResult extends DownloadAttemptResult {
  readonly downloadDestPath: string;
  readonly downloadedFileStats: rt.FileStats;
}

export function isDownloadSuccessResult(
  o: unknown,
): o is DownloadSuccessResult {
  return o && typeof o === "object" && "downloadDestPath" in o;
}

export interface DownloadFileResult extends DownloadSuccessResult {
  readonly downloadedFileType: rt.FileType;
}

export function isDownloadFileResult(o: unknown): o is DownloadFileResult {
  return o && typeof o === "object" && "downloadDestPath" in o &&
    "downloadedFileType" in o;
}

export interface DownloadIndeterminateFileResult extends DownloadSuccessResult {
  readonly unknownFileType: string;
  readonly downloadedFileStats: rt.FileStats;
}

export function isDownloadIndeterminateFileResult(
  o: unknown,
): o is DownloadIndeterminateFileResult {
  return o && typeof o === "object" && "unknownFileType" in o &&
    "downloadedFileType" in o;
}

// TODO: implement file download
// * see alos: https://github.com/denoland/deno/blob/master/std/mime/multipart.ts
// * see also: https://github.com/tomholford/media-downloader

// export interface Downloader {
//   writer(dc: DownloadContent, resource: FollowedResource): Writable;
//   finalize(
//     dc: DownloadContent,
//     resource: FollowedResource,
//     writer: Writable,
//   ): Promise<DownloadSuccessResult>;
// }

// export interface TypicalDownloaderOptions {
//   readonly destPath?: string;
//   readonly createDestPath?: boolean;
//   readonly determineFileType?: boolean;
// }

// export class TypicalDownloader implements Downloader, TypicalDownloaderOptions {
//   readonly destPath: string;
//   readonly determineFileType: boolean;

//   constructor(
//     { destPath, createDestPath, determineFileType }: TypicalDownloaderOptions,
//   ) {
//     this.destPath = destPath ||
//       path.join(os.tmpdir(), "uniform-resource-downloads");
//     this.determineFileType = typeof determineFileType == "undefined"
//       ? true
//       : determineFileType;
//     if (createDestPath) {
//       try {
//         fs.mkdirSync(this.destPath);
//       } catch (e) {
//         // the directory already exists?
//         // TODO: add error checking
//       }
//     }
//   }

//   writer(): Writable {
//     return fs.createWriteStream(path.join(this.destPath, uuidv4()));
//   }

//   async finalize(
//     _: DownloadContent,
//     resource: FollowedResource,
//     writer: Writable,
//   ): Promise<
//     DownloadSuccessResult | DownloadFileResult | DownloadIndeterminateFileResult
//   > {
//     const dfs = writer as fs.WriteStream;
//     const downloadDestPath = dfs.path as string;
//     let sizeExpected = -1;
//     if (tru.isTerminalResult(resource.terminalResult)) {
//       const sizeHeader = resource.terminalResult.httpResponse.headers.get(
//         "Content-Length",
//       );
//       if (sizeHeader) sizeExpected = parseInt(sizeHeader);
//     }
//     const stats = fs.statSync(downloadDestPath);
//     if (this.determineFileType) {
//       let cd: contentDisposition.ContentDisposition | undefined = undefined;
//       if (tru.isTerminalResult(resource.terminalResult)) {
//         const cdHeader = resource.terminalResult.httpResponse.headers.get(
//           "Content-Disposition",
//         );
//         if (cdHeader) {
//           cd = contentDisposition.parse(cdHeader);
//         }
//       }
//       const fileType = await ft.fromFile(downloadDestPath);
//       if (fileType) {
//         const finalFileName = dfs.path + "." + fileType.ext;
//         fs.renameSync(downloadDestPath, finalFileName);
//         return {
//           isDownloadAttemptResult: true,
//           sizeExpected: sizeExpected,
//           downloadedFileStats: stats,
//           downloadDestPath: finalFileName,
//           downloadedFileType: fileType,
//           contentDisposition: cd,
//         };
//       } else {
//         return {
//           isDownloadAttemptResult: true,
//           downloadDestPath: downloadDestPath,
//           unknownFileType: "Unable to determine type of file " +
//             downloadDestPath,
//           contentDisposition: cd,
//           sizeExpected: sizeExpected,
//           downloadedFileStats: stats,
//         };
//       }
//     }
//     return {
//       isDownloadAttemptResult: true,
//       downloadDestPath: downloadDestPath,
//       sizeExpected: sizeExpected,
//       downloadedFileStats: stats,
//     };
//   }
// }

// export class DownloadContent implements UniformResourceTransformer {
//   static readonly typicalDownloader = new TypicalDownloader(
//     { createDestPath: true },
//   );
//   static readonly singleton = new DownloadContent(
//     DownloadContent.typicalDownloader,
//   );

//   constructor(readonly downloader: Downloader) {
//   }

//   async flow(
//     _: ResourceTransformerContext,
//     resource: UniformResource,
//   ): Promise<
//     | UniformResource
//     | (
//       & UniformResource
//       & (DownloadSkipResult | DownloadErrorResult | DownloadSuccessResult)
//     )
//   > {
//     if (isFollowedResource(resource)) {
//       if (tru.isTerminalResult(resource.terminalResult)) {
//         try {
//           const writer = this.downloader.writer(this, resource);
//           if (tru.isTerminalTextContentResult(resource.terminalResult)) {
//             writer.write(resource.terminalResult.contentText);
//           } else {
//             await streamPipeline(
//               resource.terminalResult.httpResponse.body,
//               writer,
//             );
//           }
//           const success = await this.downloader.finalize(
//             this,
//             resource,
//             writer,
//           );
//           return {
//             ...resource,
//             ...success,
//           };
//         } catch (e) {
//           return {
//             ...resource,
//             downloadError: e,
//           };
//         }
//       }
//     }
//     return {
//       ...resource,
//       isDownloadAttemptResult: true,
//       downloadSkippedReason:
//         `Unable to download, resource [${resource.label}](${resource.uri}) was not traversed`,
//     };
//   }
// }

// export class DownloadHttpContentTypes implements UniformResourceTransformer {
//   static readonly pdfsOnly = new DownloadHttpContentTypes(
//     DownloadContent.singleton,
//     "application/pdf",
//   );
//   readonly contentTypes: string[];

//   constructor(readonly wrapperDC: DownloadContent, ...contentTypes: string[]) {
//     this.contentTypes = contentTypes;
//   }

//   async flow(
//     ctx: ResourceTransformerContext,
//     resource: UniformResource,
//   ): Promise<
//     | UniformResource
//     | (
//       & UniformResource
//       & (DownloadSkipResult | DownloadErrorResult | DownloadSuccessResult)
//     )
//   > {
//     if (isFollowedResource(resource)) {
//       const visitResult = resource.terminalResult;
//       if (tru.isTerminalResult(visitResult)) {
//         if (
//           this.contentTypes.find((contentType) =>
//             contentType == visitResult.contentType
//           )
//         ) {
//           return this.wrapperDC.flow(ctx, resource);
//         }
//       }
//     }
//     return resource;
//   }
// }
