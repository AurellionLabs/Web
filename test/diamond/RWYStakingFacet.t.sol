// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { RWYStakingFacet } from 'contracts/diamond/facets/RWYStakingFacet.sol';
import { RWYStorage } from 'contracts/diamond/libraries/RWYStorage.sol';
import { OperatorFacet } from 'contracts/diamond/facets/OperatorFacet.sol';

/**
 * @title RWYStakingFacetTest
 * @notice Tests for RWYStakingFacet admin functions (RWYVault.sol parity)
 */
contract RWYStakingFacetTest is DiamondTestBase {
    RWYStakingFacet public rwy;

    // Events
    event RWYCLOBAddressUpdated(address newAddress);
    event RWYQuoteTokenUpdated(address newToken);
    event RWYFeeRecipientUpdated(address newRecipient);
    event RWYPaused();
    event RWYUnpaused();

    // Test opportunity for document tests
    bytes32 public testOpportunityId;
    address public operator;

    function setUp() public override {
        super.setUp();
        rwy = RWYStakingFacet(address(diamond));
        operator = makeAddr('operator');
    }

    // ============================================================================
    // ADMIN FUNCTION TESTS
    // ============================================================================

    function test_setRWYCLOBAddress() public {
        address newClob = makeAddr('newCLOB');

        vm.prank(owner);
        rwy.setRWYCLOBAddress(newClob);

        // Verify via getter if available, or through subsequent operations
    }

    function test_setRWYCLOBAddress_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.setRWYCLOBAddress(makeAddr('fake'));
    }

    function test_setRWYQuoteToken() public {
        address newQuoteToken = makeAddr('newQuote');

        vm.prank(owner);
        rwy.setRWYQuoteToken(newQuoteToken);
    }

    function test_setRWYQuoteToken_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.setRWYQuoteToken(makeAddr('fake'));
    }

    function test_setRWYFeeRecipient() public {
        address newRecipient = makeAddr('feeRecipient');

        vm.prank(owner);
        rwy.setRWYFeeRecipient(newRecipient);
    }

    function test_setRWYFeeRecipient_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.setRWYFeeRecipient(makeAddr('fake'));
    }

    // ============================================================================
    // PAUSE FUNCTIONALITY TESTS
    // ============================================================================

    function test_pauseRWY() public {
        vm.prank(owner);
        rwy.pauseRWY();

        // Verify paused state affects operations
    }

    function test_pauseRWY_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.pauseRWY();
    }

    function test_unpauseRWY() public {
        vm.startPrank(owner);
        rwy.pauseRWY();
        rwy.unpauseRWY();
        vm.stopPrank();
    }

    function test_unpauseRWY_revertNotOwner() public {
        vm.prank(owner);
        rwy.pauseRWY();

        vm.prank(user1);
        vm.expectRevert();
        rwy.unpauseRWY();
    }

    function test_unpauseRWY_whenNotPaused() public {
        // Note: unpauseRWY doesn't revert when not paused - it's idempotent
        // This is acceptable behavior, just sets paused = false regardless
        vm.prank(owner);
        rwy.unpauseRWY();
        // If we got here without revert, the test passes
    }

    // ============================================================================
    // CONFIGURATION SEQUENCE TESTS
    // ============================================================================

    function test_fullConfiguration() public {
        address clob = makeAddr('clob');
        address quote = makeAddr('quote');
        address fee = makeAddr('feeRecipient');

        vm.startPrank(owner);
        rwy.setRWYCLOBAddress(clob);
        rwy.setRWYQuoteToken(quote);
        rwy.setRWYFeeRecipient(fee);
        vm.stopPrank();

        // All configurations should be set
    }

    function test_pauseWhileOperating() public {
        // Configure
        vm.startPrank(owner);
        rwy.setRWYCLOBAddress(makeAddr('clob'));
        rwy.setRWYQuoteToken(makeAddr('quote'));
        rwy.setRWYFeeRecipient(makeAddr('fee'));

        // Pause
        rwy.pauseRWY();

        // Operations should fail while paused (if implemented)
        // This depends on whether pause affects specific functions

        // Unpause
        rwy.unpauseRWY();
        vm.stopPrank();
    }

    // ============================================================================
    // INSURANCE DOCUMENT TESTS
    // ============================================================================

    function _createTestOpportunity() internal returns (bytes32) {
        // First initialize RWY staking
        vm.prank(owner);
        rwy.initializeRWYStaking();
        
        // Approve operator
        vm.prank(owner);
        OperatorFacet(address(diamond)).approveOperator(operator);
        
        // Fund operator with collateral tokens
        payToken.mint(operator, 1_000_000 ether);
        
        vm.startPrank(operator);
        payToken.approve(address(diamond), type(uint256).max);
        
        // Create opportunity with 0 collateral (allowed for insured/trusted pools)
        // This tests the document functionality without worrying about collateral math
        bytes32 oppId = rwy.createOpportunity(
            'Test Gold Pool',
            'Test opportunity for document testing',
            address(payToken),  // inputToken (ERC20 for simplicity)
            0,                  // inputTokenId (0 for ERC20)
            1000 ether,         // targetAmount
            address(payToken),  // outputToken
            1200 ether,         // expectedOutputAmount
            1500,               // promisedYieldBps (15%)
            500,                // operatorFeeBps (5%)
            1,                  // minSalePrice (1 wei - minimal for testing)
            30,                 // fundingDays
            60,                 // processingDays
            address(payToken),  // collateralToken
            0,                  // collateralTokenId (0 for ERC20)
            0                   // collateralAmount (0 - allowed for insured pools)
        );
        vm.stopPrank();
        
        return oppId;
    }

    function test_setInsurance() public {
        bytes32 oppId = _createTestOpportunity();
        
        string memory insuranceUri = 'ipfs://QmTestInsuranceDocumentHash123456789';
        uint256 coverageAmount = 500_000 ether;
        uint256 expiryDate = block.timestamp + 365 days;
        
        vm.prank(operator);
        rwy.setInsurance(oppId, insuranceUri, coverageAmount, expiryDate);
        
        // Verify insurance was set
        RWYStorage.InsuranceInfo memory info = rwy.getInsurance(oppId);
        assertTrue(info.isInsured, 'Should be insured');
        assertEq(info.documentUri, insuranceUri, 'Insurance URI should match');
        assertEq(info.coverageAmount, coverageAmount, 'Coverage amount should match');
        assertEq(info.expiryDate, expiryDate, 'Expiry date should match');
    }

    function test_setInsurance_withHttpsUrl() public {
        bytes32 oppId = _createTestOpportunity();
        
        // Test with HTTPS URL (platform-hosted PDF)
        string memory insuranceUri = 'https://altura.trade/docs/insurance/pool-123.pdf';
        uint256 coverageAmount = 1_000_000 ether;
        uint256 expiryDate = block.timestamp + 180 days;
        
        vm.prank(operator);
        rwy.setInsurance(oppId, insuranceUri, coverageAmount, expiryDate);
        
        RWYStorage.InsuranceInfo memory info = rwy.getInsurance(oppId);
        assertEq(info.documentUri, insuranceUri, 'HTTPS URI should be stored');
    }

    function test_setInsurance_revertNotOperator() public {
        bytes32 oppId = _createTestOpportunity();
        
        vm.prank(user1);
        vm.expectRevert();
        rwy.setInsurance(oppId, 'ipfs://test', 1000 ether, block.timestamp + 365 days);
    }

    // ============================================================================
    // CUSTODY PROOF TESTS
    // ============================================================================

    function _fundOpportunity(bytes32 oppId) internal {
        // Fund the opportunity to move past FUNDING status
        payToken.mint(user1, 1000 ether);
        
        vm.startPrank(user1);
        payToken.approve(address(diamond), type(uint256).max);
        rwy.stake(oppId, 1000 ether, 0);
        vm.stopPrank();
    }

    function test_submitCustodyProof() public {
        bytes32 oppId = _createTestOpportunity();
        _fundOpportunity(oppId);
        
        string memory custodyUri = 'ipfs://QmCustodyCertificateHash123456789';
        string memory proofType = 'CUSTODY_CERTIFICATE';
        
        vm.prank(operator);
        rwy.submitCustodyProof(oppId, custodyUri, proofType);
        
        // Verify proof was stored
        RWYStorage.CustodyProof[] memory proofs = rwy.getCustodyProofs(oppId);
        assertEq(proofs.length, 1, 'Should have 1 proof');
        assertEq(proofs[0].documentUri, custodyUri, 'URI should match');
        assertEq(proofs[0].proofType, proofType, 'Proof type should match');
        assertEq(proofs[0].submitter, operator, 'Submitter should be operator');
    }

    function test_submitMultipleCustodyProofs() public {
        bytes32 oppId = _createTestOpportunity();
        _fundOpportunity(oppId);
        
        vm.startPrank(operator);
        
        // Submit multiple proofs at different stages
        rwy.submitCustodyProof(oppId, 'ipfs://QmCustodyProof1', 'CUSTODY_CERTIFICATE');
        rwy.submitCustodyProof(oppId, 'https://altura.trade/docs/delivery-receipt-001.pdf', 'DELIVERY_RECEIPT');
        rwy.submitCustodyProof(oppId, 'ipfs://QmWarehouseReceipt', 'WAREHOUSE_RECEIPT');
        
        vm.stopPrank();
        
        // Verify all proofs
        RWYStorage.CustodyProof[] memory proofs = rwy.getCustodyProofs(oppId);
        assertEq(proofs.length, 3, 'Should have 3 proofs');
        assertEq(rwy.getCustodyProofCount(oppId), 3, 'Count should be 3');
        
        // Verify each proof type
        assertEq(proofs[0].proofType, 'CUSTODY_CERTIFICATE');
        assertEq(proofs[1].proofType, 'DELIVERY_RECEIPT');
        assertEq(proofs[2].proofType, 'WAREHOUSE_RECEIPT');
    }

    function test_submitCustodyProof_revertDuringFunding() public {
        bytes32 oppId = _createTestOpportunity();
        // Don't fund - opportunity is still in FUNDING status
        
        vm.prank(operator);
        vm.expectRevert();
        rwy.submitCustodyProof(oppId, 'ipfs://test', 'CUSTODY_CERTIFICATE');
    }

    function test_submitCustodyProof_revertNotOperator() public {
        bytes32 oppId = _createTestOpportunity();
        _fundOpportunity(oppId);
        
        vm.prank(user1);
        vm.expectRevert();
        rwy.submitCustodyProof(oppId, 'ipfs://test', 'CUSTODY_CERTIFICATE');
    }

    // ============================================================================
    // TOKENIZATION PROOF TESTS
    // ============================================================================

    function test_submitTokenizationProof() public {
        bytes32 oppId = _createTestOpportunity();
        
        string memory tokenizationUri = 'ipfs://QmTokenizationAgreementHash123';
        
        vm.prank(operator);
        rwy.submitTokenizationProof(oppId, tokenizationUri);
        
        // Verify proof was stored
        RWYStorage.TokenizationProof memory proof = rwy.getTokenizationProof(oppId);
        assertEq(proof.documentUri, tokenizationUri, 'URI should match');
        assertEq(proof.submitter, operator, 'Submitter should be operator');
        assertTrue(proof.timestamp > 0, 'Timestamp should be set');
    }

    function test_submitTokenizationProof_overwrite() public {
        bytes32 oppId = _createTestOpportunity();
        
        vm.startPrank(operator);
        
        // Submit initial proof
        rwy.submitTokenizationProof(oppId, 'ipfs://QmFirstVersion');
        
        // Overwrite with new proof
        rwy.submitTokenizationProof(oppId, 'ipfs://QmUpdatedVersion');
        
        vm.stopPrank();
        
        // Should have the updated version
        RWYStorage.TokenizationProof memory proof = rwy.getTokenizationProof(oppId);
        assertEq(proof.documentUri, 'ipfs://QmUpdatedVersion', 'Should have updated URI');
    }

    function test_submitTokenizationProof_revertNotOperator() public {
        bytes32 oppId = _createTestOpportunity();
        
        vm.prank(user1);
        vm.expectRevert();
        rwy.submitTokenizationProof(oppId, 'ipfs://test');
    }

    // ============================================================================
    // DOCUMENT URI FORMAT TESTS
    // ============================================================================

    function test_documentUris_ipfsFormat() public {
        bytes32 oppId = _createTestOpportunity();
        _fundOpportunity(oppId);
        
        // IPFS CIDv0 format
        vm.prank(operator);
        rwy.submitCustodyProof(oppId, 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', 'IPFS_V0');
        
        // IPFS CIDv1 format
        vm.prank(operator);
        rwy.submitCustodyProof(oppId, 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', 'IPFS_V1');
        
        RWYStorage.CustodyProof[] memory proofs = rwy.getCustodyProofs(oppId);
        assertEq(proofs.length, 2, 'Both formats should be stored');
    }

    function test_documentUris_httpsFormat() public {
        bytes32 oppId = _createTestOpportunity();
        _fundOpportunity(oppId);
        
        // Various HTTPS formats
        vm.startPrank(operator);
        rwy.submitCustodyProof(oppId, 'https://gateway.pinata.cloud/ipfs/QmHash', 'PINATA_GATEWAY');
        rwy.submitCustodyProof(oppId, 'https://altura.trade/api/documents/custody/123', 'PLATFORM_HOSTED');
        rwy.submitCustodyProof(oppId, 'https://s3.amazonaws.com/aurellion-docs/proof.pdf', 'S3_HOSTED');
        vm.stopPrank();
        
        assertEq(rwy.getCustodyProofCount(oppId), 3, 'All HTTPS formats should be stored');
    }

    // ============================================================================
    // INTEGRATION TEST - FULL DOCUMENT FLOW
    // ============================================================================

    function test_fullDocumentFlow() public {
        // 1. Create opportunity
        bytes32 oppId = _createTestOpportunity();
        
        // 2. Set insurance during funding
        vm.prank(operator);
        rwy.setInsurance(
            oppId,
            'https://altura.trade/insurance/policy-2024-001.pdf',
            1_000_000 ether,
            block.timestamp + 365 days
        );
        
        // 3. Submit tokenization proof
        vm.prank(operator);
        rwy.submitTokenizationProof(oppId, 'ipfs://QmTokenizationAgreement');
        
        // 4. Fund the opportunity
        _fundOpportunity(oppId);
        
        // 5. Submit custody proofs at various stages
        vm.startPrank(operator);
        rwy.submitCustodyProof(oppId, 'ipfs://QmCustodyCertificate', 'CUSTODY_CERTIFICATE');
        rwy.submitCustodyProof(oppId, 'ipfs://QmPickupReceipt', 'PICKUP_RECEIPT');
        rwy.submitCustodyProof(oppId, 'ipfs://QmDeliveryConfirmation', 'DELIVERY_CONFIRMATION');
        vm.stopPrank();
        
        // Verify all documents are accessible
        RWYStorage.InsuranceInfo memory insurance = rwy.getInsurance(oppId);
        assertTrue(insurance.isInsured, 'Should be insured');
        
        RWYStorage.TokenizationProof memory tokenization = rwy.getTokenizationProof(oppId);
        assertEq(tokenization.documentUri, 'ipfs://QmTokenizationAgreement');
        
        RWYStorage.CustodyProof[] memory custody = rwy.getCustodyProofs(oppId);
        assertEq(custody.length, 3, 'Should have 3 custody proofs');
    }
}
