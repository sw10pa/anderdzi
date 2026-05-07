import pkg from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Anderdzi } from "../target/types/anderdzi";

const { AnchorProvider, Program, Wallet, BN } = pkg;

const RPC_URL = process.env.RPC_URL ?? "http://localhost:8899";
const KEYPAIR_PATH = process.env.KEYPAIR_PATH ?? `${process.env.HOME}/.config/solana/id.json`;

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const rawKeypair = JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"));
  const authority = Keypair.fromSecretKey(Uint8Array.from(rawKeypair));
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = JSON.parse(
    readFileSync(resolve(process.cwd(), "target/idl/anderdzi.json"), "utf8")
  );
  const program = new Program<Anderdzi>(idl, provider);

  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  try {
    const existing = await program.account.treasury.fetch(treasuryPda);
    console.log("Treasury already initialized.");
    console.log("  Authority:", existing.authority.toBase58());
    console.log("  Treasury PDA:", treasuryPda.toBase58());
    return;
  } catch {
    // not initialized yet, proceed
  }

  console.log("Initializing treasury...");
  const tx = await program.methods
    .initializeTreasury(null)
    .accounts({ authority: authority.publicKey })
    .rpc();

  console.log("Treasury initialized.");
  console.log("  Tx:", tx);
  console.log("  Authority:", authority.publicKey.toBase58());
  console.log("  Treasury PDA:", treasuryPda.toBase58());
}

main().catch((e) => { console.error(e); process.exit(1); });
