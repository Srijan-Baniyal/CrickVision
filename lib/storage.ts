import { put } from "@vercel/blob";
import { env } from "@/env";

// The only place the rest of the app touches Vercel Blob. To swap providers
// (R2, S3, etc.) change this file — the adapter signatures stay the same.
// See AGENTS.md "Project structure" for the boundary rule.

export interface StoredObject {
  byteSize: number;
  contentType: string;
  pathname: string;
  url: string;
}

export interface PutOptions {
  body: Blob | ArrayBuffer | Buffer | ReadableStream;
  contentType: string;
  pathname: string;
}

function byteLengthOfBody(body: PutOptions["body"]): number {
  if (body instanceof Blob) {
    return body.size;
  }
  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }
  if (body instanceof Buffer) {
    return body.byteLength;
  }
  return 0;
}

export async function putObject(opts: PutOptions): Promise<StoredObject> {
  const blob = await put(opts.pathname, opts.body, {
    access: "public",
    contentType: opts.contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
    allowOverwrite: false,
  });
  const byteSize = byteLengthOfBody(opts.body);
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: opts.contentType,
    byteSize,
  };
}

export interface ClientUploadToken {
  contentType: string;
  pathname: string;
  uploadUrl: string;
}

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
