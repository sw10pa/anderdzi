import * as anchor from "@coral-xyz/anchor";
import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { program, vaultAddress, airdrop, SIX_MONTHS, SEVEN_DAYS } from "./helpers";

describe("ping", () => {
  let owner: Keypair;
  let watcher: Keypair;

  before(async () => {
    owner   = Keypair.generate();
    watcher = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);
    await program.methods
      .createVault(watcher.publicKey, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: Keypair.generate().publicKey, shareBps: 10000 }])
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

  it("owner resets the inactivity timer", async () => {
    const vault = vaultAddress(owner.publicKey);
    const before = await program.account.vault.fetch(vault);
    await new Promise(r => setTimeout(r, 1000));

    await program.methods.ping().accounts({ owner: owner.publicKey }).signers([owner]).rpc();

    const after = await program.account.vault.fetch(vault);
    assert.isAbove(after.lastHeartbeat.toNumber(), before.lastHeartbeat.toNumber());
    assert.isNull(after.triggeredAt);
  });

  it("rejects a ping from a non-owner", async () => {
    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

    try {
      await program.methods
        .ping()
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

describe("witness_activity", () => {
  let owner: Keypair;
  let watcher: Keypair;

  before(async () => {
    owner   = Keypair.generate();
    watcher = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);
    await program.methods
      .createVault(watcher.publicKey, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: Keypair.generate().publicKey, shareBps: 10000 }])
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

  it("watcher resets the inactivity timer", async () => {
    const vault = vaultAddress(owner.publicKey);
    const before = await program.account.vault.fetch(vault);
    await new Promise(r => setTimeout(r, 1000));

    await program.methods
      .witnessActivity()
      .accounts({ vault, watcher: watcher.publicKey })
      .signers([watcher])
      .rpc();

    const after = await program.account.vault.fetch(vault);
    assert.isAbove(after.lastHeartbeat.toNumber(), before.lastHeartbeat.toNumber());
    assert.isNull(after.triggeredAt);
  });

  it("rejects any signer who is not the registered watcher", async () => {
    const impostor = Keypair.generate();
    await airdrop(impostor.publicKey, LAMPORTS_PER_SOL);
    const vault = vaultAddress(owner.publicKey);

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, watcher: impostor.publicKey })
        .signers([impostor])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "UnauthorizedWatcher");
    }
  });

  it("rejects the owner signing as watcher", async () => {
    const vault = vaultAddress(owner.publicKey);

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, watcher: owner.publicKey })
        .signers([owner])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "UnauthorizedWatcher");
    }
  });
});
