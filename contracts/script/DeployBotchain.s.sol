// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TipStream} from "../src/TipStream.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployBotchain {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (TipStream deployed) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        deployed = new TipStream();
        vm.stopBroadcast();
    }
}
