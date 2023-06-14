// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract SmartOracle is Ownable, Pausable {
    using Counters for Counters.Counter;
    struct Price {
        int64 price;
        uint256 lastUpdateTimestamp;
    }
    IPyth private _pyth;
    Counters.Counter public tokenIds;
    address public immutable gelatoMsgSender;
    Price public currentPrice;

    modifier onlyGelatoMsgSender() {
        require(
            msg.sender == gelatoMsgSender,
            "Only dedicated gelato msg.sender"
        );
        _;
    }

    constructor(address _gelatoMsgSender, address pythContract) {
        gelatoMsgSender = _gelatoMsgSender;
        _pyth = IPyth(pythContract);
    }

    /* solhint-disable-next-line no-empty-blocks */
    receive() external payable {}

    function updatePrice(
        bytes[] memory updatePriceData
    ) external onlyGelatoMsgSender {
        uint256 fee = _pyth.getUpdateFee(updatePriceData);

        _pyth.updatePriceFeeds{value: fee}(updatePriceData);
        /* solhint-disable-next-line */
        bytes32 priceID = bytes32(
            0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6
        );

        PythStructs.Price memory checkPrice = _pyth.getPriceUnsafe(priceID);
        currentPrice = Price(checkPrice.price, checkPrice.publishTime);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw() external onlyOwner returns (bool) {
        (bool result, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        return result;
    }

    function getPrice() public view returns (Price memory) {
        return currentPrice;
    }
}
