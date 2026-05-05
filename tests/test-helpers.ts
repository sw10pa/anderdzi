import pkg from "@coral-xyz/anchor";
import type { Idl, Program } from "@coral-xyz/anchor";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Anderdzi } from "../target/types/anderdzi";

const { BN, AnchorError } = pkg;

export const IDL = JSON.parse(
  readFileSync(resolve(process.cwd(), "target/idl/anderdzi.json"), "utf8")
) as Idl;

export const SIX_MONTHS = 15_552_000;
export const SEVEN_DAYS = 604_800;

export function createTestEnv() {
  const client = fromWorkspace(".");
  const provider = new LiteSVMProvider(client);
  const program = new pkg.Program(IDL, provider) as Program<Anderdzi>;
  let seq = 0;
  function uniquify() {
    return [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 + ++seq }),
    ];
  }
  return { client, provider, program, uniquify };
}

export function vaultPDA(programId: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    programId
  )[0];
}

export function treasuryPDA(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    programId
  )[0];
}

export { pkg, BN, AnchorError, Keypair, PublicKey, LAMPORTS_PER_SOL };
