pub mod close_vault;
pub mod create_vault;
pub mod deposit;
pub mod withdraw;

// Wildcard re-exports bring the account structs and their Anchor-generated
// client-account modules (needed by the #[program] macro) into scope.
// Each instruction module also exports a `handler` fn — the ambiguity is fine
// because handler is always called via its full module path, never directly.
#[allow(ambiguous_glob_reexports)]
pub use close_vault::*;
pub use create_vault::*;
pub use deposit::*;
pub use withdraw::*;
