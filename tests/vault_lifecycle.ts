import * as anchor from "@coral-xyz/anchor";
import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { provider, program, vaultAddress, airdrop, SIX_MONTHS, SEVEN_DAYS } from "./helpers";

const watcher = Keypair.generate();
const heir    = Keypair.generate();

// ── create_vault ─────────────────────────────────────────────────────────────

describe("create_vault", () => {
  it("creates a vault with an initial deposit", async () => {
    const owner = provider.wallet.publicKey;
    const vault = vaultAddress(owner);

    await program.methods
      .createVault(
        watcher.publicKey,
        new anchor.BN(SIX_MONTHS),
        new anchor.BN(SEVEN_DAYS),
        new anchor.BN(LAMPORTS_PER_SOL),
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner })
      .rpc();

    const account = await program.account.vault.fetch(vault);
    assert.ok(account.owner.equals(owner));
    assert.ok(account.watcher.equals(watcher.publicKey));
    assert.equal(account.inactivityPeriod.toNumber(), SIX_MONTHS);
    assert.equal(account.gracePeriod.toNumber(), SEVEN_DAYS);
    assert.equal(account.totalDeposited.toNumber(), LAMPORTS_PER_SOL);
    assert.isNull(account.triggeredAt);
    assert.lengthOf(account.beneficiaries, 1);
    assert.ok(account.beneficiaries[0].wallet.equals(heir.publicKey));
    assert.equal(account.beneficiaries[0].shareBps, 10000);

    const vaultBalance = await provider.connection.getBalance(vault);
    assert.isAtLeast(vaultBalance, LAMPORTS_PER_SOL);
  });

  it("creates a vault without an initial deposit", async () => {
    const owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

    await program.methods
      .createVault(
        watcher.publicKey,
        new anchor.BN(SIX_MONTHS),
        new anchor.BN(SEVEN_DAYS),
        new anchor.BN(0),
        [{ wallet: heir.publicKey, shareBps: 10000 }]
      )
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();

    const account = await program.account.vault.fetch(vaultAddress(owner.publicKey));
    assert.equal(account.totalDeposited.toNumber(), 0);
  });

  it("rejects an inactivity period shorter than 6 months", async () => {
    const owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .createVault(watcher.publicKey, new anchor.BN(SIX_MONTHS - 1), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: heir.publicKey, shareBps: 10000 }])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "InactivityPeriodTooShort");
    }
  });

  it("rejects a grace period shorter than 7 days", async () => {
    const owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .createVault(watcher.publicKey, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS - 1), new anchor.BN(0), [{ wallet: heir.publicKey, shareBps: 10000 }])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "GracePeriodTooShort");
    }
  });

  it("rejects watcher == owner", async () => {
    const owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .createVault(owner.publicKey, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: heir.publicKey, shareBps: 10000 }])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "WatcherCannotBeOwner");
    }
  });

  it("rejects the zero pubkey as watcher", async () => {
    const owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .createVault(PublicKey.default, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: heir.publicKey, shareBps: 10000 }])
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "InvalidWatcher");
    }
  });

  it("rejects a duplicate vault for the same owner", async () => {
    const owner = provider.wallet.publicKey; // vault already exists from first test

    try {
      await program.methods
        .createVault(watcher.publicKey, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: heir.publicKey, shareBps: 10000 }])
        .accounts({ owner })
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

// ── deposit ───────────────────────────────────────────────────────────────────

describe("deposit", () => {
  it("deposits additional SOL into the vault", async () => {
    const owner = provider.wallet.publicKey;
    const vault = vaultAddress(owner);
    const amount = new anchor.BN(LAMPORTS_PER_SOL / 2);

    const before = await program.account.vault.fetch(vault);

    await program.methods.deposit(amount).accounts({ owner }).rpc();

    const after = await program.account.vault.fetch(vault);
    assert.equal(
      after.totalDeposited.toNumber(),
      before.totalDeposited.toNumber() + amount.toNumber()
    );
    assert.isAtLeast(await provider.connection.getBalance(vault), after.totalDeposited.toNumber());
  });

  it("rejects a zero-amount deposit", async () => {
    const owner = provider.wallet.publicKey;

    try {
      await program.methods.deposit(new anchor.BN(0)).accounts({ owner }).rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "ZeroAmount");
    }
  });

  it("rejects a deposit from a non-owner", async () => {
    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, 2 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .deposit(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

// ── withdraw ──────────────────────────────────────────────────────────────────

describe("withdraw", () => {
  it("withdraws a partial amount from the vault", async () => {
    const owner = provider.wallet.publicKey;
    const vault = vaultAddress(owner);
    const amount = new anchor.BN(LAMPORTS_PER_SOL / 2);

    const before = await program.account.vault.fetch(vault);
    const ownerBefore = await provider.connection.getBalance(owner);

    await program.methods.withdraw(amount).accounts({ owner }).rpc();

    const after = await program.account.vault.fetch(vault);
    const ownerAfter = await provider.connection.getBalance(owner);

    assert.equal(
      after.totalDeposited.toNumber(),
      before.totalDeposited.toNumber() - amount.toNumber()
    );
    assert.isAbove(ownerAfter, ownerBefore);
  });

  it("rejects a zero-amount withdrawal", async () => {
    const owner = provider.wallet.publicKey;

    try {
      await program.methods.withdraw(new anchor.BN(0)).accounts({ owner }).rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "ZeroAmount");
    }
  });

  it("rejects a withdrawal exceeding total deposited", async () => {
    const owner = provider.wallet.publicKey;
    const account = await program.account.vault.fetch(vaultAddress(owner));
    const tooMuch = new anchor.BN(account.totalDeposited.toNumber() + 1);

    try {
      await program.methods.withdraw(tooMuch).accounts({ owner }).rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "InsufficientFunds");
    }
  });

  it("rejects a withdrawal from a non-owner", async () => {
    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

    try {
      await program.methods
        .withdraw(new anchor.BN(1000))
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

// ── update_watcher ────────────────────────────────────────────────────────────

describe("update_watcher", () => {
  it("updates the watcher to a new pubkey", async () => {
    const owner = provider.wallet.publicKey;
    const newWatcher = Keypair.generate();

    await program.methods.updateWatcher(newWatcher.publicKey).accounts({ owner }).rpc();

    const account = await program.account.vault.fetch(vaultAddress(owner));
    assert.ok(account.watcher.equals(newWatcher.publicKey));

    await program.methods.updateWatcher(watcher.publicKey).accounts({ owner }).rpc();
  });

  it("rejects setting watcher to the owner pubkey", async () => {
    const owner = provider.wallet.publicKey;

    try {
      await program.methods.updateWatcher(owner).accounts({ owner }).rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "WatcherCannotBeOwner");
    }
  });

  it("rejects setting watcher to the zero pubkey", async () => {
    const owner = provider.wallet.publicKey;

    try {
      await program.methods.updateWatcher(PublicKey.default).accounts({ owner }).rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.instanceOf(err, AnchorError);
      assert.equal((err as AnchorError).error.errorCode.code, "InvalidWatcher");
    }
  });

  it("rejects update from a non-owner", async () => {
    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

    try {
      await program.methods
        .updateWatcher(Keypair.generate().publicKey)
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});

// ── close_vault ───────────────────────────────────────────────────────────────

describe("close_vault", () => {
  it("closes the vault and returns all SOL to the owner", async () => {
    const owner = provider.wallet.publicKey;
    const vault = vaultAddress(owner);

    const ownerBefore = await provider.connection.getBalance(owner);

    await program.methods.closeVault().accounts({ owner }).rpc();

    assert.equal(await provider.connection.getBalance(vault), 0);
    assert.isAbove(await provider.connection.getBalance(owner), ownerBefore);
  });

  it("rejects close from a non-owner", async () => {
    const owner = Keypair.generate();
    await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

    await program.methods
      .createVault(watcher.publicKey, new anchor.BN(SIX_MONTHS), new anchor.BN(SEVEN_DAYS), new anchor.BN(0), [{ wallet: heir.publicKey, shareBps: 10000 }])
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();

    const stranger = Keypair.generate();
    await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

    try {
      await program.methods
        .closeVault()
        .accounts({ owner: stranger.publicKey })
        .signers([stranger])
        .rpc();
      assert.fail("expected error was not thrown");
    } catch (err) {
      assert.ok(err);
    }
  });
});
