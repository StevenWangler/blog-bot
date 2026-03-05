import { buildImageNode, buildRichContentFromMarkdown } from "./rich-content.js";

export function buildDraftPostPayload(
  title: string,
  markdown: string,
  rawExcerpt: string,
  language: string,
  memberId: string,
  heroImageUrl?: string,
  categoryIds: string[] = [],
  tagIds: string[] = []
): Record<string, unknown> {
  const excerpt = rawExcerpt.length > 500 ? rawExcerpt.slice(0, 497) + "..." : rawExcerpt;
  const richContent = buildRichContentFromMarkdown(markdown);
  return {
    draftPost: {
      title,
      excerpt,
      language,
      memberId,
      commentingEnabled: true,
      categoryIds,
      tagIds,
      richContent,
      coverMedia: heroImageUrl
        ? {
            image: heroImageUrl,
            displayed: true,
          }
        : undefined,
    },
    fieldsets: ["URL", "RICH_CONTENT"],
  };
}
