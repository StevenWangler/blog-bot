export function buildRichContentFromMarkdown(markdown: string): Record<string, unknown> {
  const paragraphs = markdown.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const nodes = paragraphs.map((text) => ({
    type: "PARAGRAPH",
    nodes: [
      {
        type: "TEXT",
        nodes: [],
        textData: { text, decorations: [] },
      },
    ],
    paragraphData: { textStyle: { textAlignment: "AUTO" }, indentation: 0 },
  }));
  return { nodes };
}

export function buildImageNode(url: string): Record<string, unknown> {
  return {
    type: "IMAGE",
    nodes: [],
    imageData: {
      type: "SITE",
      siteData: { url },
    },
  };
}
