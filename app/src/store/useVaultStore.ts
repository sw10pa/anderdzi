import { create } from "zustand";
import { toast } from "sonner";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import type { Anderdzi } from "@/idl/anderdzi";
import { fetchVault } from "@/lib/accounts";
import * as ix from "@/lib/instructions";
import { BOT_API_URL } from "@/lib/constants";
import type { Beneficiary, Vault } from "@/lib/mock";
import bs58 from "bs58";

type State = {
  connected: boolean;
  walletAddress: string | null;
  vault: Vault | null;
  busy: string | null;
};

type Actions = {
  connect: (pubkey: PublicKey, connection: Connection) => Promise<void>;
  disconnect: () => void;
  imAlive: (program: Program<Anderdzi>, owner: PublicKey, connection: Connection) => Promise<void>;
  cancelTrigger: (program: Program<Anderdzi>, owner: PublicKey, connection: Connection) => Promise<void>;
  closeVault: (program: Program<Anderdzi>, owner: PublicKey) => Promise<void>;
  deposit: (program: Program<Anderdzi>, owner: PublicKey, amount: number, connection: Connection) => Promise<void>;
  withdraw: (program: Program<Anderdzi>, owner: PublicKey, amount: number, connection: Connection) => Promise<void>;
  saveBeneficiaries: (program: Program<Anderdzi>, owner: PublicKey, beneficiaries: Beneficiary[], connection: Connection) => Promise<void>;
  setToggle: (program: Program<Anderdzi>, owner: PublicKey, key: "watcherEnabled" | "stakingEnabled", val: boolean, connection: Connection) => Promise<void>;
  connectTelegram: (chatId: string, vaultAddress: string, signMessage: (msg: Uint8Array) => Promise<Uint8Array>, ownerPubkey: string) => Promise<void>;
  disconnectTelegram: (chatId: string, vaultAddress: string, signMessage: (msg: Uint8Array) => Promise<Uint8Array>, ownerPubkey: string) => Promise<void>;
  createVault: (
    program: Program<Anderdzi>,
    owner: PublicKey,
    connection: Connection,
    data: { inactivityDays: number; graceDays: number; deposit: number; staking: boolean; watcher: boolean; beneficiaries: Beneficiary[] }
  ) => Promise<void>;
};

async function refreshVault(connection: Connection, owner: PublicKey, set: (s: Partial<State>) => void) {
  const vault = await fetchVault(connection, owner);
  set({ vault });
}

async function runTx(
  label: string,
  busy: string,
  set: (s: Partial<State>) => void,
  fn: () => Promise<string>
) {
  set({ busy });
  try {
    await fn();
    toast.success("Transaction confirmed ✓", { description: label });
  } catch (e: unknown) {
    console.error(`[${label}] Transaction failed:`, e);
    const msg = e instanceof Error ? e.message : String(e);
    toast.error("Transaction failed", { description: msg.slice(0, 200) });
  } finally {
    set({ busy: null });
  }
}

export const useVaultStore = create<State & Actions>((set, get) => ({
  connected: false,
  walletAddress: null,
  vault: null,
  busy: null,

  connect: async (pubkey, connection) => {
    set({ connected: true, walletAddress: pubkey.toBase58() });
    const vault = await fetchVault(connection, pubkey);
    set({ vault });
  },

  disconnect: () => set({ connected: false, walletAddress: null, vault: null }),

  imAlive: async (program, owner, connection) => {
    await runTx("I'm Alive — timer reset", "imAlive", set, () => ix.ping(program, owner));
    await refreshVault(connection, owner, set);
  },

  cancelTrigger: async (program, owner, connection) => {
    await runTx("Trigger canceled", "cancel", set, () => ix.cancelTrigger(program, owner));
    await refreshVault(connection, owner, set);
  },

  closeVault: async (program, owner) => {
    await runTx("Vault closed", "close", set, () => ix.closeVault(program, owner));
    set({ vault: null });
  },

  deposit: async (program, owner, amount, connection) => {
    await runTx(`Deposited ${amount} SOL`, "deposit", set, () => ix.deposit(program, owner, amount));
    await refreshVault(connection, owner, set);
  },

  withdraw: async (program, owner, amount, connection) => {
    await runTx(`Withdrew ${amount} SOL`, "withdraw", set, () => ix.withdraw(program, owner, amount));
    await refreshVault(connection, owner, set);
  },

  saveBeneficiaries: async (program, owner, beneficiaries, connection) => {
    await runTx("Beneficiaries updated", "beneficiaries", set, () =>
      ix.updateBeneficiaries(program, owner, beneficiaries)
    );
    await refreshVault(connection, owner, set);
  },

  setToggle: async (program, owner, key, val, connection) => {
    const label = `${key === "watcherEnabled" ? "Watcher" : "Staking"} ${val ? "enabled" : "disabled"}`;
    if (key === "watcherEnabled") {
      await runTx(label, key, set, () =>
        val ? ix.optInWatcher(program, owner) : ix.optOutWatcher(program, owner)
      );
    } else {
      await runTx(label, key, set, () =>
        val ? ix.enableStaking(program, owner) : ix.disableStaking(program, owner)
      );
    }
    await refreshVault(connection, owner, set);
  },

  connectTelegram: async (chatId, vaultAddress, signMessage, ownerPubkey) => {
    set({ busy: "telegram" });
    try {
      const message = `Connect Telegram ${chatId} to vault ${vaultAddress}`;
      const encoded = new TextEncoder().encode(message);
      const sig = await signMessage(encoded);
      const res = await fetch(`${BOT_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault_pubkey: vaultAddress,
          chat_id: Number(chatId),
          message,
          signature: bs58.encode(sig),
          owner_pubkey: ownerPubkey,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const v = get().vault;
      if (v) set({ vault: { ...v, telegramEnabled: true, telegramChatId: chatId } });
      toast.success("Telegram connected ✓");
    } catch (e: unknown) {
      console.error("[connectTelegram] failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Failed to connect Telegram", { description: msg.slice(0, 200) });
    } finally {
      set({ busy: null });
    }
  },

  disconnectTelegram: async (chatId, vaultAddress, signMessage, ownerPubkey) => {
    set({ busy: "telegram" });
    try {
      const message = `Connect Telegram ${chatId} to vault ${vaultAddress}`;
      const encoded = new TextEncoder().encode(message);
      const sig = await signMessage(encoded);
      const res = await fetch(`${BOT_API_URL}/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vault_pubkey: vaultAddress,
          chat_id: Number(chatId),
          message,
          signature: bs58.encode(sig),
          owner_pubkey: ownerPubkey,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const v = get().vault;
      if (v) set({ vault: { ...v, telegramEnabled: false, telegramChatId: undefined } });
      toast.success("Telegram disconnected");
    } catch (e: unknown) {
      console.error("[disconnectTelegram] failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Failed to disconnect Telegram", { description: msg.slice(0, 200) });
    } finally {
      set({ busy: null });
    }
  },

  createVault: async (program, owner, connection, data) => {
    await runTx("Vault created", "create", set, () =>
      ix.createVault(program, owner, {
        inactivityDays: data.inactivityDays,
        graceDays: data.graceDays,
        depositSol: data.deposit,
        stakingEnabled: data.staking,
        enableWatcher: data.watcher,
        beneficiaries: data.beneficiaries,
      })
    );
    await refreshVault(connection, owner, set);
  },
}));
