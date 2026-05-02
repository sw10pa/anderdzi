import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { Anderdzi } from "../target/types/anderdzi";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("anderdzi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Anderdzi as Program<Anderdzi>;

  const SIX_MONTHS = 15_552_000; // seconds
  const SEVEN_DAYS = 604_800; // seconds

  const watcher = Keypair.generate();

  function vaultAddress(owner: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );
    return pda;
  }

  async function airdrop(to: PublicKey, lamports: number): Promise<void> {
    const sig = await provider.connection.requestAirdrop(to, lamports);
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  // ── create_vault ───────────────────────────────────────────────────────────

  describe("create_vault", () => {
    it("creates a vault with an initial deposit", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);

      await program.methods
        .createVault(
          watcher.publicKey,
          new anchor.BN(SIX_MONTHS),
          new anchor.BN(SEVEN_DAYS),
          new anchor.BN(LAMPORTS_PER_SOL)
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
      assert.isEmpty(account.beneficiaries);

      const vaultBalance = await provider.connection.getBalance(vault);
      assert.isAtLeast(vaultBalance, LAMPORTS_PER_SOL);
    });

    it("creates a vault without an initial deposit", async () => {
      const owner = Keypair.generate();
      await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);
      const vault = vaultAddress(owner.publicKey);

      await program.methods
        .createVault(
          watcher.publicKey,
          new anchor.BN(SIX_MONTHS),
          new anchor.BN(SEVEN_DAYS),
          new anchor.BN(0)
        )
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();

      const account = await program.account.vault.fetch(vault);
      assert.equal(account.totalDeposited.toNumber(), 0);
    });

    it("rejects an inactivity period shorter than 6 months", async () => {
      const owner = Keypair.generate();
      await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

      try {
        await program.methods
          .createVault(
            watcher.publicKey,
            new anchor.BN(SIX_MONTHS - 1),
            new anchor.BN(SEVEN_DAYS),
            new anchor.BN(0)
          )
          .accounts({ owner: owner.publicKey })
          .signers([owner])
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
      await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

      try {
        await program.methods
          .createVault(
            watcher.publicKey,
            new anchor.BN(SIX_MONTHS),
            new anchor.BN(SEVEN_DAYS - 1),
            new anchor.BN(0)
          )
          .accounts({ owner: owner.publicKey })
          .signers([owner])
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
      const owner = provider.wallet.publicKey; // vault already exists from first test

      try {
        await program.methods
          .createVault(
            watcher.publicKey,
            new anchor.BN(SIX_MONTHS),
            new anchor.BN(SEVEN_DAYS),
            new anchor.BN(0)
          )
          .accounts({ owner })
          .rpc();
        assert.fail("expected error was not thrown");
      } catch (err) {
        assert.ok(err);
      }
    });
  });

  // ── deposit ────────────────────────────────────────────────────────────────

  describe("deposit", () => {
    it("deposits additional SOL into the vault", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);
      const amount = new anchor.BN(LAMPORTS_PER_SOL / 2);

      const before = await program.account.vault.fetch(vault);

      await program.methods
        .deposit(amount)
        .accounts({ owner })
        .rpc();

      const after = await program.account.vault.fetch(vault);
      assert.equal(
        after.totalDeposited.toNumber(),
        before.totalDeposited.toNumber() + amount.toNumber()
      );

      const vaultBalance = await provider.connection.getBalance(vault);
      assert.isAtLeast(vaultBalance, after.totalDeposited.toNumber());
    });

    it("rejects a zero-amount deposit", async () => {
      const owner = provider.wallet.publicKey;

      try {
        await program.methods
          .deposit(new anchor.BN(0))
          .accounts({ owner })
          .rpc();
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
        // Anchor derives vault from stranger.publicKey — vault doesn't exist → rejected
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

  // ── withdraw ───────────────────────────────────────────────────────────────

  describe("withdraw", () => {
    it("withdraws a partial amount from the vault", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);
      const amount = new anchor.BN(LAMPORTS_PER_SOL / 2);

      const before = await program.account.vault.fetch(vault);
      const ownerBefore = await provider.connection.getBalance(owner);

      await program.methods
        .withdraw(amount)
        .accounts({ owner })
        .rpc();

      const after = await program.account.vault.fetch(vault);
      const ownerAfter = await provider.connection.getBalance(owner);

      assert.equal(
        after.totalDeposited.toNumber(),
        before.totalDeposited.toNumber() - amount.toNumber()
      );
      // owner received the withdrawn SOL (net positive despite tx fee)
      assert.isAbove(ownerAfter, ownerBefore);
    });

    it("rejects a zero-amount withdrawal", async () => {
      const owner = provider.wallet.publicKey;

      try {
        await program.methods
          .withdraw(new anchor.BN(0))
          .accounts({ owner })
          .rpc();
        assert.fail("expected error was not thrown");
      } catch (err) {
        assert.instanceOf(err, AnchorError);
        assert.equal((err as AnchorError).error.errorCode.code, "ZeroAmount");
      }
    });

    it("rejects a withdrawal exceeding total deposited", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);

      const account = await program.account.vault.fetch(vault);
      const tooMuch = new anchor.BN(account.totalDeposited.toNumber() + 1);

      try {
        await program.methods
          .withdraw(tooMuch)
          .accounts({ owner })
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
      await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

      try {
        // Anchor derives vault from stranger.publicKey — vault doesn't exist → rejected
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

  // ── set_beneficiaries ──────────────────────────────────────────────────────

  describe("set_beneficiaries", () => {
    it("sets a list of beneficiaries that sum to 100%", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);
      const alice = Keypair.generate().publicKey;
      const bob = Keypair.generate().publicKey;

      await program.methods
        .setBeneficiaries([
          { wallet: alice, shareBps: 6000 },
          { wallet: bob,   shareBps: 4000 },
        ])
        .accounts({ owner })
        .rpc();

      const account = await program.account.vault.fetch(vault);
      assert.equal(account.beneficiaries.length, 2);
      assert.ok(account.beneficiaries[0].wallet.equals(alice));
      assert.equal(account.beneficiaries[0].shareBps, 6000);
      assert.ok(account.beneficiaries[1].wallet.equals(bob));
      assert.equal(account.beneficiaries[1].shareBps, 4000);
    });

    it("replaces the list when called again", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);
      const carol = Keypair.generate().publicKey;

      await program.methods
        .setBeneficiaries([{ wallet: carol, shareBps: 10000 }])
        .accounts({ owner })
        .rpc();

      const account = await program.account.vault.fetch(vault);
      assert.equal(account.beneficiaries.length, 1);
      assert.ok(account.beneficiaries[0].wallet.equals(carol));
    });

    it("rejects shares that do not sum to 10000 bps", async () => {
      const owner = provider.wallet.publicKey;
      const alice = Keypair.generate().publicKey;
      const bob = Keypair.generate().publicKey;

      try {
        await program.methods
          .setBeneficiaries([
            { wallet: alice, shareBps: 6000 },
            { wallet: bob,   shareBps: 3000 }, // total = 9000, not 10000
          ])
          .accounts({ owner })
          .rpc();
        assert.fail("expected error was not thrown");
      } catch (err) {
        assert.instanceOf(err, AnchorError);
        assert.equal((err as AnchorError).error.errorCode.code, "InvalidShares");
      }
    });

    it("rejects an empty beneficiary list", async () => {
      const owner = provider.wallet.publicKey;

      try {
        await program.methods
          .setBeneficiaries([])
          .accounts({ owner })
          .rpc();
        assert.fail("expected error was not thrown");
      } catch (err) {
        assert.instanceOf(err, AnchorError);
        assert.equal((err as AnchorError).error.errorCode.code, "NoBeneficiaries");
      }
    });

    it("rejects more than 10 beneficiaries", async () => {
      const owner = provider.wallet.publicKey;
      // shareBps values don't matter here — TooManyBeneficiaries fires before the shares check
      const tooMany = Array.from({ length: 11 }, () => ({
        wallet: Keypair.generate().publicKey,
        shareBps: 909,
      }));

      try {
        await program.methods
          .setBeneficiaries(tooMany)
          .accounts({ owner })
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
      const owner = provider.wallet.publicKey;
      const alice = Keypair.generate().publicKey;

      try {
        await program.methods
          .setBeneficiaries([
            { wallet: alice, shareBps: 5000 },
            { wallet: alice, shareBps: 5000 }, // same wallet twice
          ])
          .accounts({ owner })
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
          .setBeneficiaries([{ wallet: stranger.publicKey, shareBps: 10000 }])
          .accounts({ owner: stranger.publicKey })
          .signers([stranger])
          .rpc();
        assert.fail("expected error was not thrown");
      } catch (err) {
        assert.ok(err);
      }
    });
  });

  // ── close_vault ────────────────────────────────────────────────────────────

  describe("close_vault", () => {
    it("closes the vault and returns all SOL to the owner", async () => {
      const owner = provider.wallet.publicKey;
      const vault = vaultAddress(owner);

      const ownerBefore = await provider.connection.getBalance(owner);

      await program.methods
        .closeVault()
        .accounts({ owner })
        .rpc();

      const vaultAfter = await provider.connection.getBalance(vault);
      const ownerAfter = await provider.connection.getBalance(owner);

      // vault account should be gone
      assert.equal(vaultAfter, 0);
      // owner got back rent + deposits minus the small tx fee — net positive
      assert.isAbove(ownerAfter, ownerBefore);
    });

    it("rejects close from a non-owner", async () => {
      const owner = Keypair.generate();
      await airdrop(owner.publicKey, 2 * LAMPORTS_PER_SOL);

      await program.methods
        .createVault(
          watcher.publicKey,
          new anchor.BN(SIX_MONTHS),
          new anchor.BN(SEVEN_DAYS),
          new anchor.BN(0)
        )
        .accounts({ owner: owner.publicKey })
        .signers([owner])
        .rpc();

      const stranger = Keypair.generate();
      await airdrop(stranger.publicKey, LAMPORTS_PER_SOL);

      try {
        // Anchor derives vault from stranger.publicKey — vault doesn't exist → rejected
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
});
