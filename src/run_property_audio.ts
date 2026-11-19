import { InfraiPropertyService } from "./property_audio_service.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");

const service = new InfraiPropertyService(key);
await service.createBucket("property-audio");
const uploadUrl = await service.prepareAudioUpload("property-audio", "unit-4b-2026-10-23.mp3");
const workOrder = await service.classifyRequest({
  tenantName: "Mina Chen",
  propertyAddress: "14 Cedar Lane, Unit 4B",
  transcript: "There is water leaking under the kitchen sink and the cabinet is getting wet.",
});

console.log(JSON.stringify({ uploadUrl, workOrder }, null, 2));
