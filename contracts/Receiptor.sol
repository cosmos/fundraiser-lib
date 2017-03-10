//! Receipting contract. Just records who sent what.
//! By Parity Technologies, 2017.
//! Released under the Apache Licence 2.

pragma solidity ^0.4.7;

/// Will accept Ether "contributions" and record each both as a log and in a
/// queryable record.
contract Receipter {
	/// Constructor. `_admin` has the ability to pause the
	/// contribution period and, eventually, kill this contract. `_treasury`
	/// receives all funds. `_beginBlock` and `_endBlock` define the begin and
	/// end of the period.
    function Receipter(address _admin, address _treasury, uint _beginBlock, uint _endBlock) {
        admin = _admin;
        treasury = _treasury;
        beginBlock = _beginBlock;
        endBlock = _endBlock;
    }

	// Can only be called by _admin.
    modifier only_admin { if (msg.sender != admin) throw; _; }
	// Can only be called by prior to the period.
    modifier only_before_period { if (block.number >= beginBlock) throw; _; }
	// Can only be called during the period when not halted.
    modifier only_during_period { if (block.number < beginBlock || block.number >= endBlock || isHalted) throw; _; }
	// Can only be called during the period when halted.
    modifier only_during_halted_period { if (block.number < beginBlock || block.number >= endBlock || !isHalted) throw; _; }
	// Can only be called after the period.
    modifier only_after_period { if (block.number < endBlock || isHalted) throw; _; }
	// The value of the message must be sufficiently large to not be considered dust.
    modifier is_not_dust { if (msg.value < dust) throw; _; }

	/// Some contribution `amount` received from `recipient`.
    event Received(address indexed recipient, uint amount);
	/// Period halted abnormally.
    event Halted();
	/// Period restarted after abnormal halt.
    event Unhalted();

	/// Fallback function: receive a contribution from sender.
    function() payable {
        receiveFrom(msg.sender);
    }

	/// Receive a contribution from `_recipient`.
    function receiveFrom(address _recipient) payable only_during_period is_not_dust {
        if (!treasury.call.value(msg.value)()) throw;
        record[_recipient] += msg.value;
        total += msg.value;
        Received(_recipient, msg.value);
    }

	/// Halt the contribution period. Any attempt at contributing will fail.
    function halt() only_admin only_during_period {
        isHalted = true;
        Halted();
    }

	/// Unhalt the contribution period.
    function unhalt() only_admin only_during_halted_period {
        isHalted = false;
        Unhalted();
    }

	/// Kill this contract.
    function kill() only_admin only_after_period {
        suicide(treasury);
    }

	// How much is enough?
    uint public constant dust = 100 finney;

	// Who can halt/unhalt/kill?
    address public admin;
	// Who gets the stash?
    address public treasury;
	// When does the contribution period begin?
    uint public beginBlock;
	// When does the period end?
    uint public endBlock;

	// Are contributions abnormally halted?
    bool public isHalted = false;

    mapping (address => uint) public record;
    uint public total = 0;
}

contract SignedReceipter is Receipter {
    function Receipter(address _admin, address _treasury, uint _beginBlock, uint _endBlock, bytes32 _sigHash) {
        admin = _admin;
        treasury = _treasury;
        beginBlock = _beginBlock;
        endBlock = _endBlock;
        sigHash = _sigHash;
    }

    modifier when_signed(address who, uint8 v, bytes32 r, bytes32 s) { if (ecrecover(sigHash, v, r, s) != who) throw; _; }

    function() payable { throw; }

    /// Fallback function: receive a contribution from sender.
    function receive(uint8 v, bytes32 r, bytes32 s) payable {
        receiveFrom(msg.sender, v, r, s);
    }

	/// Receive a contribution from `_recipient`.
    function receiveFrom(address _source, uint8 v, bytes32 r, bytes32 s) payable only_during_period is_not_dust when_signed(_source, v, r, s) {
        if (!treasury.call.value(msg.value)()) throw;
        record[_source] += msg.value;
        total += msg.value;
        Received(_source, msg.value);
    }

    bytes32 sigHash;
}
