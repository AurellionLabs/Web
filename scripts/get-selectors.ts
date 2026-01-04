// @ts-nocheck - Script with outdated contract types
const OrdersFacet = await ethers.getContractFactory('OrdersFacet');
const CLOBFacet = await ethers.getContractFactory('CLOBFacet');

console.log('OrdersFacet selectors:');
console.log(
  '  createOrder:',
  OrdersFacet.interface.getFunction('createOrder').selector,
);
console.log(
  '  cancelOrder:',
  OrdersFacet.interface.getFunction('cancelOrder').selector,
);
console.log(
  '  getOrder:',
  OrdersFacet.interface.getFunction('getOrder').selector,
);
console.log(
  '  updateOrderStatus:',
  OrdersFacet.interface.getFunction('updateOrderStatus').selector,
);

console.log('\nCLOBFacet selectors:');
console.log(
  '  createMarket:',
  CLOBFacet.interface.getFunction('createMarket').selector,
);
console.log(
  '  placeOrder:',
  CLOBFacet.interface.getFunction('placeOrder').selector,
);
console.log(
  '  cancelOrder:',
  CLOBFacet.interface.getFunction('cancelOrder').selector,
);
console.log(
  '  getOrder:',
  CLOBFacet.interface.getFunction('getOrder').selector,
);
