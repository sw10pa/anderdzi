import { MOCK_ENABLED } from "@/lib/mock";
import { useMockStore } from "./useMockStore";
import { useVaultStore } from "./useVaultStore";

export const useStore = MOCK_ENABLED ? useMockStore : useVaultStore;
