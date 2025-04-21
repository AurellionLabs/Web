export interface NodeOrderHandlingService {
  handOff(
    nodeAddress: string,
    driver: string,
    receiver: string,
    id: string,
    tokenIds: number[],
    token: string,
    quantities: number[],
    data: any,
  ): Promise<any>;

  handOn(
    nodeAddress: string,
    driver: string,
    receiver: string,
    id: string,
  ): Promise<any>;
}
