import { EditPrice } from './edit-price';

// Inside your component's render function, where you display each asset:
{
  assets.map((asset) => (
    <tr key={asset.id}>
      <td>{asset.name}</td>
      <td>{asset.amount}</td>
      <td>{asset.price}</td>
      <td>
        <EditPrice
          nodeAddress={nodeAddress}
          assetId={asset.id}
          currentPrice={asset.price || '0'}
          supportedAssets={node.supportedAssets}
          assetPrices={node.assetPrices}
          onPriceUpdated={refreshAssets}
        />
      </td>
    </tr>
  ));
}
