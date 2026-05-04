import anchor from "@coral-xyz/anchor";
import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import {
  program,
  vaultAddress,
  airdrop,
  SIX_MONTHS,
  SEVEN_DAYS,
} from "./helpers";

// NOTE: trigger happy path and AlreadyTriggered require the inactivity period to
// have elapsed. Testing those paths needs clock manipulation (e.g. LiteSVM) and
// will be added when that tooling is integrated.

// ── trigger ───────────────────────────────────────────────────────────────────

describe("trigger", () => {
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
    await program.methods
      .closeVault()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();
  });

  it("rejects trigger when inactivity period has not elapsed", async () => {
    const vault = vaultAddress(owner.publicKey);

    try {
      await program.methods.trigger().accounts({ vault }).rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "NotInactive");
    }
  });
});

// ── cancel_trigger ────────────────────────────────────────────────────────────

describe("cancel_trigger", () => {
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
    await program.methods
      .closeVault()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();
  });

  it("rejects cancel when vault has not been triggered", async () => {
    try {
      await program.methods
        .cancelTrigger()
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "NotTriggered");
    }
  });

  it("rejects cancel from a non-owner", async () => {
    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

    try {
      await program.methods
        .cancelTrigger()
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});
