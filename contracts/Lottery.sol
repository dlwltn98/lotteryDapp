// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Lottery {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function getSomeValue() public pure returns(uint256 value) {
        return 5;
    }
}