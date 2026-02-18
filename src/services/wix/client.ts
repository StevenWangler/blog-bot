import { AppConfig } from "../../utils/config.js";

export type WixClient = {
  token: string;
  siteId: string;
};

export function createWixClient(config: AppConfig): WixClient {
  return {
    token: config.WIX_API_TOKEN,
    siteId: config.WIX_SITE_ID,
  };
}
