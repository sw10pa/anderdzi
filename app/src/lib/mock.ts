export const MOCK_ENABLED = false;

export type VaultStateKey = "ACTIVE" | "TRIGGERED" | "NO_STAKING" | "NO_VAULT" | "DISCONNECTED";

export type Beneficiary = { address: string; percentage: number };

export type VaultStatus = "ACTIVE" | "TRIGGERED" | "DISTRIBUTED";

export type Vault = {
  address: string;
  status: VaultStatus;
  inactivityPeriodDays: number;
  daysUntilTrigger: number;
  gracePeriodDays: number;
  graceRemainingDays?: number;
  lastSeenDays: number;
  deposited: number;
  yield: number;
  beneficiaries: Beneficiary[];
  watcherEnabled: boolean;
  stakingEnabled: boolean;
  telegramEnabled: boolean;
  telegramChatId?: string;
};

export const mockWalletAddress = "7xKp...3mNq";
export const mockSolBalance = 4.2819;
export const mockYield = 0.0312;

const baseBeneficiaries: Beneficiary[] = [
  { address: "9aBcD3fGhJ4kLmN5pQrS6tUvW7xYzA8bCdE9fGhJ0kLm", percentage: 50 },
  { address: "3xYzW2vUtS1rQpO0nMlK9jHgF8eDcB7aZyXwVuT6sRqP", percentage: 30 },
  { address: "5mNoP4qRsT3uVwX2yZa1bCdE0fGhJ9kLmN8oPqR7sTuV", percentage: 20 },
];

export const mockVaultActive: Vault = {
  address: "FvAuLT8anderdziVAULTaddress9999000011112222",
  status: "ACTIVE",
  inactivityPeriodDays: 365,
  daysUntilTrigger: 45,
  gracePeriodDays: 14,
  lastSeenDays: 320,
  deposited: 4.2819,
  yield: 0.0312,
  beneficiaries: baseBeneficiaries,
  watcherEnabled: true,
  stakingEnabled: true,
  telegramEnabled: false,
};

export const mockVaultTriggered: Vault = {
  ...mockVaultActive,
  status: "TRIGGERED",
  daysUntilTrigger: 0,
  graceRemainingDays: 4,
  lastSeenDays: 365,
};

export const mockVaultNoStaking: Vault = {
  ...mockVaultActive,
  stakingEnabled: false,
  yield: 0,
};