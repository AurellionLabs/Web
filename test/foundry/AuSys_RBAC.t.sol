// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Ausys} from "contracts/AuSys.sol";
import {Aura} from "contracts/Aura.sol";
import {AurumNodeManager} from "contracts/Aurum.sol";

contract AuSysRBACTest {
    Ausys ausys;
    Aura aura;
    AurumNodeManager nodeManager;

    address admin = address(0xA1);
    address receiver = address(this);
    address driver = address(0xD1);

    function setUp() public {
        aura = new Aura();
        ausys = new Ausys(aura);
        nodeManager = new AurumNodeManager(ausys);
        ausys.setNodeManager(nodeManager);
        // fund this contract (receiver in this test) so it can approve bounties
        aura.mintTokenToTreasury(1_000_000);
        aura.transfer(address(this), 100 ether);
    }

    function _parcel() internal pure returns (Ausys.ParcelData memory p) {
        p = Ausys.ParcelData({
            startLocation: Ausys.Location("0","0"),
            endLocation: Ausys.Location("1","1"),
            startName: "S",
            endName: "E"
        });
    }

    function test_admin_role_grant() public {
        setUp();
        ausys.setAdmin(admin);
        bytes32 ADMIN = ausys.ADMIN_ROLE();
        require(ausys.hasRole(ADMIN, admin), "admin not granted");
    }

    function test_driver_must_have_role_to_assign() public {
        setUp();
        // create a journey where receiver == this contract
        aura.approve(address(ausys), 0.1 ether);
        ausys.journeyCreation(address(this), receiver, _parcel(), 0.1 ether, block.timestamp + 1 hours);

        // fetch last journey (counter not exposed; assume idToJourney map is accessible via event in real tests)
        // here we rely on single creation and known index for brevity
        bytes32 jid = keccak256(abi.encode(1)); // matches getHashedJourneyId pattern deterministically for first call

        bool reverted;
        // try assign without role -> should revert
        try ausys.assignDriverToJourneyId(driver, jid) {
            reverted = false;
        } catch {
            reverted = true;
        }
        require(reverted, "expected revert without DRIVER_ROLE");

        // grant driver role and try again (this contract is owner, can setAdmin)
        ausys.setAdmin(address(this));
        ausys.setDriver(driver, true);
        ausys.assignDriverToJourneyId(driver, jid);
    }
}


