"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ballTypeSchema, shotTypeSchema } from "@/lib/cv/schema";
import { db } from "@/lib/db";
import { deliveryCorrections } from "@/lib/db/schema/deliveryCorrections";
import { rateLimitCorrectionSubmit } from "@/lib/rate-limit";

const optionalBallType = z
  .union([ballTypeSchema, z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));
const optionalShotType = z
  .union([shotTypeSchema, z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const formSchema = z.object({
  ballType: optionalBallType,
  shotType: optionalShotType,
  note: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function submitCorrectionAction(
  deliveryId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireSession();

    const crl = await rateLimitCorrectionSubmit(session.userId);
    if (!crl.ok) {
      return {
        ok: false,
        error: "Too many corrections. Please wait before submitting again.",
      };
    }

    const parsed = formSchema.safeParse({
      ballType: formData.get("ballType")?.toString() ?? "",
      shotType: formData.get("shotType")?.toString() ?? "",
      note: formData.get("note")?.toString() ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: "Invalid input" };
    }
    const { ballType, shotType, note } = parsed.data;
    const corrections: { fieldName: string; correctedValue: unknown }[] = [];
    if (ballType) {
      corrections.push({ fieldName: "ballType", correctedValue: ballType });
    }
    if (shotType) {
      corrections.push({ fieldName: "shotType", correctedValue: shotType });
    }
    if (corrections.length === 0) {
      return { ok: false, error: "Pick at least one field to correct" };
    }
    await db.insert(deliveryCorrections).values(
      corrections.map((c) => ({
        deliveryId,
        userId: session.userId,
        fieldName: c.fieldName,
        correctedValue: c.correctedValue,
        note,
      }))
    );
    revalidatePath("/matches");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
