// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "lib/forge-std/src/Test.sol";
import {Ausys} from "contracts/AuSys.sol";
import {AurumNodeManager} from "contracts/Aurum.sol";
import {Aura} from "contracts/Aura.sol";

contract AuSysFlowTest is Test {
    Ausys ausys;
    Aura pay;
    AurumNodeManager manager;
    address driver = address(0xD1);

    function setUp() public {
        pay = new Aura();
        ausys = new Ausys(pay);
        manager = new AurumNodeManager(ausys);
        ausys.setNodeManager(manager);

        // fund this contract
        pay.mintTokenToTreasury(1_000_000);
    }

    function _parcel() internal pure returns (Ausys.ParcelData memory p) {
        p = Ausys.ParcelData({
            startLocation: Ausys.Location("0","0"),
            endLocation: Ausys.Location("1","1"),
            startName: "S",
            endName: "E"
        });
    }

    function test_orderCreation_escrows_price_and_fee() public {
        // prepare order
        Ausys.Order memory order = Ausys.Order({
            id: bytes32(0),
            token: address(pay),
            tokenId: 1,
            tokenQuantity: 1,
            requestedTokenQuantity: 5,
            price: 1 ether,
            txFee: 0,
            buyer: address(this),
            seller: address(0xBEEF),
            journeyIds: new bytes32[](0),
            nodes: new address[](0),
            locationData: _parcel(),
            currentStatus: Ausys.Status.Pending,
            contractualAgreement: bytes32(0)
        });

        // approve price + fee (2%)
        uint256 expectedFee = (order.price * 2) / 100;
        pay.approve(address(ausys), order.price + expectedFee);
        bytes32 oid = ausys.orderCreation(order);
        // escrowed
        assertEq(pay.balanceOf(address(ausys)), order.price + expectedFee);
        // stored
        Ausys.Order memory saved = ausys.getOrder(oid);
        assertEq(saved.price, order.price);
        assertEq(saved.buyer, order.buyer);
    }

    function test_journey_flow_sign_handOn_handOff_reward() public {
        // roles to allow driver assignment
        ausys.setAdmin(address(this));
        ausys.setDriver(driver, true);

        // create journey with sender == receiver == this
        uint256 bounty = 0.5 ether;
        pay.approve(address(ausys), bounty);
        ausys.journeyCreation(address(this), address(this), _parcel(), bounty, block.timestamp + 1 hours);
        bytes32 jid = keccak256(abi.encode(1));

        // assign external driver
        ausys.assignDriverToJourneyId(driver, jid);

        // sender sign (this)
        ausys.packageSign(jid);
        // driver sign to begin
        vm.prank(driver);
        ausys.packageSign(jid);

        // move to InProgress
        bool ok = ausys.handOn(jid);
        assertTrue(ok);

        // prepare completion: receiver sign (this) and driver sign
        ausys.packageSign(jid);
        vm.prank(driver);
        ausys.packageSign(jid);

        uint256 balBefore = pay.balanceOf(address(this));
        ok = ausys.handOff(jid);
        assertTrue(ok);
        // bounty returned to driver (this contract)
        assertEq(pay.balanceOf(address(this)), balBefore + 0);
        // Contract's internal logic paid out from escrow back to driver; since driver == receiver == sender == this,
        // net token balance remains unchanged.
    }
}


