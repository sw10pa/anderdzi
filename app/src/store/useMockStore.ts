import { create } from "zustand";
import { toast } from "sonner";
import {
  mockVaultActive,
  mockVaultTriggered,
  mockVaultNoStaking,
  mockWalletAddress,
  type Beneficiary,
  type Vault,
  type VaultStateKey,
} from "@/lib/mock";

type State = {
  connected: boolean;
  walletAddress: string | null;
  vaultState: VaultStateKey;
  vault: Vault | null;
  busy: string | null;
};

type Actions = {
  connect: () => void;
  disconnect: () => void;
  setVaultState: (s: VaultStateKey) => void;
  imAlive: () => Promise<void>;
  cancelTrigger: () => Promise<void>;
  closeVault: () => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  saveBeneficiaries: (b: Beneficiary[]) => Promise<void>;
  setToggle: (key: "watcherEnabled" | "stakingEnabled" | "telegramEnabled", v: boolean) => Promise<void>;
  connectTelegram: (chatId: string) => Promise<void>;
  createVault: (data: { inactivityDays: number; graceDays: number; deposit: number; staking: boolean; watcher?: boolean; telegram?: boolean; beneficiaries: Beneficiary[] }) => Promise<void>;
};

function vaultFor(state: VaultStateKey): Vault | null {
  switch (state) {
    case "ACTIVE": return { ...mockVaultActive, beneficiaries: [...mockVaultActive.beneficiaries] };
    case "TRIGGERED": return { ...mockVaultTriggered, beneficiaries: [...mockVaultTriggered.beneficiaries] };
    case "NO_STAKING": return { ...mockVaultNoStaking, beneficiaries: [...mockVaultNoStaking.beneficiaries] };
    case "NO_VAULT": return null;
    case "DISCONNECTED": return null;
  }
}

const fakeTx = (label: string) =>
  new Promise<string>((resolve) => {
    setTimeout(() => {
      toast.success("Transaction confirmed ✓", { description: label });
      resolve("MockSig" + Math.random().toString(36).slice(2, 10));
    }, 1200);
  });

export const useMockStore = create<State & Actions>((set, get) => ({
  connected: false,
  walletAddress: null,
  vaultState: "ACTIVE",
  vault: vaultFor("ACTIVE"),
  busy: null,

  connect: () => set({ connected: true, walletAddress: mockWalletAddress }),
  disconnect: () => set({ connected: false, walletAddress: null, vaultState: "DISCONNECTED", vault: null }),

  setVaultState: (s) => {
    const connected = s !== "DISCONNECTED";
    set({
      vaultState: s,
      vault: vaultFor(s),
      connected,
      walletAddress: connected ? mockWalletAddress : null,
    });
  },

  imAlive: async () => {
    set({ busy: "imAlive" });
    await fakeTx("I'm Alive — countdown reset");
    const v = get().vault;
    if (v) set({ vault: { ...v, daysUntilTrigger: v.inactivityPeriodDays, lastSeenDays: 0, status: "ACTIVE", graceRemainingDays: undefined } });
    set({ busy: null });
  },
  cancelTrigger: async () => {
    set({ busy: "cancel" });
    await fakeTx("Trigger canceled");
    const v = get().vault;
    if (v) set({ vault: { ...v, status: "ACTIVE", daysUntilTrigger: v.inactivityPeriodDays, lastSeenDays: 0, graceRemainingDays: undefined } });
    set({ busy: null });
  },
  closeVault: async () => {
    set({ busy: "close" });
    await fakeTx("Vault closed");
    set({ vault: null, vaultState: "NO_VAULT", busy: null });
  },
  deposit: async (amount) => {
    set({ busy: "deposit" });
    await fakeTx(`Deposited ${amount} SOL`);
    const v = get().vault;
    if (v) set({ vault: { ...v, deposited: v.deposited + amount } });
    set({ busy: null });
  },
  withdraw: async (amount) => {
    set({ busy: "withdraw" });
    await fakeTx(`Withdrew ${amount} SOL`);
    const v = get().vault;
    if (v) set({ vault: { ...v, deposited: Math.max(0, v.deposited - amount) } });
    set({ busy: null });
  },
  saveBeneficiaries: async (b) => {
    set({ busy: "beneficiaries" });
    await fakeTx("Beneficiaries updated");
    const v = get().vault;
    if (v) set({ vault: { ...v, beneficiaries: b } });
    set({ busy: null });
  },
  setToggle: async (key, val) => {
    set({ busy: key });
    await fakeTx(`${key} ${val ? "enabled" : "disabled"}`);
    const v = get().vault;
    if (v) set({ vault: { ...v, [key]: val } });
    set({ busy: null });
  },
  connectTelegram: async (chatId) => {
    set({ busy: "telegram" });
    await fakeTx("Telegram connected");
    const v = get().vault;
    if (v) set({ vault: { ...v, telegramEnabled: true, telegramChatId: chatId } });
    set({ busy: null });
  },
  createVault: async (data) => {
    set({ busy: "create" });
    await fakeTx("Vault created");
    const v: Vault = {
      address: "FvAuLT8anderdziNEW9999000011112222",
      status: "ACTIVE",
      inactivityPeriodDays: data.inactivityDays,
      daysUntilTrigger: data.inactivityDays,
      gracePeriodDays: data.graceDays,
      lastSeenDays: 0,
      deposited: data.deposit,
      yield: 0,
      beneficiaries: data.beneficiaries,
      watcherEnabled: data.watcher ?? false,
      stakingEnabled: data.staking,
      telegramEnabled: data.telegram ?? false,
    };
    set({ vault: v, vaultState: "ACTIVE", busy: null, connected: true, walletAddress: mockWalletAddress });
  },
}));