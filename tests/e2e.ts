// @coral-xyz/anchor is a CJS module; Node 24 runs this file as ESM. Named imports
// from CJS don't work — use the default export and destructure what's needed.
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

// Load IDL from disk — never touch anchor.workspace, which is shared and cached
// across all test files loaded by anchor test and would pick up the wrong provider.
const IDL = JSON.parse(
  readFileSync(resolve(process.cwd(), "target/idl/anderdzi.json"), "utf8")
) as Idl;

// Plain numbers for BN; BigInt() constructor for clock arithmetic
// (target: es6 doesn't support the n-suffix literal).
const SIX_MONTHS = 15_552_000;
const SEVEN_DAYS = 604_800;

const client = fromWorkspace(".");
const provider = new LiteSVMProvider(client);
const program = new pkg.Program(IDL, provider) as Program<Anderdzi>;

// LiteSVM's blockhash never changes, so identical transactions are rejected as
// AlreadyProcessed. Prepend a unique compute-unit limit to differentiate each call.
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

// ── e2e: create → deposit → trigger → distribute ──────────────────────────────

describe("e2e: create → deposit → trigger → distribute", () => {
  const owner = Keypair.generate();
  const watcher = Keypair.generate();
  const heir1 = Keypair.generate();
  const heir2 = Keypair.generate();

  const DEPOSIT = 2 * LAMPORTS_PER_SOL;

  const vault = vaultPDA(owner.publicKey);
  const treasury = treasuryPDA();

  before(() => {
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
  });

  // ── setup ──────────────────────────────────────────────────────────────────

  it("initializes the treasury", async () => {
    await program.methods
      .initializeTreasury()
      .accounts({ authority: provider.wallet.publicKey })
      .rpc();

    const acc = await program.account.treasury.fetch(treasury);
    assert.ok(acc.authority.equals(provider.wallet.publicKey));
  });

  it("creates a vault with a 2 SOL deposit and two beneficiaries", async () => {
    await program.methods
      .createVault(
        watcher.publicKey,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(DEPOSIT),
        false,
        [
          { wallet: heir1.publicKey, shareBps: 6000 },
          { wallet: heir2.publicKey, shareBps: 4000 },
        ]
      )
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();

    const acc = await program.account.vault.fetch(vault);
    assert.ok(acc.owner.equals(owner.publicKey));
    assert.equal(acc.totalDeposited.toNumber(), DEPOSIT);
    assert.isNull(acc.triggeredAt);
    assert.lengthOf(acc.beneficiaries, 2);
  });

  // ── trigger ────────────────────────────────────────────────────────────────

  it("trigger rejects before the inactivity period elapses", async () => {
    try {
      await program.methods
        .trigger()
        .accounts({ vault })
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected NotInactive");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as any).error.errorCode.code, "NotInactive");
    }
  });

  it("fires the trigger after advancing the clock past the inactivity period", async () => {
    const clock = client.getClock();
    clock.unixTimestamp += BigInt(SIX_MONTHS);
    client.setClock(clock);

    await program.methods
      .trigger()
      .accounts({ vault })
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vault);
    assert.isNotNull(acc.triggeredAt);
  });

  it("rejects a second trigger while the vault is already triggered", async () => {
    try {
      await program.methods
        .trigger()
        .accounts({ vault })
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected AlreadyTriggered");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as any).error.errorCode.code, "AlreadyTriggered");
    }
  });

  // ── distribute ─────────────────────────────────────────────────────────────

  it("distribute rejects while the grace period is still active", async () => {
    try {
      await program.methods
        .distribute()
        .accounts({ vault, treasury })
        .remainingAccounts([
          { pubkey: heir1.publicKey, isSigner: false, isWritable: true },
          { pubkey: heir2.publicKey, isSigner: false, isWritable: true },
        ])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected GracePeriodActive");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as any).error.errorCode.code, "GracePeriodActive");
    }
  });

  it("distributes proportionally to heirs after grace period elapses", async () => {
    const clock = client.getClock();
    clock.unixTimestamp += BigInt(SEVEN_DAYS);
    client.setClock(clock);

    const heir1Before = client.getBalance(heir1.publicKey) ?? BigInt(0);
    const heir2Before = client.getBalance(heir2.publicKey) ?? BigInt(0);

    await program.methods
      .distribute()
      .accounts({ vault, treasury })
      .remainingAccounts([
        { pubkey: heir1.publicKey, isSigner: false, isWritable: true },
        { pubkey: heir2.publicKey, isSigner: false, isWritable: true },
      ])
      .preInstructions(uniquify())
      .rpc();

    const heir1After = client.getBalance(heir1.publicKey) ?? BigInt(0);
    const heir2After = client.getBalance(heir2.publicKey) ?? BigInt(0);

    const deposited = BigInt(DEPOSIT);
    const fee = deposited / BigInt(100);
    const distributable = deposited - fee;
    const expectedHeir1 = (distributable * BigInt(6000)) / BigInt(10000);
    const expectedHeir2 = (distributable * BigInt(4000)) / BigInt(10000);

    assert.equal(
      heir1After - heir1Before,
      expectedHeir1,
      "heir1 received wrong amount"
    );
    assert.equal(
      heir2After - heir2Before,
      expectedHeir2,
      "heir2 received wrong amount"
    );
    assert.equal(
      client.getBalance(vault) ?? BigInt(0),
      BigInt(0),
      "vault should be closed"
    );
  });

  // ── withdraw_fees ──────────────────────────────────────────────────────────

  it("authority drains accumulated fees from the treasury", async () => {
    const destination = Keypair.generate();
    const before = client.getBalance(destination.publicKey) ?? BigInt(0);

    await program.methods
      .withdrawFees()
      // Anchor 0.32 auto-derives `treasury` (PDA seeds) and `authority`
      // (via relations: treasury.authority); only destination is caller-supplied.
      .accounts({ destination: destination.publicKey } as any)
      .rpc();

    const after = client.getBalance(destination.publicKey) ?? BigInt(0);
    assert.isTrue(after > before, "destination should have received fees");
  });
});
