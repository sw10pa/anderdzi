import anchor from "@coral-xyz/anchor";
import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import {
  provider,
  program,
  vaultAddress,
  airdrop,
  SIX_MONTHS,
  SEVEN_DAYS,
} from "./helpers";

describe("update_beneficiaries", () => {
  let owner: Keypair;

  before(async () => {
    owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);
    const watcher = Keypair.generate();
    const initialHeir = Keypair.generate().publicKey;
    await program.methods
      .createVault(
        watcher.publicKey,
        new anchor.BN(SIX_MONTHS),
        new anchor.BN(SEVEN_DAYS),
        new anchor.BN(0),
        false,
        [{ wallet: initialHeir, shareBps: 10000 }]
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

  it("updates the beneficiary list", async () => {
    const vault = vaultAddress(owner.publicKey);
    const alice = Keypair.generate().publicKey;
    const bob = Keypair.generate().publicKey;

    await program.methods
      .updateBeneficiaries([
        { wallet: alice, shareBps: 6000 },
        { wallet: bob, shareBps: 4000 },
      ])
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();

    const account = await program.account.vault.fetch(vault);
    assert.equal(account.beneficiaries.length, 2);
    assert.ok(account.beneficiaries[0].wallet.equals(alice));
    assert.equal(account.beneficiaries[0].shareBps, 6000);
    assert.ok(account.beneficiaries[1].wallet.equals(bob));
    assert.equal(account.beneficiaries[1].shareBps, 4000);
  });

  it("replaces the list when called again", async () => {
    const carol = Keypair.generate().publicKey;

    await program.methods
      .updateBeneficiaries([{ wallet: carol, shareBps: 10000 }])
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();

    const account = await program.account.vault.fetch(
      vaultAddress(owner.publicKey)
    );
    assert.equal(account.beneficiaries.length, 1);
    assert.ok(account.beneficiaries[0].wallet.equals(carol));
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
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

    try {
      await program.methods
        .updateBeneficiaries([{ wallet: stranger.publicKey, shareBps: 10000 }])
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});
