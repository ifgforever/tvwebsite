export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  PHOTOS?: R2Bucket;
  AI_IMAGE_PROVIDER?: string;
  AI_IMAGE_API_KEY?: string;
  AI_IMAGE_MODEL?: string;
  AI_IMAGE_ENDPOINT?: string;
}
