import { OrderRepositoryInterface } from '@/domain/orders';
import { LocationContract } from '@/typechain-types';

export class OrderRepository implements OrderRepositoryInterface {
  constructor(public contract: LocationContract) {}
  async getNodeOrders(
    address: string,
  ): Promise<LocationContract.OrderStruct[]> {
    const orders = [];
    const indexing = true;
    let i = 0;
    while (indexing)
      try {
        console.log('indexing orderids for', address);
        const orderId = await this.contract.nodeToOrderIds(address, i);
        console.log('orderId', orderId);
        const order = await this.contract.getOrder(orderId);
        console.log('order', orderId);
        orders.push(order);
        i++;
      } catch (e) {
        console.error('couldnt find order:', e);
        if (orders.length == 0) console.error('likely end of list');
        break;
      }
    return orders;
  }
}
