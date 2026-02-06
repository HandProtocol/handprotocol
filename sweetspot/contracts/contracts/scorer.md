# Scorer Contract Documentation

## Overview

The `Scorer` contract is a decentralized system for managing user scores. It allows the addition and removal of score types, setting and retrieving scores for users, and includes role-based access control to secure score modifications. The contract implements a flexible scoring system where administrators can manage scores based on different types. It utilizes the `OwnableUpgradeable` and `AccessControlUpgradeable` contracts from OpenZeppelin to ensure secure administration.

---

## Table of Contents

- [Contract Overview](#overview)
- [State Variables](#state-variables)
- [Constructor and Initialization](#constructor-and-initialization)
- [Functions](#functions)
  - [addScoreType](#addscoretype)
  - [removeScoreType](#removescoretype)
  - [setScore](#setscore)
  - [score](#score)
  - [addAdmin](#addadmin)
  - [removeAdmin](#removeadmin)
  - [isAdmin](#isadmin)
- [Events](#events)
  - [ScoreUpdated](#scoreupdated)
  - [ScoreTypeAdded](#scoretypeadded)
  - [ScoreTypeRemoved](#scoretyperemoved)
  - [AdminAdded](#adminadded)
  - [AdminRemoved](#adminremoved)

---

## State Variables

- **`bytes32 public constant ADMIN_ROLE`**: Defines the `ADMIN_ROLE` role used for assigning administrative privileges.

- **`mapping(address => mapping(string => uint256)) private _scores`**: A nested mapping that stores user scores by address and score type.

- **`string[] public scoreTypes`**: A list of all score types that exist in the system.

---

## Constructor and Initialization

### `initialize(address owner) external initializer`

Initializes the contract by setting the owner and assigning them the `DEFAULT_ADMIN_ROLE` and `ADMIN_ROLE`. This function is called only once during the contract's deployment.

- **Parameters**:
  - `owner`: The address of the owner who will have full control of the contract.

---

## Functions

### `addScoreType(string memory scoreType) external onlyOwner`

Adds a new score type to the system. This function is restricted to the contract owner.

- **Parameters**:
  - `scoreType`: The name of the new score type to be added.

### `removeScoreType(string memory scoreType) external onlyOwner`

Removes an existing score type from the system. This function is restricted to the contract owner.

- **Parameters**:
  - `scoreType`: The name of the score type to be removed.

- **Reverts** if the score type is not found in the list.

### `setScore(address user, string memory scoreType, uint256 newScore) external onlyRole(ADMIN_ROLE)`

Sets the score for a specific user and score type. This function is restricted to users with the `ADMIN_ROLE`.

- **Parameters**:
  - `user`: The address of the user whose score is being updated.
  - `scoreType`: The type of the score being updated.
  - `newScore`: The new score value.

- **Emits** the `ScoreUpdated` event.

### `score(address user, string memory scoreType) external view returns (uint256)`

Retrieves the current score of a specific user for a given score type.

- **Parameters**:
  - `user`: The address of the user whose score is being retrieved.
  - `scoreType`: The type of the score to retrieve.

- **Returns** the score value for the user and score type.

### `addAdmin(address admin) external onlyOwner`

Adds an address to the `ADMIN_ROLE`. This function is restricted to the contract owner.

- **Parameters**:
  - `admin`: The address to be added as an admin.

- **Emits** the `AdminAdded` event.

### `removeAdmin(address admin) external onlyOwner`

Removes an address from the `ADMIN_ROLE`. This function is restricted to the contract owner.

- **Parameters**:
  - `admin`: The address to be removed from the admin role.

- **Emits** the `AdminRemoved` event.

### `isAdmin(address admin) external view returns (bool)`

Checks if an address has the `ADMIN_ROLE`.

- **Parameters**:
  - `admin`: The address to check.

- **Returns** `true` if the address has the `ADMIN_ROLE`, otherwise `false`.

---

## Events

### `ScoreUpdated(address indexed user, string scoreType, uint256 newScore, uint256 oldScore)`

Emitted when a score is updated for a user.

- **Parameters**:
  - `user`: The address of the user whose score was updated.
  - `scoreType`: The type of score that was updated.
  - `newScore`: The new score value.
  - `oldScore`: The previous score value.

### `ScoreTypeAdded(string scoreType)`

Emitted when a new score type is added to the system.

- **Parameters**:
  - `scoreType`: The name of the new score type.

### `ScoreTypeRemoved(string scoreType)`

Emitted when a score type is removed from the system.

- **Parameters**:
  - `scoreType`: The name of the score type that was removed.

### `AdminAdded(address indexed admin)`

Emitted when a new admin is added to the contract.

- **Parameters**:
  - `admin`: The address of the new admin.

### `AdminRemoved(address indexed admin)`

Emitted when an admin is removed from the contract.

- **Parameters**:
  - `admin`: The address of the removed admin.
