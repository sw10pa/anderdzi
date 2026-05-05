pub mod admin_rotate_watcher;
pub mod cancel_trigger;
pub mod close_vault;
pub mod create_vault;
pub mod deposit;
pub mod distribute;
pub mod harvest_yield;
pub mod initialize_treasury;
pub mod ping;
pub mod stake_deposit;
pub mod trigger;
pub mod unstake_withdraw;
pub mod update_beneficiaries;
pub mod update_watcher;
pub mod withdraw;
pub mod withdraw_fees;
pub mod witness_activity;

// Wildcard re-exports bring the account structs and their Anchor-generated
// client-account modules (needed by the #[program] macro) into scope.
// Each instruction module also exports a `handler` fn — the ambiguity is fine
// because handler is always called via its full module path, never directly.
#[allow(ambiguous_glob_reexports)]
pub use admin_rotate_watcher::*;
pub use cancel_trigger::*;
pub use close_vault::*;
pub use create_vault::*;
pub use deposit::*;
pub use distribute::*;
pub use harvest_yield::*;
pub use initialize_treasury::*;
pub use ping::*;
pub use stake_deposit::*;
pub use trigger::*;
pub use unstake_withdraw::*;
pub use update_beneficiaries::*;
pub use update_watcher::*;
pub use withdraw::*;
pub use withdraw_fees::*;
pub use witness_activity::*;
