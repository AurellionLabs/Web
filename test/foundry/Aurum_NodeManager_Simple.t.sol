// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {AurumNodeManager} from "contracts/Aurum.sol";
import {Ausys} from "contracts/AuSys.sol";
import {Aura} from "contracts/Aura.sol";

contract AurumNodeManagerSimpleTest {
    AurumNodeManager manager;
    Ausys ausys;
    Aura erc20;

    address owner = address(this);
    address nodeOwner = address(0xB0B);

    function setUp() public {
        erc20 = new Aura();
        ausys = new Ausys(erc20);
        manager = new AurumNodeManager(ausys);
    }

    function _mkAsset(address token, uint256 tokenId, uint256 price, uint256 cap) internal pure returns (AurumNodeManager.Asset memory a) {
        a = AurumNodeManager.Asset({token: token, tokenId: tokenId, price: price, capacity: cap});
    }

    function _mkNode(address _owner) internal pure returns (AurumNodeManager.Node memory n) {
        AurumNodeManager.Asset[] memory assets = new AurumNodeManager.Asset[](1);
        assets[0] = AurumNodeManager.Asset({token: address(0xAAA1), tokenId: 1, price: 100, capacity: 10});
        n = AurumNodeManager.Node({
            location: AurumNodeManager.NodeLocationData({addressName: "loc1", location: AurumNodeManager.Location("0","0")}),
            validNode: bytes1(uint8(1)),
            owner: _owner,
            supportedAssets: assets,
            status: bytes1(uint8(1))
        });
    }

    function test_registerNode_as_admin_succeeds() public {
        manager.setAdmin(address(this));
        address nodeAddr = manager.registerNode(_mkNode(nodeOwner));
        require(nodeAddr != address(0), "node addr");
        AurumNodeManager.Node memory saved = manager.getNode(nodeAddr);
        require(saved.owner == nodeOwner, "owner");
    }
}
















