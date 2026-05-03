import { put } from "@vercel/blob";
import { env } from "@/env";

// The only place the rest of the app touches Vercel Blob. To swap providers
// (R2, S3, etc.) change this file — the adapter signatures stay the same.
// See AGENTS.md "Project structure" for the boundary rule.

export type StoredObject = {
  url: string;
  pathname: string;
  contentType: string;
  byteSize: number;
};

export type PutOptions = {
  pathname: string;
  contentType: string;
  body: Blob | ArrayBuffer | Buffer | ReadableStream;
};

export async function putObject(opts: PutOptions): Promise<StoredObject> {
  const blob = await put(opts.pathname, opts.body, {
    access: "public",
    contentType: opts.contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
    allowOverwrite: false,
  });
  const byteSize =
    opts.body instanceof Blob
      ? opts.body.size
      : opts.body instanceof ArrayBuffer
        ? opts.body.byteLength
        : opts.body instanceof Buffer
          ? opts.body.byteLength
          : 0;
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: opts.contentType,
    byteSize,
  };
}

export type ClientUploadToken = {
  uploadUrl: string;
  pathname: string;
  contentType: string;
};

const SIGNED_TTL_SECONDS = 60 * 10;

// Asks Vercel Blob for a one-shot upload URL the browser can PUT to directly.
// Used by app/api/uploads/route.ts so 500 MB videos never traverse our
// Server Action's body limit.
export async function createClientUploadToken(args: {
  pathname: string;
  contentType: string;
}): Promise<ClientUploadToken> {
  const { generateClientTokenFromReadWriteToken } = await import(
    "@vercel/blob/client"
  );
  const expiresAt = Date.now() + SIGNED_TTL_SECONDS * 1000;
  const token = await generateClientTokenFromReadWriteToken({
    token: env.BLOB_READ_WRITE_TOKEN,
    pathname: args.pathname,
    onUploadCompleted: { callbackUrl: "" },
    validUntil: expiresAt,
    allowedContentTypes: [args.contentType],
  });
  return {
    uploadUrl: `https://blob.vercel-storage.com/${args.pathname}?token=${token}`,
    pathname: args.pathname,
    contentType: args.contentType,
  };
}
