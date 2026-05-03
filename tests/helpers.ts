import anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Anderdzi } from "../target/types/anderdzi";
import { PublicKey } from "@solana/web3.js";

export const SIX_MONTHS = 15_552_000;
export const SEVEN_DAYS = 604_800;

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
export const program = anchor.workspace.Anderdzi as Program<Anderdzi>;

export function vaultAddress(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    program.programId
  );
  return pda;
}

export function treasuryAddress(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );
  return pda;
}

export async function airdrop(to: PublicKey, lamports: number): Promise<void> {
  const sig = await provider.connection.requestAirdrop(to, lamports);
  await provider.connection.confirmTransaction(sig, "confirmed");
}
