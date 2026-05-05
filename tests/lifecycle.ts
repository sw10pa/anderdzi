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

describe("e2e: trigger -> cancel_trigger -> distribute", () => {
  const owner = Keypair.generate();
  const watcher = Keypair.generate();
  const heir1 = Keypair.generate();
  const heir2 = Keypair.generate();

  const DEPOSIT = 2 * LAMPORTS_PER_SOL;

  let vault: PublicKey;
  let treasury: PublicKey;

  before(async () => {
    treasury = treasuryPDA(program.programId);
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    await program.methods
      .initializeTreasury(watcher.publicKey)
      .accounts({ authority: provider.wallet.publicKey })
      .preInstructions(uniquify())
      .rpc();

    await program.methods
      .createVault(
        true,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(DEPOSIT),
        false,
        [
          { wallet: heir1.publicKey, shareBps: 6000 },
          { wallet: heir2.publicKey, shareBps: 4000 },
        ]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    vault = vaultPDA(program.programId, owner.publicKey);
  });

  it("deposits additional SOL into the vault", async () => {
    const before = await program.account.vault.fetch(vault);

    await program.methods
      .deposit(new BN(LAMPORTS_PER_SOL))
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const after = await program.account.vault.fetch(vault);
    assert.equal(
      after.totalDeposited.toNumber(),
      before.totalDeposited.toNumber() + LAMPORTS_PER_SOL
    );
  });

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
      assert.equal((err as AnchorError).error.errorCode.code, "NotInactive");
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
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "AlreadyTriggered"
      );
    }
  });

  it("cancel_trigger succeeds when vault is triggered", async () => {
    await program.methods
      .cancelTrigger()
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vault);
    assert.isNull(acc.triggeredAt);
  });

  it("cancel_trigger rejects when vault is not triggered", async () => {
    try {
      await program.methods
        .cancelTrigger()
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected NotTriggered");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "NotTriggered");
    }
  });

  it("cancel_trigger rejects from a non-owner", async () => {
    // Re-trigger first
    const clock = client.getClock();
    clock.unixTimestamp += BigInt(SIX_MONTHS);
    client.setClock(clock);

    await program.methods
      .trigger()
      .accounts({ vault })
      .preInstructions(uniquify())
      .rpc();

    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(LAMPORTS_PER_SOL));

    try {
      await program.methods
        .cancelTrigger()
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });

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
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "GracePeriodActive"
      );
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

    const totalDep = BigInt(DEPOSIT + LAMPORTS_PER_SOL);
    const fee = totalDep / BigInt(100);
    const distributable = totalDep - fee;
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

  it("distribute rejects when vault has not been triggered", async () => {
    const freshOwner = Keypair.generate();
    client.airdrop(freshOwner.publicKey, BigInt(5 * LAMPORTS_PER_SOL));
    const freshHeir = Keypair.generate();

    await program.methods
      .createVault(
        false,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(LAMPORTS_PER_SOL),
        false,
        [{ wallet: freshHeir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: freshOwner.publicKey, treasury })
      .signers([freshOwner])
      .preInstructions(uniquify())
      .rpc();

    const freshVault = vaultPDA(program.programId, freshOwner.publicKey);

    try {
      await program.methods
        .distribute()
        .accounts({ vault: freshVault, treasury })
        .remainingAccounts([
          { pubkey: freshHeir.publicKey, isSigner: false, isWritable: true },
        ])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected NotTriggered");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "NotTriggered");
    }

    await program.methods
      .closeVault()
      .accounts({ owner: freshOwner.publicKey })
      .signers([freshOwner])
      .preInstructions(uniquify())
      .rpc();
  });
});
