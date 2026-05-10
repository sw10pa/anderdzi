export const PROGRAM_ID = "HqAguZH2aj1sSc4Zi6Ck1MBV1bpz1z4cyZUnYT3bTztN";
export const BOT_API_URL = import.meta.env.VITE_BOT_API_URL ?? "";

const RPC_URL = import.meta.env.VITE_RPC_URL ?? "";
export const STAKING_ENABLED = !RPC_URL.includes("devnet");
