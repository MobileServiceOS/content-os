// Higgsfield video generation broker. Submits a generation to the Higgsfield
// platform API, polls for completion, and returns the rendered video URL.
// Credentials live in Functions secrets — never in the browser.
//
// Higgsfield REST contract (https://docs.higgsfield.ai):
//   Auth:    Authorization: Key {keyId}:{keySecret}   (HIGGSFIELD_CREDENTIALS = "keyId:keySecret")
//   Submit:  POST {BASE}/{modelId}  body { prompt, aspect_ratio, resolution, duration?, image_url? }
//            -> { request_id, status: "queued" }
//   Poll:    GET  {BASE}/requests/{request_id}/status
//            -> { status: queued|in_progress|completed|failed|nsfw, video?: { url } }
//
// Config (env, with sensible defaults):
//   HIGGSFIELD_BASE_URL    default https://platform.higgsfield.ai
//   HIGGSFIELD_VIDEO_MODEL default higgsfield-ai/dop/standard
//   HIGGSFIELD_RESOLUTION  default 720p

export interface VideoBrokerResult {
  videoUrl: string;
  posterUrl?: string;
  durationSeconds?: number;
  predictedViralScore?: number; // not provided by the REST API today (virality is a dashboard)
}

interface StatusJson {
  status?: string;
  request_id?: string;
  video?: { url?: string };
  poster?: { url?: string };
  error?: string;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function generateVideoBroker(
  credentials: string,
  prompt: string,
  durationSeconds: number,
  aspectRatio: string,
  imageUrl?: string,
): Promise<VideoBrokerResult> {
  if (!credentials || !credentials.includes(':')) {
    throw new Error('Video generation is not configured (set HIGGSFIELD_CREDENTIALS = "keyId:keySecret").');
  }
  const base = (process.env.HIGGSFIELD_BASE_URL || 'https://platform.higgsfield.ai').replace(/\/$/, '');
  const modelId = process.env.HIGGSFIELD_VIDEO_MODEL || 'higgsfield-ai/dop/standard';
  const resolution = process.env.HIGGSFIELD_RESOLUTION || '720p';
  const headers = { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' };

  const body: Record<string, unknown> = { prompt, aspect_ratio: aspectRatio, resolution, duration: durationSeconds };
  if (imageUrl) body.image_url = imageUrl;

  const submit = await fetch(`${base}/${modelId}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!submit.ok) throw new Error(`Higgsfield submit error ${submit.status}: ${await submit.text()}`);
  const submitted = (await submit.json()) as StatusJson;
  const requestId = submitted.request_id;
  if (!requestId) throw new Error('Higgsfield did not return a request_id.');

  // Poll status until terminal (up to ~3 min, within the 300s function timeout).
  let job = submitted;
  for (let i = 0; i < 58 && job.status !== 'completed'; i++) {
    if (job.status && /fail|error|nsfw/i.test(job.status)) {
      throw new Error(`Higgsfield job ${job.status}${job.error ? `: ${job.error}` : ''}.`);
    }
    await sleep(3000);
    const poll = await fetch(`${base}/requests/${requestId}/status`, { headers });
    if (!poll.ok) continue;
    job = (await poll.json()) as StatusJson;
  }

  const videoUrl = job.video?.url;
  if (!videoUrl) throw new Error('Higgsfield generation did not complete in time.');
  return {
    videoUrl,
    posterUrl: job.poster?.url,
    durationSeconds,
  };
}
