# SweetSpot Contract Documentation

## Overview

The `sweetspot.sol` contract allows users to deposit Ether or ERC20 tokens and claim a specified amount based on their eligibility. The contract incorporates a round-based system, where each round is defined by a start time, end time, and metadata URI. It leverages the `IScorer` interface to ensure claimants meet specific eligibility criteria based on their scores.

---

## Table of Contents
1. [Features](#features)
2. [State Variables](#state-variables)

---

## Features
- **Multi-token Support**: Accepts Ether and any ERC20 token deposits.
- **Round System**: Manages deposit and claim activity within predefined time rounds.
- **Eligibility Checks**: Validates claimants using an external scoring system.
- **Flexible Withdrawal**: Allows the owner to withdraw both Ether and ERC20 tokens.
- **Decentralized Metadata**: Utilizes IPFS URIs for round metadata.

---

## State Variables

### Constants
- `ETHER`: Address placeholder for Ether transactions.

### Structs
- **`Round`**:
  - `start`: Start timestamp of the round.
  - `end`: End timestamp of the round.
  - `metadataURI`: IPFS URI for metadata associated with the round.

### Public Variables
- `scorer`: The address of the scoring contract implementing `IScorer`.
- `currentRound`: Stores details of the ongoing round using the `Round` struct.
- `totalBalances`: Mapping to track the total balance of each token (including Ether).
- `allowedAmounts`: Nested mapping to track the allowed claimable amount for each user per token.
