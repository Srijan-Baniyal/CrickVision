import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { downloadUrl } from "@/lib/inngest/functions/download-url";
import { handleDelivery } from "@/lib/inngest/functions/persist-delivery";
import { processImage } from "@/lib/inngest/functions/process-image";
import { processMatch } from "@/lib/inngest/functions/process-match";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processMatch, downloadUrl, processImage, handleDelivery],
});
