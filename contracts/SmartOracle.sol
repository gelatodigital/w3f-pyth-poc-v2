// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

import {IPyth} from "./lens/IPyth.sol";

import {PythStructs} from "./lens/PythStructs.sol";

contract SmartOracle is Ownable, Pausable {
    IPyth pyth;
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;
    address public immutable gelatoMsgSender;

    struct Price {
        int64 price;
        uint256 lastUpdateTimestamp;
    }

    Price public currentPrice;

    constructor(address _gelatoMsgSender, address pythContract) {
        gelatoMsgSender = _gelatoMsgSender;
        pyth = IPyth(pythContract);
    }

    function updatePrice(
        bytes[] memory updatePriceData
    ) external onlyGelatoMsgSender {
        uint256 fee = pyth.getUpdateFee(updatePriceData);

        pyth.updatePriceFeeds{value: fee}(updatePriceData);

        bytes32 priceID = bytes32(
            0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6
        );

        PythStructs.Price memory check_price = pyth.getPrice(priceID);

        currentPrice = Price(check_price.price, check_price.publishTime);
    }

    function getPrice() public view returns (Price memory) {
        return currentPrice;
    }

    modifier onlyGelatoMsgSender() {
        require(
            msg.sender == gelatoMsgSender,
            "Only dedicated gelato msg.sender"
        );
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}

    function withdraw() external onlyOwner returns (bool) {
        (bool result, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        return result;
    }
}
