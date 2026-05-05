// @coral-xyz/anchor is a CJS module; Node 24 runs this file as ESM.
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

describe("watcher: optional watcher and admin rotation", () => {
  const authority = Keypair.generate();
  const owner = Keypair.generate();
  const ownerNoWatcher = Keypair.generate();
  const watcher = Keypair.generate();
  const newWatcher = Keypair.generate();
  const heir = Keypair.generate();
  const treasury = treasuryPDA();

  before(() => {
    client.airdrop(authority.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    client.airdrop(ownerNoWatcher.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    client.airdrop(watcher.publicKey, BigInt(1 * LAMPORTS_PER_SOL));
  });

  it("initializes treasury", async () => {
    await program.methods
      .initializeTreasury()
      .accounts({ authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();
  });

  it("creates a vault with a watcher", async () => {
    await program.methods
      .createVault(
        watcher.publicKey,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(LAMPORTS_PER_SOL),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(vaultPDA(owner.publicKey));
    assert.ok(vault.watcher.equals(watcher.publicKey));
  });

  it("creates a vault without a watcher (null)", async () => {
    await program.methods
      .createVault(
        null,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(LAMPORTS_PER_SOL),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: ownerNoWatcher.publicKey })
      .signers([ownerNoWatcher])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(
      vaultPDA(ownerNoWatcher.publicKey)
    );
    assert.isNull(vault.watcher);
  });

  it("witness_activity rejected on vault with no watcher", async () => {
    const vault = vaultPDA(ownerNoWatcher.publicKey);

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, watcher: watcher.publicKey })
        .signers([watcher])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "WatcherNotSet");
    }
  });

  it("admin_rotate_watcher rotates watcher via treasury authority", async () => {
    const vault = vaultPDA(owner.publicKey);

    await program.methods
      .adminRotateWatcher(owner.publicKey, newWatcher.publicKey)
      .accounts({ vault, treasury, authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();

    const account = await program.account.vault.fetch(vault);
    assert.ok(account.watcher.equals(newWatcher.publicKey));
  });

  it("admin_rotate_watcher rejects non-authority signer", async () => {
    const vault = vaultPDA(owner.publicKey);
    const impostor = Keypair.generate();
    client.airdrop(impostor.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .adminRotateWatcher(owner.publicKey, watcher.publicKey)
        .accounts({ vault, treasury, authority: impostor.publicKey })
        .signers([impostor])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });

  it("admin_rotate_watcher can set watcher to null", async () => {
    const vault = vaultPDA(owner.publicKey);

    await program.methods
      .adminRotateWatcher(owner.publicKey, null)
      .accounts({ vault, treasury, authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();

    const account = await program.account.vault.fetch(vault);
    assert.isNull(account.watcher);
  });

  it("owner can opt into watcher via update_watcher", async () => {
    await program.methods
      .updateWatcher(watcher.publicKey)
      .accounts({ owner: ownerNoWatcher.publicKey })
      .signers([ownerNoWatcher])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(
      vaultPDA(ownerNoWatcher.publicKey)
    );
    assert.ok(vault.watcher.equals(watcher.publicKey));
  });

  it("owner can opt out of watcher via update_watcher(null)", async () => {
    await program.methods
      .updateWatcher(null)
      .accounts({ owner: ownerNoWatcher.publicKey })
      .signers([ownerNoWatcher])
      .preInstructions(uniquify())
      .rpc();

    const vault = await program.account.vault.fetch(
      vaultPDA(ownerNoWatcher.publicKey)
    );
    assert.isNull(vault.watcher);
  });

  it("witness_activity rejected with wrong watcher", async () => {
    // First restore a watcher on ownerNoWatcher's vault
    await program.methods
      .updateWatcher(watcher.publicKey)
      .accounts({ owner: ownerNoWatcher.publicKey })
      .signers([ownerNoWatcher])
      .preInstructions(uniquify())
      .rpc();

    const vault = vaultPDA(ownerNoWatcher.publicKey);
    const impostor = Keypair.generate();
    client.airdrop(impostor.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .witnessActivity()
        .accounts({ vault, watcher: impostor.publicKey })
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

  it("witness_activity succeeds after admin rotation", async () => {
    const vault = vaultPDA(owner.publicKey);

    // Admin already rotated to newWatcher, rotate back to watcher for this test
    await program.methods
      .adminRotateWatcher(owner.publicKey, watcher.publicKey)
      .accounts({ vault, treasury, authority: authority.publicKey })
      .signers([authority])
      .preInstructions(uniquify())
      .rpc();

    await program.methods
      .witnessActivity()
      .accounts({ vault, watcher: watcher.publicKey })
      .signers([watcher])
      .preInstructions(uniquify())
      .rpc();

    const account = await program.account.vault.fetch(vault);
    assert.isNotNull(account.lastHeartbeat);
  });

  it("admin_rotate_watcher rejects setting watcher to vault owner", async () => {
    const vault = vaultPDA(owner.publicKey);

    try {
      await program.methods
        .adminRotateWatcher(owner.publicKey, owner.publicKey)
        .accounts({ vault, treasury, authority: authority.publicKey })
        .signers([authority])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "WatcherCannotBeOwner"
      );
    }
  });

  it("update_watcher rejects setting watcher to owner", async () => {
    try {
      await program.methods
        .updateWatcher(ownerNoWatcher.publicKey)
        .accounts({ owner: ownerNoWatcher.publicKey })
        .signers([ownerNoWatcher])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "WatcherCannotBeOwner"
      );
    }
  });
});
