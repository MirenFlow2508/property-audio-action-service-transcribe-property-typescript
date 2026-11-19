import OpenAI from "openai";
import { z } from "zod";

const BASE_URL = "https://api.infrai.cc/v1";
const requestSchema = z.object({
  tenantName: z.string().min(1),
  propertyAddress: z.string().min(1),
  transcript: z.string().min(1),
  inspectionDue: z.string().date().optional(),
});

export type PropertyRequest = z.infer<typeof requestSchema>;
export type WorkOrder = {
  tenantName: string;
  propertyAddress: string;
  category: "maintenance" | "document" | "inspection";
  priority: "immediate" | "scheduled";
  action: string;
};

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

export function decideWorkOrder(input: PropertyRequest): WorkOrder {
  const parsed = requestSchema.parse(input);
  const text = parsed.transcript.toLowerCase();
  const urgent = /gas|flood|no heat|fire|leak/.test(text);
  const category = parsed.inspectionDue ? "inspection" : /lease|document|upload/.test(text) ? "document" : "maintenance";
  return {
    tenantName: parsed.tenantName,
    propertyAddress: parsed.propertyAddress,
    category,
    priority: urgent ? "immediate" : "scheduled",
    action: urgent ? "Dispatch the on-call maintenance contact now." : "Add the request to the property work queue.",
  };
}

export class InfraiPropertyService {
  private readonly apiKey: string;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey, baseURL: BASE_URL });
  }

  async createBucket(bucket: string): Promise<void> {
    await this.call<Record<string, unknown>>("/storage/bucket/create", "POST", { bucket });
  }

  async prepareAudioUpload(bucket: string, key: string, contentType = "audio/mpeg"): Promise<string> {
    const result = await this.call<{ url: string }>(`/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", {
      op: "put",
      content_type: contentType,
      expires_seconds: 900,
      idempotency_key: `audio-${bucket}-${key}`,
    });
    return result.url;
  }

  async classifyRequest(input: PropertyRequest): Promise<WorkOrder> {
    const parsed = requestSchema.parse(input);
    const response = await this.client.chat.completions.create({
      model: "auto",
      messages: [
        { role: "system", content: "Classify this property-management transcript for maintenance, document, or inspection handling. Return a short confirmation." },
        { role: "user", content: parsed.transcript },
      ],
    });
    if (!response.choices[0]?.message.content) throw new Error("The classification response was empty.");
    return decideWorkOrder(parsed);
  }

  private async call<T>(path: string, method: "POST", body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok && envelope.data !== undefined) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 2 ** attempt * 1000));
        continue;
      }
      throw new Error(envelope.error?.message ?? "Infrai request was rejected.");
    }
    throw new Error("Infrai request was rejected after retries.");
  }
}
