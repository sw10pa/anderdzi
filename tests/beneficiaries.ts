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

describe("update_beneficiaries", () => {
  const treasury = treasuryPDA(program.programId);
  const watcher = Keypair.generate();
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
        new BN(0),
        false,
        [{ wallet: Keypair.generate().publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey, treasury })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    vault = vaultPDA(program.programId, owner.publicKey);
  });

  it("updates the beneficiary list", async () => {
    const alice = Keypair.generate().publicKey;
    const bob = Keypair.generate().publicKey;

    await program.methods
      .updateBeneficiaries([
        { wallet: alice, shareBps: 6000 },
        { wallet: bob, shareBps: 4000 },
      ])
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vault);
    assert.equal(acc.beneficiaries.length, 2);
    assert.ok(acc.beneficiaries[0].wallet.equals(alice));
    assert.equal(acc.beneficiaries[0].shareBps, 6000);
    assert.ok(acc.beneficiaries[1].wallet.equals(bob));
    assert.equal(acc.beneficiaries[1].shareBps, 4000);
  });

  it("replaces the list when called again", async () => {
    const carol = Keypair.generate().publicKey;

    await program.methods
      .updateBeneficiaries([{ wallet: carol, shareBps: 10000 }])
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .preInstructions(uniquify())
      .rpc();

    const acc = await program.account.vault.fetch(vault);
    assert.equal(acc.beneficiaries.length, 1);
    assert.ok(acc.beneficiaries[0].wallet.equals(carol));
  });

  it("rejects shares that do not sum to 10000 bps", async () => {
    const alice = Keypair.generate().publicKey;
    const bob = Keypair.generate().publicKey;

    try {
      await program.methods
        .updateBeneficiaries([
          { wallet: alice, shareBps: 6000 },
          { wallet: bob, shareBps: 3000 },
        ])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "InvalidShares");
    }
  });

  it("rejects an empty beneficiary list", async () => {
    try {
      await program.methods
        .updateBeneficiaries([])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "NoBeneficiaries"
      );
    }
  });

  it("rejects more than 10 beneficiaries", async () => {
    const tooMany = Array.from({ length: 11 }, () => ({
      wallet: Keypair.generate().publicKey,
      shareBps: 909,
    }));

    try {
      await program.methods
        .updateBeneficiaries(tooMany)
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "TooManyBeneficiaries"
      );
    }
  });

  it("rejects duplicate wallet addresses", async () => {
    const alice = Keypair.generate().publicKey;

    try {
      await program.methods
        .updateBeneficiaries([
          { wallet: alice, shareBps: 5000 },
          { wallet: alice, shareBps: 5000 },
        ])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .preInstructions(uniquify())
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal(
        (err as AnchorError).error.errorCode.code,
        "DuplicateBeneficiary"
      );
    }
  });

  it("rejects a call from a non-owner", async () => {
    const stranger = Keypair.generate();
    client.airdrop(stranger.publicKey, BigInt(LAMPORTS_PER_SOL));

    try {
      await program.methods
        .updateBeneficiaries([{ wallet: stranger.publicKey, shareBps: 10000 }])
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
