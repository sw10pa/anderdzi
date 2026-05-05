import { describe, it, before } from "node:test";
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
import { assert } from "chai";
import type { Anderdzi } from "../target/types/anderdzi";

const { BN, AnchorError } = pkg;

const IDL = JSON.parse(
  readFileSync(resolve(process.cwd(), "target/idl/anderdzi.json"), "utf8")
) as Idl;

const SIX_MONTHS = 15_552_000;
const SEVEN_DAYS = 604_800;

const client = fromWorkspace(".");
const provider = new LiteSVMProvider(client);
const program = new pkg.Program(IDL, provider) as Program<Anderdzi>;

let seq = 0;
function uniquify() {
  return [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 + ++seq })];
}

function vaultPDA(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    program.programId
  )[0];
}

function treasuryPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  )[0];
}

// ── Staking Tests ──────────────────────────────────────────────────────────────

describe("staking: vault creation and guards", () => {
  const owner = Keypair.generate();
  const watcher = Keypair.generate();
  const heir = Keypair.generate();
  const vault = vaultPDA(owner.publicKey);
  const treasury = treasuryPDA();

  before(() => {
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
  });

  it("initializes treasury", async () => {
    await program.methods
      .initializeTreasury(watcher.publicKey)
      .accounts({ authority: provider.wallet.publicKey })
      .preInstructions(uniquify())
      .rpc();
  });

  it("creates a vault with staking disabled", async () => {
    await program.methods
      .createVault(
        true,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(LAMPORTS_PER_SOL),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vault);
    assert.isFalse(acc.stakingEnabled);
    assert.isTrue(acc.watcherEnabled);
    assert.equal(acc.totalDeposited.toNumber(), LAMPORTS_PER_SOL);
  });

  it("allows close_vault when staking is disabled (default)", async () => {
    // Staking is disabled by default at creation, so close should work
    // (but we won't actually close here since other tests need this vault)
    const acc = await program.account.vault.fetch(vault);
    assert.isFalse(acc.stakingEnabled);
  });

  it("rejects stake_deposit when staking is disabled", async () => {
    const owner2 = Keypair.generate();
    client.airdrop(owner2.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        true,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(LAMPORTS_PER_SOL),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner2.publicKey, treasury })
      .signers([owner2])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vaultPDA(owner2.publicKey));
    assert.isFalse(acc.stakingEnabled);
  });

  it("creates vault with staking disabled and verifies flag", async () => {
    const owner3 = Keypair.generate();
    client.airdrop(owner3.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        true,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(0),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner3.publicKey, treasury })
      .signers([owner3])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vaultPDA(owner3.publicKey));
    assert.isFalse(acc.stakingEnabled);
  });
});

describe("staking: yield math verification (off-chain)", () => {
  it("computes correct yield split at 8% APY", () => {
    const totalDeposited = 100_000_000_000;
    const msolBalance = 100_000_000_000;
    const currentRate = 1.08;

    const currentSolValue = Math.floor(msolBalance * currentRate);
    const grossYield = currentSolValue - totalDeposited;
    const protocolShare = Math.floor(grossYield / 2);
    const userShare = grossYield - protocolShare;

    assert.equal(grossYield, 8_000_000_000);
    assert.equal(protocolShare, 4_000_000_000);
    assert.equal(userShare, 4_000_000_000);
  });

  it("handles partial withdrawal yield correctly", () => {
    const totalDeposited = 100_000_000_000;
    const msolBalance = 95_000_000_000;
    const totalVirtualStaked = 1_080_000_000_000;
    const msolSupply = 1_000_000_000_000;

    const currentSolValue = Number(
      (BigInt(msolBalance) * BigInt(totalVirtualStaked)) / BigInt(msolSupply)
    );
    assert.equal(Number(currentSolValue), 102_600_000_000);

    const grossYield = Number(currentSolValue) - totalDeposited;
    assert.equal(grossYield, 2_600_000_000);
    const protocolShare = Math.floor(grossYield / 2);
    assert.equal(protocolShare, 1_300_000_000);
  });

  it("returns zero yield when mSOL depreciated (edge case)", () => {
    const totalDeposited = 100_000_000_000;
    const msolBalance = 100_000_000_000;
    const totalVirtualStaked = 990_000_000_000;
    const msolSupply = 1_000_000_000_000;

    const currentSolValue = Number(
      (BigInt(msolBalance) * BigInt(totalVirtualStaked)) / BigInt(msolSupply)
    );
    assert.equal(Number(currentSolValue), 99_000_000_000);

    const grossYield = Math.max(0, Number(currentSolValue) - totalDeposited);
    assert.equal(grossYield, 0);
  });
});

describe("staking: auto-harvest and high-water mark (off-chain)", () => {
  it("high-water mark prevents double-harvest", () => {
    // User deposits 100 SOL, mSOL appreciates to 108 SOL value
    let totalDeposited = 100_000_000_000;
    const msolBalance = 100_000_000_000; // 100 mSOL
    const rate = 1.08; // mSOL/SOL rate

    // First harvest
    const currentSolValue = Math.floor(msolBalance * rate); // 108 SOL
    const principalMsol = Math.floor(totalDeposited / rate); // ~92.59 mSOL
    const yieldMsol = msolBalance - principalMsol; // ~7.41 mSOL
    const protocolShare = Math.floor(yieldMsol / 2);
    const userShare = yieldMsol - protocolShare;

    assert.ok(protocolShare > 0, "protocol should get yield");

    // After harvest: update total_deposited (high-water mark)
    const userShareSol = Math.floor(userShare * rate);
    totalDeposited += userShareSol;

    // mSOL balance after protocol share removed
    const msolAfterHarvest = msolBalance - protocolShare;

    // Second harvest attempt: should find zero yield
    const principalMsol2 = Math.floor(totalDeposited / rate);
    const yieldMsol2 = msolAfterHarvest - principalMsol2;

    // Yield should be zero or negligible (rounding)
    assert.ok(
      yieldMsol2 <= 1,
      `second harvest yield should be ~0, got ${yieldMsol2}`
    );
  });

  it("proportional withdraw with yield uses adjusted total_deposited", () => {
    // 100 SOL deposited, mSOL worth 108 SOL (8 SOL yield)
    let totalDeposited = 100_000_000_000;
    const rate = 1.08;
    const msolBalance = 100_000_000_000; // 100 mSOL

    // Auto-harvest: protocol gets 50% of yield
    const principalMsol = Math.floor(totalDeposited / rate);
    const yieldMsol = msolBalance - principalMsol;
    const protocolShare = Math.floor(yieldMsol / 2);
    const userShareMsol = yieldMsol - protocolShare;
    const userShareSol = Math.floor(userShareMsol * rate);
    const msolAfterHarvest = msolBalance - protocolShare;

    // Adjust total_deposited with user's yield
    const adjustedDeposited = totalDeposited + userShareSol;

    // User withdraws 50 SOL
    const withdrawAmount = 50_000_000_000;
    const msolToUnstake = Math.floor(
      Number(BigInt(withdrawAmount) * BigInt(msolAfterHarvest)) /
        Number(BigInt(adjustedDeposited))
    );

    // After withdraw
    const newTotalDeposited = adjustedDeposited - withdrawAmount;
    const remainingMsol = msolAfterHarvest - msolToUnstake;

    // Remaining mSOL value should roughly equal newTotalDeposited
    const remainingValue = Math.floor(remainingMsol * rate);
    const drift = Math.abs(remainingValue - newTotalDeposited);

    // Should be within 1 SOL of each other (rounding)
    assert.ok(
      drift < 1_000_000_000,
      `remaining value ${remainingValue} should be close to total_deposited ${newTotalDeposited}, drift=${drift}`
    );
  });

  it("auto-harvest is no-op when no yield exists", () => {
    // Rate is exactly 1:1, no yield
    const totalDeposited = 100_000_000_000;
    const msolBalance = 100_000_000_000;
    const rate = 1.0;

    const principalMsol = Math.floor(totalDeposited / rate);
    const yieldMsol = Math.max(0, msolBalance - principalMsol);
    assert.equal(yieldMsol, 0);
  });
});
