import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, ContractFactory } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('Upgradeable Contracts Deployment and Upgrades', function () {
  let deployer: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  // Factory storage for upgradeable contracts
  let AurumNodeManagerFactory: ContractFactory;
  let AuraAssetFactory: ContractFactory;
  let AuSysFactory: ContractFactory;
  let AuStakeFactory: ContractFactory;
  let OrderBridgeFactory: ContractFactory;
  let ProxyAdminFactory: ContractFactory;
  let TransparentProxyFactory: ContractFactory;

  before(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Get contract factories
    AurumNodeManagerFactory = await ethers.getContractFactory('AurumNodeManagerUpgradeable');
    AuraAssetFactory = await ethers.getContractFactory('AuraAssetUpgradeable');
    AuSysFactory = await ethers.getContractFactory('AuSysUpgradeable');
    AuStakeFactory = await ethers.getContractFactory('AuStakeUpgradeable');
    OrderBridgeFactory = await ethers.getContractFactory('OrderBridgeUpgradeable');
    ProxyAdminFactory = await ethers.getContractFactory('ProxyAdmin');
    TransparentProxyFactory = await ethers.getContractFactory('TransparentUpgradeableProxy');
  });

  describe('ProxyAdmin Deployment', function () {
    let proxyAdmin: Contract;

    it('Should deploy ProxyAdmin', async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      expect(await proxyAdmin.getAddress()).to.be.properAddress;
    });

    it('Should have correct owner', async function () {
      expect(await proxyAdmin.owner()).to.equal(deployer.address);
    });
  });

  describe('AurumNodeManagerUpgradeable', function () {
    let implementation: Contract;
    let proxy: Contract;
    let proxyAdmin: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      // Deploy implementation
      implementation = await AurumNodeManagerFactory.deploy();
      await implementation.waitForDeployment();

      // Deploy proxy
      proxy = await TransparentProxyFactory.deploy(
        await implementation.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await proxy.waitForDeployment();
    });

    it('Should deploy implementation', async function () {
      expect(await implementation.getAddress()).to.be.properAddress;
    });

    it('Should deploy proxy', async function () {
      expect(await proxy.getAddress()).to.be.properAddress;
    });

    it('Should initialize successfully', async function () {
      const contract = await ethers.getContractAt('AurumNodeManagerUpgradeable', await proxy.getAddress());
      await contract.initialize(ethers.ZeroAddress, ethers.ZeroAddress);
      // If no revert, initialization succeeded
    });

    it('Should prevent re-initialization', async function () {
      const contract = await ethers.getContractAt('AurumNodeManagerUpgradeable', await proxy.getAddress());
      await expect(contract.initialize(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.reverted;
    });

    it('Should have correct initial state', async function () {
      const contract = await ethers.getContractAt('AurumNodeManagerUpgradeable', await proxy.getAddress());
      expect(await contract.nodeIdCounter()).to.equal(0);
    });

    it('Should upgrade successfully', async function () {
      // Deploy new implementation
      const implementationV2 = await AurumNodeManagerFactory.deploy();
      await implementationV2.waitForDeployment();

      // Upgrade
      await proxyAdmin.upgrade(await proxy.getAddress(), await implementationV2.getAddress());

      // Verify upgrade worked
      const upgradedContract = await ethers.getContractAt(
        'AurumNodeManagerUpgradeable',
        await proxy.getAddress(),
      );
      // The implementation address should now be the new one
      expect(await upgradedContract.nodeIdCounter()).to.equal(0);
    });
  });

  describe('AuraAssetUpgradeable', function () {
    let implementation: Contract;
    let proxy: Contract;
    let proxyAdmin: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      implementation = await AuraAssetFactory.deploy();
      await implementation.waitForDeployment();

      proxy = await TransparentProxyFactory.deploy(
        await implementation.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await proxy.waitForDeployment();
    });

    it('Should deploy implementation', async function () {
      expect(await implementation.getAddress()).to.be.properAddress;
    });

    it('Should deploy proxy', async function () {
      expect(await proxy.getAddress()).to.be.properAddress;
    });

    it('Should initialize successfully', async function () {
      const contract = await ethers.getContractAt('AuraAssetUpgradeable', await proxy.getAddress());
      await contract.initialize('https://test.uri/', ethers.ZeroAddress);
    });

    it('Should prevent re-initialization', async function () {
      const contract = await ethers.getContractAt('AuraAssetUpgradeable', await proxy.getAddress());
      await expect(contract.initialize('https://test.uri/', ethers.ZeroAddress)).to.be.reverted;
    });

    it('Should have correct initial URI', async function () {
      const contract = await ethers.getContractAt('AuraAssetUpgradeable', await proxy.getAddress());
      expect(await contract.uri(0)).to.equal('https://test.uri/');
    });
  });

  describe('AuSysUpgradeable', function () {
    let implementation: Contract;
    let proxy: Contract;
    let proxyAdmin: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      implementation = await AuSysFactory.deploy();
      await implementation.waitForDeployment();

      proxy = await TransparentProxyFactory.deploy(
        await implementation.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await proxy.waitForDeployment();
    });

    it('Should deploy implementation', async function () {
      expect(await implementation.getAddress()).to.be.properAddress;
    });

    it('Should deploy proxy', async function () {
      expect(await proxy.getAddress()).to.be.properAddress;
    });

    it('Should initialize successfully', async function () {
      const contract = await ethers.getContractAt('AuSysUpgradeable', await proxy.getAddress());
      await contract.initialize(ethers.ZeroAddress);
    });

    it('Should prevent re-initialization', async function () {
      const contract = await ethers.getContractAt('AuSysUpgradeable', await proxy.getAddress());
      await expect(contract.initialize(ethers.ZeroAddress)).to.be.reverted;
    });

    it('Should have correct initial state', async function () {
      const contract = await ethers.getContractAt('AuSysUpgradeable', await proxy.getAddress());
      expect(await contract.orderIdCounter()).to.equal(0);
      expect(await contract.journeyIdCounter()).to.equal(0);
    });
  });

  describe('AuStakeUpgradeable', function () {
    let implementation: Contract;
    let proxy: Contract;
    let proxyAdmin: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      implementation = await AuStakeFactory.deploy();
      await implementation.waitForDeployment();

      proxy = await TransparentProxyFactory.deploy(
        await implementation.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await proxy.waitForDeployment();
    });

    it('Should deploy implementation', async function () {
      expect(await implementation.getAddress()).to.be.properAddress;
    });

    it('Should deploy proxy', async function () {
      expect(await proxy.getAddress()).to.be.properAddress;
    });

    it('Should initialize successfully', async function () {
      const contract = await ethers.getContractAt('AuStakeUpgradeable', await proxy.getAddress());
      await contract.initialize(deployer.address, deployer.address);
    });

    it('Should prevent re-initialization', async function () {
      const contract = await ethers.getContractAt('AuStakeUpgradeable', await proxy.getAddress());
      await expect(contract.initialize(deployer.address, deployer.address)).to.be.reverted;
    });

    it('Should have correct initial state', async function () {
      const contract = await ethers.getContractAt('AuStakeUpgradeable', await proxy.getAddress());
      expect(await contract.operationIdCounter()).to.equal(0);
    });
  });

  describe('OrderBridgeUpgradeable', function () {
    let implementation: Contract;
    let proxy: Contract;
    let proxyAdmin: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      implementation = await OrderBridgeFactory.deploy();
      await implementation.waitForDeployment();

      proxy = await TransparentProxyFactory.deploy(
        await implementation.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await proxy.waitForDeployment();
    });

    it('Should deploy implementation', async function () {
      expect(await implementation.getAddress()).to.be.properAddress;
    });

    it('Should deploy proxy', async function () {
      expect(await proxy.getAddress()).to.be.properAddress;
    });

    it('Should initialize successfully', async function () {
      const contract = await ethers.getContractAt('OrderBridgeUpgradeable', await proxy.getAddress());
      await contract.initialize(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, deployer.address);
    });

    it('Should prevent re-initialization', async function () {
      const contract = await ethers.getContractAt('OrderBridgeUpgradeable', await proxy.getAddress());
      await expect(
        contract.initialize(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, deployer.address),
      ).to.be.reverted;
    });

    it('Should have correct initial state', async function () {
      const contract = await ethers.getContractAt('OrderBridgeUpgradeable', await proxy.getAddress());
      expect(await contract.unifiedOrderCounter()).to.equal(0);
      expect(await contract.bountyPercentage()).to.equal(200);
    });
  });

  describe('Storage Layout Preservation', function () {
    let proxyAdmin: Contract;
    let aurumNodeManagerProxy: Contract;
    let aurumNodeManagerV1: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      // Deploy V1
      aurumNodeManagerV1 = await AurumNodeManagerFactory.deploy();
      await aurumNodeManagerV1.waitForDeployment();

      // Deploy proxy
      aurumNodeManagerProxy = await TransparentProxyFactory.deploy(
        await aurumNodeManagerV1.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await aurumNodeManagerProxy.waitForDeployment();

      // Initialize
      const contract = await ethers.getContractAt('AurumNodeManagerUpgradeable', await aurumNodeManagerProxy.getAddress());
      await contract.initialize(ethers.ZeroAddress, ethers.ZeroAddress);
    });

    it('Should preserve storage after upgrade', async function () {
      // Deploy V2 (same implementation for this test)
      const aurumNodeManagerV2 = await AurumNodeManagerFactory.deploy();
      await aurumNodeManagerV2.waitForDeployment();

      // Upgrade
      await proxyAdmin.upgrade(await aurumNodeManagerProxy.getAddress(), await aurumNodeManagerV2.getAddress());

      // Verify storage is preserved
      const upgradedContract = await ethers.getContractAt(
        'AurumNodeManagerUpgradeable',
        await aurumNodeManagerProxy.getAddress(),
      );

      // State should be preserved
      expect(await upgradedContract.nodeIdCounter()).to.equal(0);
    });

    it('Should work with state changes before upgrade', async function () {
      // Interact with the contract (add admin)
      const contract = await ethers.getContractAt('AurumNodeManagerUpgradeable', await aurumNodeManagerProxy.getAddress());
      await contract.setAdmin(user1.address);

      // Verify admin was set
      expect(await contract.isAdmin(user1.address)).to.be.true;

      // Deploy and upgrade to V2
      const aurumNodeManagerV2 = await AurumNodeManagerFactory.deploy();
      await aurumNodeManagerV2.waitForDeployment();

      await proxyAdmin.upgrade(await aurumNodeManagerProxy.getAddress(), await aurumNodeManagerV2.getAddress());

      // Verify admin is still set after upgrade
      const upgradedContract = await ethers.getContractAt(
        'AurumNodeManagerUpgradeable',
        await aurumNodeManagerProxy.getAddress(),
      );

      expect(await upgradedContract.isAdmin(user1.address)).to.be.true;
      expect(await upgradedContract.nodeIdCounter()).to.equal(0);
    });
  });

  describe('Proxy Pattern Verification', function () {
    let proxyAdmin: Contract;
    let proxy: Contract;
    let implementation: Contract;

    before(async function () {
      proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.waitForDeployment();

      implementation = await AurumNodeManagerFactory.deploy();
      await implementation.waitForDeployment();

      proxy = await TransparentProxyFactory.deploy(
        await implementation.getAddress(),
        await proxyAdmin.getAddress(),
        '0x',
      );
      await proxy.waitForDeployment();
    });

    it('Should have correct implementation address', async function () {
      const impl = await proxyAdmin.getImplementation(await proxy.getAddress());
      expect(impl).to.equal(await implementation.getAddress());
    });

    it('Should allow owner to upgrade', async function () {
      const newImplementation = await AurumNodeManagerFactory.deploy();
      await newImplementation.waitForDeployment();

      await proxyAdmin.upgrade(await proxy.getAddress(), await newImplementation.getAddress());

      const newImpl = await proxyAdmin.getImplementation(await proxy.getAddress());
      expect(newImpl).to.equal(await newImplementation.getAddress());
    });

    it('Should prevent non-owner from upgrading', async function () {
      const newImplementation = await AurumNodeManagerFactory.deploy();
      await newImplementation.waitForDeployment();

      // Transfer ownership to user1
      await proxyAdmin.transferOwnership(user1.address);

      // Try to upgrade as deployer (should fail)
      await expect(
        proxyAdmin.connect(deployer).upgrade(await proxy.getAddress(), await newImplementation.getAddress()),
      ).to.be.reverted;
    });
  });
});

