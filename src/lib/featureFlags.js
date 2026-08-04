// Toggle multi-clan mode and clan names via .env.local (no code push needed)
export const MULTI_CLAN_MODE = process.env.NEXT_PUBLIC_MULTI_CLAN_MODE === "true";
export const CLAN_PRIMARY   = process.env.NEXT_PUBLIC_CLAN_PRIMARY   || "sentinel";
export const CLAN_SECONDARY = process.env.NEXT_PUBLIC_CLAN_SECONDARY || "scourge";
