/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/anderdzi.json`.
 */
export type Anderdzi = {
  "address": "6xgUzv1pYovTNK1QYAEK5xRdHeTwaum6rGX6AEJqhA1x",
  "metadata": {
    "name": "anderdzi",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "On-chain crypto inheritance protocol on Solana"
  },
  "instructions": [
    {
      "name": "cancelTrigger",
      "discriminator": [
        208,
        139,
        249,
        52,
        247,
        33,
        57,
        223
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "closeVault",
      "discriminator": [
        141,
        103,
        17,
        126,
        72,
        75,
        29,
        29
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "createVault",
      "discriminator": [
        29,
        237,
        247,
        208,
        193,
        82,
        54,
        135
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "enableWatcher",
          "type": "bool"
        },
        {
          "name": "inactivityPeriod",
          "type": "i64"
        },
        {
          "name": "gracePeriod",
          "type": "i64"
        },
        {
          "name": "depositAmount",
          "type": "u64"
        },
        {
          "name": "stakingEnabled",
          "type": "bool"
        },
        {
          "name": "beneficiaries",
          "type": {
            "vec": {
              "defined": {
                "name": "beneficiary"
              }
            }
          }
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disableStaking",
      "discriminator": [
        233,
        94,
        186,
        43,
        163,
        16,
        70,
        172
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vaultMsolAta",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "distribute",
      "discriminator": [
        191,
        44,
        223,
        207,
        164,
        236,
        126,
        61
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "enableStaking",
      "discriminator": [
        129,
        12,
        67,
        167,
        223,
        222,
        169,
        218
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vaultMsolAta",
          "docs": [
            "The vault's mSOL ATA — created if it doesn't exist yet."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "msolMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "msolMint",
          "address": "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "harvestYield",
      "discriminator": [
        28,
        200,
        150,
        200,
        69,
        56,
        38,
        133
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "vaultMsolAta",
          "writable": true
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryMsolAta",
          "docs": [
            "Protocol treasury's mSOL ATA. Validated: must be owned by the treasury PDA."
          ],
          "writable": true
        },
        {
          "name": "marinadeState",
          "address": "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeTreasury",
      "discriminator": [
        124,
        186,
        211,
        195,
        85,
        165,
        129,
        166
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "defaultWatcher",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "optInWatcher",
      "discriminator": [
        67,
        196,
        213,
        175,
        37,
        118,
        124,
        149
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "optOutWatcher",
      "discriminator": [
        105,
        19,
        154,
        82,
        74,
        133,
        166,
        2
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "ping",
      "discriminator": [
        173,
        0,
        94,
        236,
        73,
        133,
        225,
        153
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "setDefaultWatcher",
      "discriminator": [
        102,
        12,
        67,
        134,
        142,
        28,
        184,
        201
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "treasury"
          ]
        }
      ],
      "args": [
        {
          "name": "newWatcher",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "stakeDeposit",
      "discriminator": [
        75,
        168,
        115,
        239,
        194,
        115,
        22,
        98
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vaultMsolAta",
          "writable": true
        },
        {
          "name": "marinadeProgram",
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "marinadeState",
          "writable": true,
          "address": "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"
        },
        {
          "name": "msolMint",
          "writable": true,
          "address": "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
        },
        {
          "name": "liqPoolSolLegPda",
          "writable": true
        },
        {
          "name": "liqPoolMsolLeg",
          "writable": true
        },
        {
          "name": "liqPoolMsolLegAuthority"
        },
        {
          "name": "reservePda",
          "writable": true
        },
        {
          "name": "msolMintAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "trigger",
      "discriminator": [
        215,
        172,
        161,
        36,
        115,
        157,
        116,
        147
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "unstakeWithdraw",
      "discriminator": [
        242,
        202,
        10,
        84,
        133,
        137,
        101,
        12
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vaultMsolAta",
          "writable": true
        },
        {
          "name": "marinadeProgram",
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "marinadeState",
          "writable": true,
          "address": "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"
        },
        {
          "name": "msolMint",
          "writable": true,
          "address": "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
        },
        {
          "name": "liqPoolSolLegPda",
          "writable": true
        },
        {
          "name": "liqPoolMsolLeg",
          "writable": true
        },
        {
          "name": "marinadeTreasuryMsol",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "solAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateBeneficiaries",
      "discriminator": [
        218,
        168,
        29,
        227,
        70,
        149,
        250,
        31
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        }
      ],
      "args": [
        {
          "name": "beneficiaries",
          "type": {
            "vec": {
              "defined": {
                "name": "beneficiary"
              }
            }
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawFees",
      "discriminator": [
        198,
        212,
        171,
        109,
        144,
        215,
        174,
        89
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "destination",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "witnessActivity",
      "discriminator": [
        147,
        10,
        243,
        120,
        197,
        30,
        108,
        98
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "watcher",
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "treasury",
      "discriminator": [
        238,
        239,
        123,
        238,
        89,
        1,
        168,
        253
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidShares",
      "msg": "Shares must add up to 10000 basis points (100%)"
    },
    {
      "code": 6001,
      "name": "tooManyBeneficiaries",
      "msg": "Too many beneficiaries — maximum is 10"
    },
    {
      "code": 6002,
      "name": "notInactive",
      "msg": "Inactivity period has not elapsed yet"
    },
    {
      "code": 6003,
      "name": "notTriggered",
      "msg": "Vault has not been triggered"
    },
    {
      "code": 6004,
      "name": "gracePeriodActive",
      "msg": "Grace period has not elapsed yet"
    },
    {
      "code": 6005,
      "name": "alreadyTriggered",
      "msg": "Vault is already triggered"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Unauthorized — only the vault owner can call this"
    },
    {
      "code": 6007,
      "name": "unauthorizedWatcher",
      "msg": "Unauthorized — only the trusted watcher can call this"
    },
    {
      "code": 6008,
      "name": "inactivityPeriodTooShort",
      "msg": "Inactivity period must be at least 6 months"
    },
    {
      "code": 6009,
      "name": "gracePeriodTooShort",
      "msg": "Grace period must be at least 7 days"
    },
    {
      "code": 6010,
      "name": "noBeneficiaries",
      "msg": "No beneficiaries set"
    },
    {
      "code": 6011,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6012,
      "name": "insufficientFunds",
      "msg": "Withdrawal amount exceeds total deposited"
    },
    {
      "code": 6013,
      "name": "duplicateBeneficiary",
      "msg": "Duplicate beneficiary wallet address"
    },
    {
      "code": 6014,
      "name": "beneficiaryAccountMismatch",
      "msg": "Beneficiary accounts must match the stored list in order"
    },
    {
      "code": 6015,
      "name": "stakingNotEnabled",
      "msg": "Staking is not enabled for this vault"
    },
    {
      "code": 6016,
      "name": "invalidMarinadeProgram",
      "msg": "Invalid Marinade program account"
    },
    {
      "code": 6017,
      "name": "invalidMarinadeState",
      "msg": "Invalid Marinade state account"
    },
    {
      "code": 6018,
      "name": "invalidMsolMint",
      "msg": "Invalid mSOL mint account"
    },
    {
      "code": 6019,
      "name": "noYieldAvailable",
      "msg": "No yield available to harvest"
    },
    {
      "code": 6020,
      "name": "useUnstakeWithdraw",
      "msg": "Staking is enabled — use unstake_withdraw instead"
    },
    {
      "code": 6021,
      "name": "watcherNotEnabled",
      "msg": "Watcher is not enabled for this vault"
    },
    {
      "code": 6022,
      "name": "noDefaultWatcher",
      "msg": "No default watcher configured in treasury"
    },
    {
      "code": 6023,
      "name": "invalidWatcher",
      "msg": "Invalid watcher — cannot be the zero pubkey"
    },
    {
      "code": 6024,
      "name": "watcherCannotBeOwner",
      "msg": "Watcher cannot be the same as the vault owner"
    },
    {
      "code": 6025,
      "name": "stakingAlreadyEnabled",
      "msg": "Staking is already enabled for this vault"
    },
    {
      "code": 6026,
      "name": "stakingAlreadyDisabled",
      "msg": "Staking is already disabled for this vault"
    },
    {
      "code": 6027,
      "name": "stakingMustBeDisabled",
      "msg": "Staking must be disabled before distribution (trigger should have done this)"
    },
    {
      "code": 6028,
      "name": "invalidMarinadeAccounts",
      "msg": "Invalid or missing Marinade accounts in remaining_accounts"
    },
    {
      "code": 6029,
      "name": "stakingStillEnabled",
      "msg": "Cannot close vault while staking is enabled — disable staking first"
    }
  ],
  "types": [
    {
      "name": "beneficiary",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "shareBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "treasury",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "defaultWatcher",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "watcherEnabled",
            "type": "bool"
          },
          {
            "name": "inactivityPeriod",
            "type": "i64"
          },
          {
            "name": "lastHeartbeat",
            "type": "i64"
          },
          {
            "name": "gracePeriod",
            "type": "i64"
          },
          {
            "name": "triggeredAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "beneficiaries",
            "type": {
              "vec": {
                "defined": {
                  "name": "beneficiary"
                }
              }
            }
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "stakingEnabled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
