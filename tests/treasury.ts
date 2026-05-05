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

describe("treasury", () => {
  const watcher = Keypair.generate();
  const treasury = treasuryPDA(program.programId);

  it("initializes the treasury with a default watcher", async () => {
    await program.methods
      .initializeTreasury(watcher.publicKey)
      .accounts({ authority: provider.wallet.publicKey })
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.treasury.fetch(treasury);
    assert.ok(acc.authority.equals(provider.wallet.publicKey));
    assert.ok(acc.defaultWatcher.equals(watcher.publicKey));
  });

  it("rejects a second treasury initialization", async () => {
    try {
      await program.methods
        .initializeTreasury(null)
        .accounts({ authority: provider.wallet.publicKey })
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });

  it("authority drains accumulated fees from the treasury", async () => {
    const owner = Keypair.generate();
    const heir = Keypair.generate();
    client.airdrop(owner.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    await program.methods
      .createVault(
        true,
        new BN(SIX_MONTHS),
        new BN(SEVEN_DAYS),
        new BN(2 * LAMPORTS_PER_SOL),
        false,
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const vault = vaultPDA(program.programId, owner.publicKey);

    // trigger
    const clock = client.getClock();
    clock.unixTimestamp += BigInt(SIX_MONTHS);
    client.setClock(clock);

    await program.methods
      .trigger()
      .accounts({ vault })
      .preInstructions(uniquify())
      .rpc();

    // distribute
    const clock2 = client.getClock();
    clock2.unixTimestamp += BigInt(SEVEN_DAYS);
    client.setClock(clock2);

    await program.methods
      .distribute()
      .accounts({ vault, treasury })
      .remainingAccounts([
        { pubkey: heir.publicKey, isSigner: false, isWritable: true },
      ])
      .preInstructions(uniquify())
      .rpc();

    // withdraw fees
    const destination = Keypair.generate();
    const before = client.getBalance(destination.publicKey) ?? BigInt(0);

    await program.methods
      .withdrawFees()
      .accounts({ destination: destination.publicKey } as any)
      .preInstructions(uniquify())
      .rpc();

    const after = client.getBalance(destination.publicKey) ?? BigInt(0);
    assert.isTrue(after > before, "destination should have received fees");
  });

  it("withdraw_fees rejects from a non-authority", async () => {
    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(LAMPORTS_PER_SOL));

    try {
      await program.methods
        .withdrawFees()
        .accounts({
          treasury,
          authority: stranger.publicKey,
          destination: stranger.publicKey,
        })
        .signers([stranger])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "Unauthorized");
    }
  });
});
