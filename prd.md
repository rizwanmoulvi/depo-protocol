Sure! Here's a clean **Product Requirements Document (PRD)** for your project in **Markdown format**, tailored for a hackathon submission or team onboarding.

---

# 🏠 Rent Security Deposit Escrow on Aptos + Aave

## 1. Overview

A decentralized **Security Deposit Escrow System** for rental agreements where:

| Actor    | Role                                                         |
| -------- | ------------------------------------------------------------ |
| Landlord | Creates rental agreement defining deposit, rent and term.    |
| Tenant   | Reviews and deposits USDC into on-chain escrow.              |
| Platform | Holds funds in **Aave** to earn yield on behalf of landlord. |

At the **end of rental term**:

* **Principal → returned to Tenant**
* **Yield → paid to Landlord**
* **Platform Fee → taken from yield**

Supports **testnet first**, then **mainnet deployment**.

---

## 2. Goals & Non-Goals

### ✅ Goals

* Trustless rent deposit system — **no centralized custody**
* Passive **yield generation via Aave** while funds are locked
* Permissionless **settlement callable by anyone** after term
* Designed for **short-term hackathon launch**, extensible later

### ❌ Non-Goals (for MVP)

* Partial withdrawals / early termination workflows
* Support for multiple tokens (USDC only for now)
* Dispute or KYC mechanics
* Automated eviction logic

---

## 3. Architecture

```mermaid
flowchart TD
    A[Landlord Creates Agreement] --> B[Stored On Aptos Contract]
    C[Tenant Signs & Deposits USDC] --> D[Contract Supplies to Aave]
    D --> E[Contract Receives aTokens]
    F[Term Ends] --> G[Anyone Calls Settle()]
    G -->|Principal| H([Tenant])
    G -->|Yield| I([Landlord])
    G -->|Platform Fee| J([Treasury Wallet])
```

---

## 4. Core On-Chain Components

| Contract Part        | Responsibility                                          |
| -------------------- | ------------------------------------------------------- |
| `EscrowRegistry`     | Maintains agreements by ID                              |
| `Escrow` struct      | Stores landlord, tenant, USDC deposit, term, fee params |
| `AaveAdapter` module | Wraps Aave supply/withdraw logic                        |
| `Config`             | Stores `platform_treasury` address                      |

Move module draft: *(already built here →)*
👉 `./Escrow.move` (see canvas above)

---

## 5. Off-Chain Components

| Component                     | Purpose                                        | SDK                    |
| ----------------------------- | ---------------------------------------------- | ---------------------- |
| Transaction UI                | Landlord/Tenant interactions                   | Aptos Wallet Adapter   |
| Hooks for Aave deposit/view   | Display estimated APY/yield                    | `aave-v3-aptos-ts-sdk` |
| Settlement Watcher (Optional) | Cron or Node script to auto-trigger settlement | Aptos SDK              |

---

## 6. External References

| Resource              | Link                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Aave Aptos SDK Docs   | [https://aave.github.io/aave-v3-aptos-ts-sdk/index.html](https://aave.github.io/aave-v3-aptos-ts-sdk/index.html) |
| Aptos Developer Docs  | [https://aptos.dev](https://aptos.dev)                                                                           |
| Aave Governance Forum | [https://governance.aave.com](https://governance.aave.com)                                                       |
| Aptos Testnet Faucet  | [https://faucet.aptoslabs.com](https://faucet.aptoslabs.com)                                                     |

---

## 7. User Flow

### Landlord Flow

1. Connect wallet → "Create Escrow"
2. Input:

   * Tenant Address
   * Property Name + Address
   * Security Deposit (USDC)
   * Start / End Timestamp
3. Sign Transaction → Escrow Created

### Tenant Flow

1. Sees pending agreement → Click "Deposit"
2. Approve USDC to Escrow Contract
3. Triggers `tenant_deposit_and_supply` → Funds auto-deposited to Aave

### Settlement

* After `end_ts`, **anyone** (or auto-cron) can call `settle()`

---

## 8. Future Expansion (Post-Hackathon)

| Feature             | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| Insurance & Damages | Allow landlord to deduct from principal with tenant approval |
| Rent Streaming      | Monthly payments via Superfluid/Aptos streams                |
| NFT Receipt         | Mint proof-of-deposit NFT                                    |

---

Let me know:

**Do you want a matching README for GitHub with badges + setup instructions?**
Or should I **generate a pitch deck slide based on this PRD?**
