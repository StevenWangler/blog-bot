import OpenAI from "openai";

export async function generateImage(
  client: OpenAI,
  model: string,
  prompt: string
): Promise<{ base64: string; mimeType: string }> {
  try {
    return await generateImageWithModel(client, model, prompt);
  } catch (error) {
    if (shouldFallbackToGptImage(error, model)) {
      return generateImageWithModel(client, "gpt-image-1", prompt);
    }
    throw error;
  }
}

async function generateImageWithModel(
  client: OpenAI,
  model: string,
  prompt: string
): Promise<{ base64: string; mimeType: string }> {
  const response = await client.images.generate({ model, prompt, size: "1024x1024" });
  const item = response.data?.[0];
  if (item?.b64_json) {
    return { base64: item.b64_json, mimeType: "image/png" };
  }

  if (item?.url) {
    const imageResponse = await fetch(item.url);
    if (!imageResponse.ok) {
      throw new Error(`OpenAI image generation returned URL fetch failure (${imageResponse.status}).`);
    }
    const mimeType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "image/png";
    const bytes = await imageResponse.arrayBuffer();
    return { base64: Buffer.from(bytes).toString("base64"), mimeType };
  }

  throw new Error("OpenAI image generation did not return image data.");
}

function shouldFallbackToGptImage(error: unknown, model: string): boolean {
  if (model !== "chatgpt-image-latest") return false;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("must be verified") || message.includes("organization");
}
