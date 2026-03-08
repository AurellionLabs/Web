// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';

interface IAuSysDiamond {
    function setPayToken(address _payToken) external;
    function getPayToken() external view returns (address);
    function setAuSysAdmin(address admin) external;
    function revokeAuSysAdmin(address admin) external;
    function setDriver(address driver, bool enable) external;
    function setDispatcher(address dispatcher, bool enable) external;
    function hasAuSysRole(bytes32 role, address account) external view returns (bool);
    function getAllowedDrivers() external view returns (address[] memory);
    function createAuSysOrder(
        DiamondStorage.AuSysOrder memory order
    ) external returns (bytes32);
    function getAuSysOrder(bytes32 id) external view returns (DiamondStorage.AuSysOrder memory);
    function acceptP2POffer(bytes32 orderId) external;
    function cancelP2POffer(bytes32 orderId) external;
    function createJourney(
        address sender,
        address receiver,
        DiamondStorage.ParcelData memory data,
        uint256 bounty,
        uint256 ETA
    ) external;
    function createOrderJourney(
        bytes32 orderId,
        address sender,
        address receiver,
        DiamondStorage.ParcelData memory data,
        uint256 bounty,
        uint256 ETA,
        uint256 tokenQuantity,
        uint256 assetId
    ) external;
    function getJourney(bytes32 id) external view returns (DiamondStorage.AuSysJourney memory);
    function assignDriverToJourney(address driver, bytes32 journeyId) external;
    function getDriverJourneyCount(address driver) external view returns (uint256);
    function packageSign(bytes32 id) external;
    function handOn(bytes32 id) external returns (bool);
    function handOff(bytes32 id) external returns (bool);
    function getOpenP2POffers() external view returns (bytes32[] memory);
    function getPendingTokenDestinations(address buyer) external view returns (bytes32[] memory);
    function selectTokenDestination(bytes32 orderId, bytes32 nodeId, bool burn) external;
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}
