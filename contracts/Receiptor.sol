//! Fundraiser contract. Just records who sent what.
//! By Parity Technologies, 2017.
//! Released under the Apache Licence 2.
//! Modified by the Interchain Foundation.

pragma solidity ^0.4.7;

/// Will accept Ether "contributions" and record each both as a log and in a
/// queryable record.
contract Fundraiser {


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

    // TODO: use a struct instead of two maps
    // The record maps cosmos addresses to their donation amounts.
    // The returns maps to return addrs.
    mapping (address => uint) public record;
    mapping (address => address) public returnAddresses;
    uint public total = 0;


    /// Constructor. `_admin` has the ability to pause the
    /// contribution period and, eventually, kill this contract. `_treasury`
    /// receives all funds. `_beginBlock` and `_endBlock` define the begin and
    /// end of the period.
    function Fundraiser(address _admin, address _treasury, uint _beginBlock, uint _endBlock) {
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

    /// Fallback function throws. Successful donation requires arguments
    function() {
	throw;
    }

    /// Receive a contribution for a donor cosmos address 
    /// Also store returnAddress just-in-case.
    function donate(address _donor, address _returnAddress, bytes32 checksum) payable only_during_period is_not_dust {
	// checksum is the sha3 of the xor of the bytes32 versions of the cosmos address and the return address
	if (!(sha3(bytes32(_donor)^bytes32(_returnAddress)) == checksum)) throw;

	// forward the funds to the treasurer
        if (!treasury.call.value(msg.value)()) throw;

	// update the donor details
        record[_donor] += msg.value;
        returnAddresses[_donor] = _returnAddress; // overwrites
        total += msg.value;
        Received(_donor, msg.value);
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
}
