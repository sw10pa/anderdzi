import { describe, it, before } from "node:test";
import { assert } from "chai";
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

describe("create_vault edge cases", () => {
  const treasury = treasuryPDA(program.programId);
  const watcher = Keypair.generate();
  const heir = Keypair.generate();

  before(async () => {
    await program.methods
      .initializeTreasury(watcher.publicKey)
      .accounts({ authority: provider.wallet.publicKey })
      .preInstructions(uniquify())
      .rpc();
  });

  it("creates a vault without an initial deposit", async () => {
    const owner = Keypair.generate();
    client.airdrop(owner.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        false,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(0),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(
      vaultPDA(program.programId, owner.publicKey)
    );
    assert.equal(acc.totalDeposited.toNumber(), 0);
    assert.isFalse(acc.watcherEnabled);

    await program.methods
      .closeVault()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();
  });

  it("rejects an inactivity period shorter than 6 months", async () => {
    const owner = Keypair.generate();
    client.airdrop(owner.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .createVault(
          false,
          new BN(SIX_MONTHS - 1),
          new BN(SEVEN_DAYS),
          new BN(0),
          false,
          [{ wallet: heir.publicKey, shareBps: 10000 }]
        )
        .accounts({ owner: owner.publicKey, treasury })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "InactivityPeriodTooShort"
      );
    }
  });

  it("rejects a grace period shorter than 7 days", async () => {
    const owner = Keypair.generate();
    client.airdrop(owner.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

    try {
      await program.methods
        .createVault(
          false,
          new BN(SIX_MONTHS),
          new BN(SEVEN_DAYS - 1),
          new BN(0),
          false,
          [{ wallet: heir.publicKey, shareBps: 10000 }]
        )
        .accounts({ owner: owner.publicKey, treasury })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "GracePeriodTooShort"
      );
    }
  });

  it("rejects a duplicate vault for the same owner", async () => {
    const owner = Keypair.generate();
    client.airdrop(owner.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        false,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(0),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    try {
      await program.methods
        .createVault(
          false,
          new BN(SIX_MONTHS),
          new BN(SEVEN_DAYS),
          new BN(0),
          false,
          [{ wallet: heir.publicKey, shareBps: 10000 }]
        )
        .accounts({ owner: owner.publicKey, treasury })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }

    await program.methods
      .closeVault()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();
  });
});

describe("close_vault", () => {
  const treasury = treasuryPDA(program.programId);
  const watcher = Keypair.generate();
  const heir = Keypair.generate();

  it("closes the vault and returns all SOL to the owner", async () => {
    const owner = Keypair.generate();
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

    const vault = vaultPDA(program.programId, owner.publicKey);
    const ownerBefore = client.getBalance(owner.publicKey) ?? BigInt(0);

    await program.methods
      .closeVault()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    assert.equal(client.getBalance(vault) ?? BigInt(0), BigInt(0));
    const ownerAfter = client.getBalance(owner.publicKey) ?? BigInt(0);
    assert.isTrue(ownerAfter > ownerBefore);
  });

  it("rejects close from a non-owner", async () => {
    const owner = Keypair.generate();
    client.airdrop(owner.publicKey, BigInt(5 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        false,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(0),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(LAMPORTS_PER_SOL));

    try {
      await program.methods
        .closeVault()
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }

    await program.methods
      .closeVault()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();
  });
});
