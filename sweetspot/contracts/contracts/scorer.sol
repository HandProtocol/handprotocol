// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title Scorer
 * @dev A contract for managing user scores by type, using AccessControl for admin privileges.
 */
contract Scorer is OwnableUpgradeable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Mapping: user => (scoreType => scoreValue)
    mapping(address => mapping(string => uint128)) private _scores;

    /// @notice Additional mapping for O(1) existence checks
    mapping(string => bool) private scoreTypeExists;

    /// @notice Emitted when a user's score is updated
    event ScoreUpdated(
        address indexed user,
        string scoreType,
        uint256 newScore,
        uint256 oldScore
    );

    /// @notice Emitted when a new score type is added
    event ScoreTypeAdded(string scoreType);

    /// @notice Emitted when a score type is removed
    event ScoreTypeRemoved(string scoreType);

    /// @dev Custom errors for cheaper revert messages
    error ScoreTypeNotFound(string scoreType);
    error DuplicateScoreType(string scoreType);

    /**
     * @notice Initializes the contract by setting up its initial state.
     * @param owner The owner address.
     */
    function initialize(address owner) external initializer {
        __Ownable_init(owner);
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(ADMIN_ROLE, owner);
    }

    /**
     * @notice Adds a new score type. Reverts if it already exists.
     * @param scoreType The name of the score type to add.
     */
    function addScoreType(string memory scoreType)
        external
        onlyOwner
    {
        if (scoreTypeExists[scoreType]) {
            revert DuplicateScoreType(scoreType);
        }
        scoreTypeExists[scoreType] = true;

        emit ScoreTypeAdded(scoreType);
    }

    /**
     * @notice Removes an existing score type. Reverts if it doesn't exist.
     * @param scoreType The name of the score type to remove.
     */
    function removeScoreType(string memory scoreType)
        external
        onlyOwner
    {
        if (!scoreTypeExists[scoreType]) {
            revert ScoreTypeNotFound(scoreType);
        }

        // Mark it as non-existing in the mapping
        scoreTypeExists[scoreType] = false;

        // Shouldn't ever reach here if the mapping is correct,
        // but included as a safeguard:
        revert ScoreTypeNotFound(scoreType);
    }

    /**
     * @notice Sets the score for a specific user and type.
     * @param user The address of the user.
     * @param scoreType The type of the score.
     * @param newScore The new score value.
     */
    function setScore(
        address user,
        string memory scoreType,
        uint128 newScore
    )
        external
        onlyRole(ADMIN_ROLE)
    {
        if (!scoreTypeExists[scoreType]) {
            revert ScoreTypeNotFound(scoreType);
        }
        // (Optional) If you don't want to allow setting score for address(0):
        // require(user != address(0), "Cannot set score for zero address");

        uint128 oldScore = _scores[user][scoreType];
        _scores[user][scoreType] = newScore;

        emit ScoreUpdated(user, scoreType, newScore, oldScore);
    }

    /**
     * @notice Retrieves the score of a specific user for a given type.
     * @param user The address of the user.
     * @param scoreType The type of the score.
     * @return The score value (uint128).
     */
    function score(address user, string memory scoreType)
        external
        view
        returns (uint128)
    {
        return _scores[user][scoreType];
    }

    /**
     * @notice Grants the ADMIN_ROLE to a specified address.
     * @param admin The address to be granted admin privileges.
     */
    function addAdmin(address admin) external onlyOwner {
        grantRole(ADMIN_ROLE, admin);
    }

    /**
     * @notice Revokes the ADMIN_ROLE from a specified address.
     * @param admin The address to be revoked of admin privileges.
     */
    function removeAdmin(address admin) external onlyOwner {
        revokeRole(ADMIN_ROLE, admin);
    }

    /**
     * @notice Checks if a given address has the ADMIN_ROLE.
     * @param admin The address to be checked.
     * @return True if the address has admin privileges, false otherwise.
     */
    function isAdmin(address admin) external view returns (bool) {
        return hasRole(ADMIN_ROLE, admin);
    }
}
