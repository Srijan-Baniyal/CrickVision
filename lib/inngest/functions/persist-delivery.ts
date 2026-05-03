import { deliverySchema } from "@/lib/cv/schema";
import { inngest } from "../client";
import { cvDeliveryExtracted, deliveryPersisted } from "../events";
import { persistDelivery } from "../persistDelivery";

export const handleDelivery = inngest.createFunction(
  {
    id: "persist-delivery",
    name: "Persist delivery from CV",
    retries: 4,
    concurrency: { limit: 8 },
    triggers: [cvDeliveryExtracted],
  },
  async ({ event, step }) => {
    const payload = await step.run("validate", async () =>
      deliverySchema.parse(event.data.delivery)
    );

    const result = await step.run("upsert", async () =>
      persistDelivery(payload)
    );

    await step.sendEvent("notify-ui", {
      ...deliveryPersisted.create({
        matchId: payload.matchId,
        deliveryId: result.deliveryId,
      }),
    });

    return result;
  }
);
