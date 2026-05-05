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

let seq = 1000;
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

describe("watcher: opt-in/opt-out and witness_activity", () => {
  const authority = Keypair.generate();
  const owner = Keypair.generate();
  const ownerNoWatcher = Keypair.generate();
  const watcher = Keypair.generate();
  const heir = Keypair.generate();
  const treasury = treasuryPDA();

  before(() => {
    client.airdrop(authority.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    client.airdrop(ownerNoWatcher.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    client.airdrop(watcher.publicKey, BigInt(1 * LAMPORTS_PER_SOL));
  });

  it("initializes treasury with default watcher", async () => {
    await program.methods
      .initializeTreasury(watcher.publicKey)
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.treasury.fetch(treasury);
    assert.ok(acc.defaultWatcher.equals(watcher.publicKey));
  });

  it("creates a vault with watcher enabled", async () => {
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

    const vault = await program.account.vault.fetch(vaultPDA(owner.publicKey));
    assert.isTrue(vault.watcherEnabled);
  });

  it("creates a vault with watcher disabled", async () => {
    await program.methods
      .createVault(
        false,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(LAMPORTS_PER_SOL),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: ownerNoWatcher.publicKey, treasury })
      .signers([ownerNoWatcher])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(
      vaultPDA(ownerNoWatcher.publicKey)
    );
    assert.isFalse(vault.watcherEnabled);
  });

  // -- ping --

  it("ping resets the inactivity timer", async () => {
    const vault = vaultPDA(owner.publicKey);
    const before = await program.account.vault.fetch(vault);

    const clock = client.getClock();
    clock.unixTimestamp += BigInt(10);
    client.setClock(clock);

    await program.methods
      .ping()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const after = await program.account.vault.fetch(vault);
    assert.isAbove(
      after.lastHeartbeat.toNumber(),
      before.lastHeartbeat.toNumber()
    );
    assert.isNull(after.triggeredAt);
  });

  it("ping rejects from a non-owner", async () => {
    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(LAMPORTS_PER_SOL));

    try {
      await program.methods
        .ping()
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });

  // -- witness_activity --

  it("witness_activity rejected on vault with watcher disabled", async () => {
    const vault = vaultPDA(ownerNoWatcher.publicKey);

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, treasury, watcher: watcher.publicKey })
        .signers([watcher])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "WatcherNotEnabled"
      );
    }
  });

  it("witness_activity succeeds with correct watcher on enabled vault", async () => {
    const vault = vaultPDA(owner.publicKey);
    const before = await program.account.vault.fetch(vault);

    const clock = client.getClock();
    clock.unixTimestamp += BigInt(10);
    client.setClock(clock);

    await program.methods
      .witnessActivity()
      .accounts({ vault, treasury, watcher: watcher.publicKey })
      .signers([watcher])
      .preInstructions(uniquify())
      .rpc();

    const after = await program.account.vault.fetch(vault);
    assert.isAbove(
      after.lastHeartbeat.toNumber(),
      before.lastHeartbeat.toNumber()
    );
    assert.isNull(after.triggeredAt);
  });

  it("witness_activity rejected with wrong watcher", async () => {
    const vault = vaultPDA(owner.publicKey);
    const impostor = Keypair.generate();
    client.airdrop(impostor.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, treasury, watcher: impostor.publicKey })
        .signers([impostor])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "UnauthorizedWatcher"
      );
    }
  });

  it("witness_activity rejected with owner signing as watcher", async () => {
    const vault = vaultPDA(owner.publicKey);

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, treasury, watcher: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "UnauthorizedWatcher"
      );
    }
  });

  // -- opt-in/opt-out --

  it("owner can opt out of watcher", async () => {
    await program.methods
      .optOutWatcher()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(vaultPDA(owner.publicKey));
    assert.isFalse(vault.watcherEnabled);
  });

  it("owner can opt back into watcher", async () => {
    await program.methods
      .optInWatcher()
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(vaultPDA(owner.publicKey));
    assert.isTrue(vault.watcherEnabled);
  });

  // -- set_default_watcher --

  it("set_default_watcher updates the treasury watcher", async () => {
    const newWatcher = Keypair.generate();

    await program.methods
      .setDefaultWatcher(newWatcher.publicKey)
      .accounts({ treasury, authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.treasury.fetch(treasury);
    assert.ok(acc.defaultWatcher.equals(newWatcher.publicKey));
  });

  it("set_default_watcher rejects non-authority", async () => {
    const impostor = Keypair.generate();
    client.airdrop(impostor.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .setDefaultWatcher(watcher.publicKey)
        .accounts({ treasury, authority: impostor.publicKey })
        .signers([impostor])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });

  it("set_default_watcher can clear watcher (set to null)", async () => {
    await program.methods
      .setDefaultWatcher(null)
      .accounts({ treasury, authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.treasury.fetch(treasury);
    assert.isNull(acc.defaultWatcher);
  });

  it("opt_in_watcher fails when no default watcher is configured", async () => {
    try {
      await program.methods
        .optInWatcher()
        .accounts({ owner: ownerNoWatcher.publicKey, treasury })
        .signers([ownerNoWatcher])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "NoDefaultWatcher"
      );
    }
  });
});
