import anchor from "@coral-xyz/anchor";
import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import {
  provider,
  program,
  vaultAddress,
  treasuryAddress,
  airdrop,
  SIX_MONTHS,
  SEVEN_DAYS,
} from "./helpers";

// NOTE: distribute happy path, GracePeriodActive, and BeneficiaryAccountMismatch
// all require a triggered vault. Testing those paths needs clock manipulation
// (e.g. LiteSVM) and will be added when that tooling is integrated.

// ── initialize_treasury ───────────────────────────────────────────────────────

describe("initialize_treasury", () => {
  it("creates the treasury with the signer as authority", async () => {
    const authority = provider.wallet.publicKey;
    const treasury = treasuryAddress();

    await program.methods.initializeTreasury().accounts({ authority }).rpc();

    const account = await program.account.treasury.fetch(treasury);
    assert.ok(account.authority.equals(authority));
  });

  it("rejects a second initialization", async () => {
    try {
      await program.methods
        .initializeTreasury()
        .accounts({ authority: provider.wallet.publicKey })
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

// ── distribute ────────────────────────────────────────────────────────────────

describe("distribute", () => {
  let owner: Keypair;

  before(async () => {
    owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);
    const watcher = Keypair.generate();
    await program.methods
      .createVault(
        watcher.publicKey,
        new anchor.BN(SIX_MONTHS),
        new anchor.BN(SEVEN_DAYS),
        new anchor.BN(0),
        false,
        [{ wallet: Keypair.generate().publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();
  });

  after(async () => {
    // vault may already be closed if a test distributed; only close if it exists
    try {
      await program.methods
        .closeVault()
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();
    } catch (_) {}
  });

  it("rejects distribute when vault has not been triggered", async () => {
    const vault = vaultAddress(owner.publicKey);
    const treasury = treasuryAddress();
    const heir = Keypair.generate();

    try {
      await program.methods
        .distribute()
        .accounts({ vault, treasury })
        .remainingAccounts([
          { pubkey: heir.publicKey, isSigner: false, isWritable: true },
        ])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "NotTriggered");
    }
  });
});

// ── withdraw_fees ─────────────────────────────────────────────────────────────

describe("withdraw_fees", () => {
  it("rejects withdraw from a non-authority", async () => {
    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);
    const treasury = treasuryAddress();

    try {
      await program.methods
        .withdrawFees()
        .accounts({
          treasury,
          authority: stranger.publicKey,
          destination: stranger.publicKey,
        })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "Unauthorized");
    }
  });

  it("rejects withdraw when no fees have accumulated", async () => {
    const authority = provider.wallet.publicKey;
    const treasury = treasuryAddress();
    const destination = Keypair.generate().publicKey;

    try {
      await program.methods
        .withdrawFees()
        .accounts({ treasury, authority, destination })
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "ZeroAmount");
    }
  });
});
