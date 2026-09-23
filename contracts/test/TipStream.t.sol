// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TipStream} from "../src/TipStream.sol";

interface Vm {
    function warp(uint256) external;
    function deal(address, uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}

contract TipStreamTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    TipStream private stream;
    address private constant SENDER = address(0xA11CE);
    address private constant RECIPIENT = address(0xB0B);

    function setUp() public {
        stream = new TipStream();
        vm.deal(SENDER, 100 ether);
        vm.warp(1_700_000_000);
    }

    function testCreateStream() public {
        uint256 id = _create(10 ether, 2 hours);
        TipStream.Stream memory created = stream.getStream(id);

        _assertEq(created.sender, SENDER);
        _assertEq(created.recipient, RECIPIENT);
        _assertEq(created.deposit, 10 ether);
        _assertEq(created.endTime - created.startTime, 2 hours);
        _assertEq(address(stream).balance, 10 ether);
    }

    function testTimeCalculationsAtBoundariesAndMidpoint() public {
        uint256 id = _create(10 ether, 2 hours);
        TipStream.Stream memory created = stream.getStream(id);

        _assertEq(stream.vestedAmount(id), 0);
        vm.warp(created.startTime + 1 hours);
        _assertEq(stream.vestedAmount(id), 5 ether);
        vm.warp(created.endTime);
        _assertEq(stream.vestedAmount(id), 10 ether);
        vm.warp(created.endTime + 30 days);
        _assertEq(stream.vestedAmount(id), 10 ether);
    }

    function testRecipientCanWithdrawIncrementally() public {
        uint256 id = _create(10 ether, 2 hours);
        TipStream.Stream memory created = stream.getStream(id);
        vm.warp(created.startTime + 30 minutes);

        vm.prank(RECIPIENT);
        stream.withdraw(id);
        _assertEq(RECIPIENT.balance, 2.5 ether);

        vm.warp(created.endTime);
        vm.prank(RECIPIENT);
        stream.withdraw(id);
        _assertEq(RECIPIENT.balance, 10 ether);
        _assertEq(address(stream).balance, 0);
    }

    function testCancellationRefundsUnvestedAndPreservesRecipientShare() public {
        uint256 id = _create(10 ether, 2 hours);
        TipStream.Stream memory created = stream.getStream(id);
        vm.warp(created.startTime + 30 minutes);
        uint256 senderBefore = SENDER.balance;

        vm.prank(SENDER);
        stream.cancel(id);
        _assertEq(SENDER.balance, senderBefore + 7.5 ether);
        _assertEq(stream.availableBalance(id), 2.5 ether);

        vm.warp(created.endTime + 1 days);
        _assertEq(stream.availableBalance(id), 2.5 ether);
        vm.prank(RECIPIENT);
        stream.withdraw(id);
        _assertEq(address(stream).balance, 0);
    }

    function testInvalidParametersAndAuthorization() public {
        vm.prank(SENDER);
        vm.expectRevert(TipStream.ZeroAddress.selector);
        stream.createStream{value: 1 ether}(address(0), 1 hours);

        vm.prank(SENDER);
        vm.expectRevert(TipStream.InvalidRecipient.selector);
        stream.createStream{value: 1 ether}(SENDER, 1 hours);

        vm.prank(SENDER);
        vm.expectRevert(TipStream.InvalidAmount.selector);
        stream.createStream(RECIPIENT, 1 hours);

        vm.prank(SENDER);
        vm.expectRevert(TipStream.InvalidDuration.selector);
        stream.createStream{value: 1 ether}(RECIPIENT, 59);

        uint256 id = _create(1 ether, 1 hours);
        vm.prank(SENDER);
        vm.expectRevert(TipStream.Unauthorized.selector);
        stream.withdraw(id);

        vm.prank(RECIPIENT);
        vm.expectRevert(TipStream.Unauthorized.selector);
        stream.cancel(id);
    }

    function testCannotCancelTwiceOrAfterCompletion() public {
        uint256 canceledId = _create(1 ether, 1 hours);
        vm.warp(block.timestamp + 10 minutes);
        vm.prank(SENDER);
        stream.cancel(canceledId);
        vm.prank(SENDER);
        vm.expectRevert(TipStream.StreamAlreadyCanceled.selector);
        stream.cancel(canceledId);

        uint256 completedId = _create(1 ether, 1 hours);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(SENDER);
        vm.expectRevert(TipStream.StreamAlreadyEnded.selector);
        stream.cancel(completedId);
    }

    function testRoundingNeverOverpays() public {
        uint256 id = _create(10 wei, 3 minutes);
        TipStream.Stream memory created = stream.getStream(id);
        vm.warp(created.startTime + 1 minutes);
        _assertEq(stream.vestedAmount(id), 3 wei);
        vm.warp(created.endTime);
        _assertEq(stream.vestedAmount(id), 10 wei);
    }

    function _create(uint256 amount, uint40 duration) private returns (uint256) {
        vm.prank(SENDER);
        return stream.createStream{value: amount}(RECIPIENT, duration);
    }

    function _assertEq(uint256 actual, uint256 expected) private pure {
        require(actual == expected, "uint assertion failed");
    }

    function _assertEq(address actual, address expected) private pure {
        require(actual == expected, "address assertion failed");
    }
}
