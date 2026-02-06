// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IScorer {
    /**
     * @dev Returns the score of a specific user for a given score type.
     *      The score type is represented as a `bytes32` hash (e.g., keccak256("Trust")).
     *      The score is typically used to determine the user's eligibility for certain actions or claims.
     *      The exact logic for scoring is determined by the implementation of the contract that inherits this interface.
     *
     * @param user The address of the user whose score is being queried.
     * @param scoreType The type of score to query, represented as a `bytes32` hash.
     * @return The score of the user as a uint256 value.
     * @notice This function should be implemented in the contract that inherits the `IScorer` interface.
     */
    function score(address user, string memory scoreType) external view returns (uint256);

    /**
     * @dev Checks if the provided address is an admin.
     * @param admin The address to check for admin status.
     * @return True if the address is an admin, false otherwise.
     * @notice This function should be implemented in the contract that inherits the `IScorer` interface.
     */
    function isAdmin(address admin) external view returns (bool);
}
