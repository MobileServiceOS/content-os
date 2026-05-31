// OpenAI Images caller. Returns a base64 PNG + dimensions.
import OpenAI from 'openai';

const MODEL = process.env.CONTENT_OS_IMAGE_MODEL || 'gpt-image-1';

// gpt-image-1 supported sizes mapped from the client's aspect ratios.
const SIZE_FOR: Record<string, string> = {
  '1:1': '1024x1024',
  '4:5': '1024x1536',
  '9:16': '1024x1536',
  '16:9': '1536x1024',
};

export async function generateImageOpenAI(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
): Promise<{ b64: string; width: number; height: number }> {
  const client = new OpenAI({ apiKey });
  const size = SIZE_FOR[aspectRatio] ?? '1024x1024';
  const res = await client.images.generate({ model: MODEL, prompt, size: size as never, n: 1 });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('Image provider returned no image data.');
  const [width, height] = size.split('x').map(Number);
  return { b64, width, height };
}
