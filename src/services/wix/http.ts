import { ApiError } from "../../utils/errors.js";
import { WixClient } from "./client.js";

export async function wixFetch<T>(
  client: WixClient,
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: client.token,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`Wix API ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}
