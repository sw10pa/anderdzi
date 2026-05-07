import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import type { Anderdzi } from "@/idl/anderdzi";
import { deriveVaultPda } from "./accounts";
import { PROGRAM_ID } from "./constants";
import type { Beneficiary } from "./mock";

const TREASURY_PUBKEY = PublicKey.findProgramAddressSync(
  [Buffer.from("treasury")],
  new PublicKey(PROGRAM_ID)
)[0];

function toBeneficiaryArg(b: Beneficiary) {
  return {
    wallet: new PublicKey(b.address),
    shareBps: b.percentage * 100,
  };
}

export async function createVault(
  program: Program<Anderdzi>,
  owner: PublicKey,
  params: {
    inactivityDays: number;
    graceDays: number;
    depositSol: number;
    stakingEnabled: boolean;
    enableWatcher: boolean;
    beneficiaries: Beneficiary[];
  }
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  const inactivityPeriod = new BN(params.inactivityDays * 86400);
  const gracePeriod = new BN(params.graceDays * 86400);
  const depositAmount = new BN(Math.floor(params.depositSol * LAMPORTS_PER_SOL));

  return program.methods
    .createVault(
      params.enableWatcher,
      inactivityPeriod,
      gracePeriod,
      depositAmount,
      params.stakingEnabled,
      params.beneficiaries.map(toBeneficiaryArg)
    )
    .accounts({
      vault: vaultPda,
      owner,
      treasury: TREASURY_PUBKEY,
    })
    .rpc();
}

export async function deposit(
  program: Program<Anderdzi>,
  owner: PublicKey,
  amountSol: number
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .deposit(new BN(Math.floor(amountSol * LAMPORTS_PER_SOL)))
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function withdraw(
  program: Program<Anderdzi>,
  owner: PublicKey,
  amountSol: number
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .withdraw(new BN(Math.floor(amountSol * LAMPORTS_PER_SOL)))
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function ping(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .ping()
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function cancelTrigger(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .cancelTrigger()
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function closeVault(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .closeVault()
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function updateBeneficiaries(
  program: Program<Anderdzi>,
  owner: PublicKey,
  beneficiaries: Beneficiary[]
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .updateBeneficiaries(beneficiaries.map(toBeneficiaryArg))
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function optInWatcher(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .optInWatcher()
    .accounts({ vault: vaultPda, owner, treasury: TREASURY_PUBKEY })
    .rpc();
}

export async function optOutWatcher(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .optOutWatcher()
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function enableStaking(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .enableStaking()
    .accounts({ vault: vaultPda, owner })
    .rpc();
}

export async function disableStaking(
  program: Program<Anderdzi>,
  owner: PublicKey
): Promise<string> {
  const vaultPda = deriveVaultPda(owner);
  return program.methods
    .disableStaking()
    .accounts({ vault: vaultPda, owner })
    .rpc();
}
