import { WixClient } from "./client.js";
import { wixFetch } from "./http.js";

export type DraftPostResponse = {
  draftPost?: {
    id: string;
    title?: string;
    url?: string;
    heroImage?: {
      type?: string;
      siteData?: { url?: string };
    };
    coverMedia?: {
      mediaId?: string;
      url?: string;
    };
  };
};

export type PublishResponse = {
  postId: string;
};

export async function createDraftPost(
  client: WixClient,
  payload: Record<string, unknown>
): Promise<DraftPostResponse> {
  return wixFetch<DraftPostResponse>(client, "https://www.wixapis.com/blog/v3/draft-posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function publishDraftPost(
  client: WixClient,
  draftPostId: string
): Promise<PublishResponse> {
  return wixFetch<PublishResponse>(
    client,
    `https://www.wixapis.com/blog/v3/draft-posts/${draftPostId}/publish`,
    { method: "POST" }
  );
}
