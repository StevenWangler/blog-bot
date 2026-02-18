import { buildImageNode, buildRichContentFromMarkdown } from "./rich-content.js";

export function buildDraftPostPayload(
  title: string,
  markdown: string,
  excerpt: string,
  language: string,
  memberId: string,
  heroImageUrl?: string,
  categoryIds: string[] = [],
  tagIds: string[] = []
): Record<string, unknown> {
  const richContent = buildRichContentFromMarkdown(markdown);
  if (heroImageUrl) {
    (richContent.nodes as Array<Record<string, unknown>>).unshift(buildImageNode(heroImageUrl));
  }
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
      heroImage: heroImageUrl
        ? {
            type: "SITE",
            siteData: { url: heroImageUrl },
          }
        : undefined,
    },
    fieldsets: ["URL", "RICH_CONTENT", "COVER_MEDIA"],
  };
}
