import { WixClient } from "./client.js";
import { wixFetch } from "./http.js";

type UploadUrlResponse = {
  uploadUrl: string;
};

type UploadResult = {
  file?: {
    id?: string;
    url?: string;
    mediaType?: string;
    operationStatus?: string;
  };
};

export async function generateUploadUrl(
  client: WixClient,
  fileName: string,
  mimeType: string
): Promise<string> {
  const response = await wixFetch<UploadUrlResponse>(
    client,
    "https://www.wixapis.com/site-media/v1/files/generate-upload-url",
    {
      method: "POST",
      body: JSON.stringify({ fileName, mimeType }),
    }
  );
  if (!response.uploadUrl) {
    throw new Error("Wix did not return an upload URL.");
  }
  return response.uploadUrl;
}

export async function uploadImageFromBase64(
  client: WixClient,
  fileName: string,
  base64: string,
  mimeType: string
): Promise<{ fileId?: string; url?: string }> {
  const uploadUrl = await generateUploadUrl(client, fileName, mimeType);
  const buffer = Buffer.from(base64, "base64");
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: buffer,
  });
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`Wix upload failed: ${uploadResponse.status} ${text}`);
  }
  let result: UploadResult | undefined;
  try {
    result = (await uploadResponse.json()) as UploadResult;
  } catch {
    result = undefined;
  }
  const output: { fileId?: string; url?: string } = {};
  if (result?.file?.id) {
    output.fileId = result.file.id;
  }
  if (result?.file?.url) {
    output.url = result.file.url;
  }
  return output;
}
