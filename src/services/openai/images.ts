import OpenAI from "openai";

export async function generateImage(
  client: OpenAI,
  model: string,
  prompt: string
): Promise<{ base64: string; mimeType: string }> {
  const response = await client.images.generate({
    model,
    prompt,
    size: "1024x1024",
    response_format: "b64_json",
  });
  const item = response.data?.[0];
  if (!item?.b64_json) {
    throw new Error("OpenAI image generation did not return base64 data.");
  }
  return { base64: item.b64_json, mimeType: "image/png" };
}
