import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { requireSession } from "@/lib/auth";
import { HttpRateLimitError, rateLimitUploadToken } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

// Vercel Blob client-upload handshake. The browser POSTs here once to ask for
// a one-shot upload URL, PUTs to Blob directly, then POSTs again so we can
// persist the URL. See lib/storage.ts for the abstraction this relies on.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload, _multipart) => {
        const session = await requireSession();
        const tokenRl = await rateLimitUploadToken(session.userId);
        if (!tokenRl.ok) {
          throw new HttpRateLimitError(
            "Too many upload handshakes. Please wait a minute and try again.",
            tokenRl
          );
        }
        const isImage =
          pathname.startsWith("matches/") && pathname.includes("/image/");
        return {
          allowedContentTypes: isImage ? ALLOWED_IMAGE : ALLOWED_VIDEO,
          maximumSizeInBytes: isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES,
          tokenPayload: JSON.stringify({
            userId: session.userId,
            clientPayload,
          }),
          token: env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Server Action handles the DB write after the client redirects.
        // No-op here keeps this endpoint stateless.
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof HttpRateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429, headers: err.headers }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload failed" },
      { status: 400 }
    );
  }
}
