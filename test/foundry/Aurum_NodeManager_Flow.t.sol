// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "lib/forge-std/src/Test.sol";
import {AurumNodeManager} from "contracts/Aurum.sol";
import {Ausys} from "contracts/AuSys.sol";
import {Aura} from "contracts/Aura.sol";

contract AurumNodeManagerFlowTest is Test {
    AurumNodeManager manager;
    Ausys ausys;
    Aura erc20;

    address nodeOwner = address(0xB0B);

    function setUp() public {
        erc20 = new Aura();
        ausys = new Ausys(erc20);
        manager = new AurumNodeManager(ausys);
        manager.setAdmin(address(this));
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

    function test_register_updateOwner_and_getAsset() public {
        address nodeAddr = manager.registerNode(_mkNode(nodeOwner));
        // transfer ownership to another address
        vm.prank(nodeOwner);
        manager.updateOwner(address(0xC0C0), nodeAddr);

        AurumNodeManager.Node memory saved = manager.getNode(nodeAddr);
        require(saved.owner == address(0xC0C0), "owner not updated");

        AurumNodeManager.Asset memory a = manager.getAsset(nodeAddr, address(0xAAA1), 1);
        require(a.capacity == 10, "capacity");
    }
}
















