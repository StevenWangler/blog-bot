import { WixClient } from "./client.js";
import { wixFetch } from "./http.js";

const WIX_BLOG_APP_ID = "14bcded7-0066-7c35-14d7-466cb3f09103";

export type Comment = {
  id: string;
  author?: { memberId?: string; name?: string };
  content?: { richContent?: { nodes?: unknown[] } };
  createdDate?: string;
  parentComment?: { id?: string };
};

export type ListCommentsResponse = {
  comments?: Comment[];
};

export async function createComment(
  client: WixClient,
  postId: string,
  memberId: string,
  richContent: Record<string, unknown>,
  parentCommentId?: string
): Promise<Comment> {
  const payload: Record<string, unknown> = {
    comment: {
      appId: WIX_BLOG_APP_ID,
      contextId: postId,
      resourceId: postId,
      author: { memberId },
      content: { richContent },
      ...(parentCommentId ? { parentComment: { id: parentCommentId } } : {}),
    },
  };
  const response = await wixFetch<{ comment: Comment }>(
    client,
    "https://www.wixapis.com/comments/v1/comments",
    { method: "POST", body: JSON.stringify(payload) }
  );
  return response.comment;
}

export async function listComments(
  client: WixClient,
  postId: string,
  limit = 50
): Promise<ListCommentsResponse> {
  return wixFetch<ListCommentsResponse>(
    client,
    "https://www.wixapis.com/comments/v1/comments/list-by-resource",
    {
      method: "POST",
      body: JSON.stringify({
        resource: { appId: WIX_BLOG_APP_ID, contextId: postId, resourceId: postId },
        paging: { limit },
      }),
    }
  );
}
