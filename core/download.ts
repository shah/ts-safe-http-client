import { fs } from "./deps.ts";

export interface DownloadDestination {
  readonly dir?: string;
  readonly file?: string;
  readonly mode?: number;
}

export interface DownlodedFile {
  readonly file: string;
  readonly dir: string;
  readonly fullPath: string;
  readonly size: number;
}

export async function downloadFile(
  src: string | URL,
  dest?: DownloadDestination,
  options?: RequestInit,
): Promise<DownlodedFile> {
  let file: string;
  let fullPath: string;
  let dir: string = "";
  // deno-lint-ignore ban-types
  let mode: object = {};
  let finalUrl: string;
  let size: number;

  const response = await fetch(src, options);
  finalUrl = response.url.replace(/\/$/, "");
  if (response.status != 200) {
    return Promise.reject(
      new Deno.errors.Http(
        `${finalUrl}: status ${response.status}-'${response.statusText}' while writing to ${
          JSON.stringify(dest)
        }`,
      ),
    );
  }
  const content = await response.blob();
  size = content.size;
  const buffer = await content.arrayBuffer();
  const contentBytes = new Deno.Buffer(buffer).bytes();
  if (
    typeof dest === "undefined" || typeof dest.dir === "undefined"
  ) {
    dir = Deno.makeTempDirSync({ prefix: "ts-safe-http-client" });
  } else {
    dir = dest.dir;
  }
  if (
    typeof dest === "undefined" ||
    typeof dest.file === "undefined"
  ) {
    file = finalUrl.substring(finalUrl.lastIndexOf("/") + 1);
  } else {
    file = dest.file;
  }
  if (
    typeof dest != "undefined" && typeof dest.mode != "undefined"
  ) {
    mode = { mode: dest.mode };
  }

  dir = dir.replace(/\/$/, "");
  fs.ensureDirSync(dir);

  fullPath = `${dir}/${file}`;
  Deno.writeFileSync(fullPath, contentBytes, mode);
  return Promise.resolve({ file, dir, fullPath, size });
}
