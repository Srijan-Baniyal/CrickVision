"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FileUploadInput, ingestFileUpload } from "./fileUpload";
import { ingestImage } from "./image";
import type { IngestActionResult } from "./types";
import { ingestUrl } from "./url";

const handle = async (
  fn: () => Promise<IngestActionResult>
): Promise<IngestActionResult> => {
  try {
    return await fn();
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "UNKNOWN",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
};

export async function uploadFileMatchAction(
  input: FileUploadInput
): Promise<IngestActionResult> {
  const result = await handle(() => ingestFileUpload(input));
  if (result.ok) {
    revalidatePath("/dashboard");
    redirect(`/matches/${result.result.matchId}`);
  }
  return result;
}

export async function uploadUrlMatchAction(
  formData: FormData
): Promise<IngestActionResult> {
  const result = await handle(() =>
    ingestUrl({
      title: String(formData.get("title") ?? ""),
      url: String(formData.get("url") ?? ""),
      format:
        (formData.get("format") as "T20" | "ODI" | "Test" | "Highlights") ??
        "Highlights",
    })
  );
  if (result.ok) {
    revalidatePath("/dashboard");
    redirect(`/matches/${result.result.matchId}`);
  }
  return result;
}

export async function uploadImageMatchAction(
  formData: FormData
): Promise<IngestActionResult> {
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "image file required" },
    };
  }
  const result = await handle(() =>
    ingestImage({
      title: String(formData.get("title") ?? ""),
      file,
    })
  );
  if (result.ok) {
    revalidatePath("/dashboard");
    redirect(`/matches/${result.result.matchId}`);
  }
  return result;
}
