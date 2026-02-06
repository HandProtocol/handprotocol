// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract ProxyDeployer {
    address public proxy;

    // Deploy the TransparentUpgradeableProxy
    constructor(address _implementation, address _admin) {
        proxy = address(new TransparentUpgradeableProxy(
            _implementation, // Implementation address
            _admin,          // Admin address (can upgrade the implementation)
            ""               // Initialization data (empty string if no constructor parameters)
        ));
    }
}
