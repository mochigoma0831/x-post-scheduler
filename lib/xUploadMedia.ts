import { TwitterApi } from "twitter-api-v2";

export async function uploadImageToX(
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`画像取得失敗: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const client = new TwitterApi(accessToken);

  const mediaId = await client.v1.uploadMedia(buffer, {
    mimeType: response.headers.get("content-type") ?? "image/jpeg",
  });

  return mediaId;
}