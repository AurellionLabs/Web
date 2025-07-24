import React from 'react';
import { Asset } from '@/domain/node';
import AssetSection from './AssetSection';

type CustomAttribute = {
  name: string;
  type: 'string' | 'number';
  value?: any;
};

type Props = {
  capacityValue: number[];
  priceValue: number[];
  onCapacityChange: (value: number[]) => void;
  onPriceChange: (value: number[]) => void;
  selectedAssets: number[];
  supportedAssets: Asset[];
  assetAttributes: Record<string, Record<string, any>>;
  customAttributes: Record<string, CustomAttribute[]>;
  onAssetAttributeChange: (
    assetId: number,
    attributeName: string,
    value: any,
  ) => void;
  onCustomAttributeChange: (
    assetId: number,
    attributes: CustomAttribute[],
  ) => void;
};

const CapacityAndPriceInput: React.FC<Props> = ({
  capacityValue,
  priceValue,
  onCapacityChange,
  onPriceChange,
  selectedAssets,
  supportedAssets,
  assetAttributes,
  customAttributes,
  onAssetAttributeChange,
  onCustomAttributeChange,
}) => (
  <div className="space-y-6">
    {capacityValue.map((cap, index) => {
      const assetId = selectedAssets[index];
      const asset = supportedAssets.find((a) => a.id === assetId);
      const assetLabel = asset?.label || `Asset ${index + 1}`;
      if (!asset) return null;
      return (
        <AssetSection
          key={index}
          asset={asset}
          assetLabel={assetLabel}
          cap={cap}
          price={priceValue[index] || 0}
          index={index}
          capacityValue={capacityValue}
          priceValue={priceValue}
          onCapacityChange={onCapacityChange}
          onPriceChange={onPriceChange}
          attributeValues={assetAttributes[assetId.toString()] || {}}
          customAttributes={customAttributes[assetId.toString()] || []}
          onAssetAttributeChange={onAssetAttributeChange}
          onCustomAttributeChange={onCustomAttributeChange}
        />
      );
    })}
  </div>
);

export default CapacityAndPriceInput;
