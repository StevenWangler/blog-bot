import OpenAI from "openai";
import { z } from "zod";

export async function generateJson<T>(
  client: OpenAI,
  model: string,
  prompt: string,
  schema: z.ZodSchema<T>,
  maxAttempts = 2
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("OpenAI response missing output text.");
      }
      const parsed = tryParseJson(text);
      return schema.parse(parsed);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown JSON generation error.");
    }
  }
  throw lastError ?? new Error("Failed to generate valid JSON output.");
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model output did not contain a JSON object.");
    }
    return JSON.parse(match[0]);
  }
}
