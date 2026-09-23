// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title TipStream
/// @notice Linear, second-by-second native BOT payment streams.
contract TipStream {
    uint40 public constant MIN_DURATION = 1 minutes;
    uint40 public constant MAX_DURATION = 365 days;

    struct Stream {
        address sender;
        address recipient;
        uint256 deposit;
        uint256 withdrawn;
        uint40 startTime;
        uint40 endTime;
        uint40 canceledAt;
    }

    uint256 public nextStreamId;
    mapping(uint256 => Stream) private streams;
    uint256 private locked = 1;

    error ZeroAddress();
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidDuration();
    error StreamNotFound();
    error Unauthorized();
    error NothingToWithdraw();
    error StreamAlreadyCanceled();
    error StreamAlreadyEnded();
    error TransferFailed();
    error Reentrancy();

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        uint40 startTime,
        uint40 endTime
    );
    event Withdrawn(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event Canceled(uint256 indexed streamId, uint256 recipientAmount, uint256 senderRefund);

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    function createStream(address recipient, uint40 duration) external payable returns (uint256 streamId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (recipient == msg.sender) revert InvalidRecipient();
        if (msg.value == 0) revert InvalidAmount();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();

        streamId = nextStreamId++;
        uint40 startTime = uint40(block.timestamp);
        uint40 endTime = startTime + duration;
        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            deposit: msg.value,
            withdrawn: 0,
            startTime: startTime,
            endTime: endTime,
            canceledAt: 0
        });

        emit StreamCreated(streamId, msg.sender, recipient, msg.value, startTime, endTime);
    }

    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage stream = _stream(streamId);
        if (msg.sender != stream.recipient) revert Unauthorized();

        uint256 amount = _vested(stream, block.timestamp) - stream.withdrawn;
        if (amount == 0) revert NothingToWithdraw();
        stream.withdrawn += amount;

        (bool success,) = payable(stream.recipient).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdrawn(streamId, stream.recipient, amount);
    }

    function cancel(uint256 streamId) external nonReentrant {
        Stream storage stream = _stream(streamId);
        if (msg.sender != stream.sender) revert Unauthorized();
        if (stream.canceledAt != 0) revert StreamAlreadyCanceled();
        if (block.timestamp >= stream.endTime) revert StreamAlreadyEnded();

        stream.canceledAt = uint40(block.timestamp);
        uint256 vested = _vested(stream, block.timestamp);
        uint256 refund = stream.deposit - vested;

        (bool success,) = payable(stream.sender).call{value: refund}("");
        if (!success) revert TransferFailed();
        emit Canceled(streamId, vested - stream.withdrawn, refund);
    }

    function getStream(uint256 streamId) external view returns (Stream memory stream) {
        stream = _stream(streamId);
    }

    function vestedAmount(uint256 streamId) public view returns (uint256) {
        Stream storage stream = _stream(streamId);
        return _vested(stream, block.timestamp);
    }

    function availableBalance(uint256 streamId) external view returns (uint256) {
        Stream storage stream = _stream(streamId);
        return _vested(stream, block.timestamp) - stream.withdrawn;
    }

    function _vested(Stream storage stream, uint256 timestamp) private view returns (uint256) {
        uint256 effectiveTime = stream.canceledAt == 0 ? timestamp : stream.canceledAt;
        if (effectiveTime <= stream.startTime) return 0;
        if (effectiveTime >= stream.endTime) return stream.deposit;
        return (stream.deposit * (effectiveTime - stream.startTime)) / (stream.endTime - stream.startTime);
    }

    function _stream(uint256 streamId) private view returns (Stream storage stream) {
        stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
    }

    receive() external payable {
        revert InvalidAmount();
    }
}
