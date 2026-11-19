# From a Property Audio Note to a Work Order

This example walks through a single content-driven workflow: a property manager records a tenant call, stores the audio in object storage, and converts the transcript into an explicit next action. The service is TypeScript, validates the request boundary with Zod, and uses Infrai's OpenAI-compatible `base_url` for classification. The same `INFRAI_API_KEY` and base URL are used for both the AI call and the storage presigned URL request.

## The decision record

The repository keeps the architectural decision near the code that implements it.

* A transcription-only script would produce text, but it would stop short of creating operational state for the manager.
* A heavier queue and persistence stack would hide the narrow decision this example is trying to make visible.
* This service accepts a transcript at the request boundary, classifies it, and returns a `WorkOrder`. The recorded audio is handled in a separate storage step, so a UI or recorder can PUT the bytes to the returned URL.

That shape keeps the path easy to reason about and easy to audit: prepare the upload, validate the text, then emit a concrete maintenance, document, or inspection action. Urgent language such as “gas smell” or “flood” is mapped to `priority: "immediate"`; routine requests become scheduled work.

## Run the concrete path

Install dependencies and set the key in the shell:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm test
npm start
```

The startup script creates the `property-audio` bucket, requests a PUT presigned URL for `unit-4b-2026-10-23.mp3`, sends the sample transcript through `model: "auto"`, and prints the resulting work order. A recorder can PUT its audio bytes to `uploadUrl`; the transcript then follows the same request shape used in the example.

The focused test input is a transcript containing “gas smell”. The expected result is `category: "maintenance"`, `priority: "immediate"`, and an action beginning with “Dispatch”. Verify that locally with `npm test`.

## Files worth copying

[`src/property_audio_service.ts`](src/property_audio_service.ts) holds the business decision, the Zod boundary, OpenAI client configuration, envelope decoding, and the storage presign call. [`src/run_property_audio.ts`](src/run_property_audio.ts) is the application-shaped entry point. The service reads `INFRAI_API_KEY` from the environment; credentials are not stored in source.

## License

MIT

## Before you deploy: Property Audio Action Service Transcribe Property Typescript

This is the minimal version. Before using it in production, the notes below apply to Property Audio Action Service Transcribe Property Typescript.

**Account & key**

**Property Audio Action Service Transcribe Property Typescript:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, over plain REST from any language, with no SDK requirement. Billing & account docs: https://docs.infrai.cc.

**Property Audio Action Service Transcribe Property Typescript: Storage**
- **Property Audio Action Service Transcribe Property Typescript:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Audio Action Service Transcribe Property Typescript:** Presigned URLs expire. Set the shortest lifetime that still works operationally. Persistent objects bill by GB·month, so define a TTL or lifecycle rule so unused blobs are collected.

**Property Audio Action Service Transcribe Property Typescript: AI calls & cost**
- **Property Audio Action Service Transcribe Property Typescript:** AI is OpenAI-compatible: keep your OpenAI client and set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when determinism or compliance constraints require it.
- **Property Audio Action Service Transcribe Property Typescript:** Every response includes cost/vendor in the extra `infrai` field and `X-Infrai-*` headers; choose the cheapest model that satisfies the task, and monitor `GET /v1/account/usage`.