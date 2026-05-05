import { describe, it, before } from "node:test";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  createTestEnv,
  treasuryPDA,
  vaultPDA,
  SIX_MONTHS,
  SEVEN_DAYS,
  BN,
  AnchorError,
  Keypair,
  LAMPORTS_PER_SOL,
} from "./test-helpers";

const { client, provider, program, uniquify } = createTestEnv();

describe("deposit edge cases", () => {
  const treasury = treasuryPDA(program.programId);
  const watcher = Keypair.generate();
  const heir = Keypair.generate();
  const owner = Keypair.generate();
  let vault: PublicKey;

  before(async () => {
    await program.methods
      .initializeTreasury(watcher.publicKey)
      .accounts({ authority: provider.wallet.publicKey })
      .preInstructions(uniquify())
      .rpc();

    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        false,
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

    vault = vaultPDA(program.programId, owner.publicKey);
  });

  it("rejects a zero-amount deposit", async () => {
    try {
      await program.methods
        .deposit(new BN(0))
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "ZeroAmount");
    }
  });

  it("rejects a deposit from a non-owner (no vault)", async () => {
    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .deposit(new BN(LAMPORTS_PER_SOL))
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

describe("withdraw edge cases", () => {
  const treasury = treasuryPDA(program.programId);
  const heir = Keypair.generate();
  const owner = Keypair.generate();
  let vault: PublicKey;

  before(async () => {
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        false,
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

    vault = vaultPDA(program.programId, owner.publicKey);
  });

  it("withdraws a partial amount from the vault", async () => {
    const before = await program.account.vault.fetch(vault);

    await program.methods
      .withdraw(new BN(LAMPORTS_PER_SOL / 2))
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const after = await program.account.vault.fetch(vault);
    assert.equal(
      after.totalDeposited.toNumber(),
      before.totalDeposited.toNumber() - LAMPORTS_PER_SOL / 2
    );
  });

  it("rejects a zero-amount withdrawal", async () => {
    try {
      await program.methods
        .withdraw(new BN(0))
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "ZeroAmount");
    }
  });

  it("rejects a withdrawal exceeding total deposited", async () => {
    const account = await program.account.vault.fetch(vault);
    const tooMuch = new BN(account.totalDeposited.toNumber() + 1);

    try {
      await program.methods
        .withdraw(tooMuch)
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "InsufficientFunds"
      );
    }
  });

  it("rejects a withdrawal from a non-owner", async () => {
    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(LAMPORTS_PER_SOL));

    try {
      await program.methods
        .withdraw(new BN(1000))
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});
