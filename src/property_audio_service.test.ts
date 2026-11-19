import assert from "node:assert/strict";
import { decideWorkOrder } from "./property_audio_service.ts";

const result = decideWorkOrder({
  tenantName: "Mina Chen",
  propertyAddress: "14 Cedar Lane, Unit 4B",
  transcript: "There is a gas smell in the kitchen.",
});

assert.equal(result.category, "maintenance");
assert.equal(result.priority, "immediate");
assert.match(result.action, /Dispatch/);
console.log("urgent maintenance decision: passed");
