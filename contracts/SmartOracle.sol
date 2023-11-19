// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {
    VRFCoordinatorV2Interface
} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {
    VRFConsumerBaseV2
} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

contract SmartOracle is VRFConsumerBaseV2, Ownable, Pausable {
    using Counters for Counters.Counter;
    struct Price {
        int64 price;
        uint256 lastUpdateTimestamp;
    }
    IPyth private _pyth;
    Counters.Counter public tokenIds;
    address public immutable gelatoMsgSender;
    Price public currentPrice;
    address vrfCoordinatorV2;
    modifier onlyGelatoMsgSender() {
        require(
            msg.sender == gelatoMsgSender,
            "Only dedicated gelato msg.sender"
        );
        _;
    }

    constructor(
        address _gelatoMsgSender,
        address pythContract,
        address _vrfCoordinatorV2
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        gelatoMsgSender = _gelatoMsgSender;
        _pyth = IPyth(pythContract);
        vrfCoordinatorV2 = _vrfCoordinatorV2;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {}

    function _requestRandomness() internal returns (uint256 requestId) {
        requestId = VRFCoordinatorV2Interface(vrfCoordinatorV2)
            .requestRandomWords(
                0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef,
                734,
                100,
                100_000,
                1
            );
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
