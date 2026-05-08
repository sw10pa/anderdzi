import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "@/idl/anderdzi.json";
import type { Anderdzi } from "@/idl/anderdzi";
import { PROGRAM_ID } from "./constants";
import type { Vault } from "@/lib/mock";

const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);

export function deriveVaultPda(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_PUBKEY,
  );
  return pda;
}

export async function fetchVault(connection: Connection, owner: PublicKey): Promise<Vault | null> {
  try {
    const provider = new AnchorProvider(connection, {} as never, { commitment: "confirmed" });
    const program = new Program<Anderdzi>(idl as Anderdzi, provider);
    const vaultPda = deriveVaultPda(owner);
    const raw = await program.account.vault.fetch(vaultPda);
    const now = Math.floor(Date.now() / 1000);

    const inactivitySec = Number(raw.inactivityPeriod);
    const graceSec = Number(raw.gracePeriod);
    const lastHeartbeat = Number(raw.lastHeartbeat);
    const triggeredAt = raw.triggeredAt ? Number(raw.triggeredAt) : null;

    const secondsUntilTrigger = lastHeartbeat + inactivitySec - now;
    const daysUntilTrigger = Math.max(0, Math.ceil(secondsUntilTrigger / 86400));
    const graceRemainingDays = triggeredAt
      ? Math.max(0, Math.ceil((triggeredAt + graceSec - now) / 86400))
      : undefined;

    let status: Vault["status"] = "ACTIVE";
    if (triggeredAt !== null) {
      status = now >= triggeredAt + graceSec ? "DISTRIBUTED" : "TRIGGERED";
    }

    return {
      address: vaultPda.toBase58(),
      status,
      inactivityPeriodDays: Math.round(inactivitySec / 86400),
      daysUntilTrigger,
      gracePeriodDays: Math.round(graceSec / 86400),
      graceRemainingDays,
      lastSeenDays: Math.floor((now - lastHeartbeat) / 86400),
      deposited: Number(raw.totalDeposited) / LAMPORTS_PER_SOL,
      yield: 0,
      beneficiaries: raw.beneficiaries.map((b) => ({
        address: b.wallet.toBase58(),
        percentage: Math.round(b.shareBps / 100),
      })),
      watcherEnabled: raw.watcherEnabled,
      stakingEnabled: raw.stakingEnabled,
      telegramEnabled: false,
    };
  } catch {
    return null;
  }
}
