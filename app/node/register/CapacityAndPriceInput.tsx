import React from 'react';
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
  selectedAssets: string[];
};

const CapacityAndPriceInput: React.FC<Props> = ({
  capacityValue,
  priceValue,
  onCapacityChange,
  onPriceChange,
  selectedAssets,
}) => (
  <div className="space-y-6">
    {capacityValue.map((cap, index) => {
      const assetClass = selectedAssets[index];
      if (!assetClass) return null;
      return (
        <AssetSection
          key={index}
          assetLabel={assetClass}
          cap={cap}
          price={priceValue[index] || 0}
          index={index}
          capacityValue={capacityValue}
          priceValue={priceValue}
          onCapacityChange={onCapacityChange}
          onPriceChange={onPriceChange}
        />
      );
    })}
  </div>
);

export default CapacityAndPriceInput;
