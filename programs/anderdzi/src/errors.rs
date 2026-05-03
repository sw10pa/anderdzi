use anchor_lang::prelude::*;

#[error_code]
pub enum AnderdziError {
    #[msg("Shares must add up to 10000 basis points (100%)")]
    InvalidShares,

    #[msg("Too many beneficiaries — maximum is 10")]
    TooManyBeneficiaries,

    #[msg("Inactivity period has not elapsed yet")]
    NotInactive,

    #[msg("Vault has not been triggered")]
    NotTriggered,

    #[msg("Grace period has not elapsed yet")]
    GracePeriodActive,

    #[msg("Vault is already triggered")]
    AlreadyTriggered,

    #[msg("Unauthorized — only the vault owner can call this")]
    Unauthorized,

    #[msg("Unauthorized — only the trusted watcher can call this")]
    UnauthorizedWatcher,

    #[msg("Inactivity period must be at least 6 months")]
    InactivityPeriodTooShort,

    #[msg("Grace period must be at least 7 days")]
    GracePeriodTooShort,

    #[msg("No beneficiaries set")]
    NoBeneficiaries,

    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Withdrawal amount exceeds total deposited")]
    InsufficientFunds,

    #[msg("Duplicate beneficiary wallet address")]
    DuplicateBeneficiary,

    #[msg("Watcher cannot be the same as the vault owner")]
    WatcherCannotBeOwner,

    #[msg("Invalid watcher — cannot be the zero pubkey")]
    InvalidWatcher,
}
