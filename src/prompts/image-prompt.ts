export function buildImagePrompt(title: string, style: string, keyPoints: string[]): string {
  const points = keyPoints.slice(0, 4).join(", ");
  return [
    `Create a featured image for a blog post titled "${title}".`,
    `Style: ${style}.`,
    `Key concepts: ${points}.`,
    "No text overlays, no logos, clean composition.",
  ].join(" ");
}
