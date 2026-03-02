import React from 'react';
import AssetSection from './AssetSection';

type Props = {
  capacities: string[];
  onCapacityChange: (value: string[]) => void;
  selectedAssets: string[];
};

const CapacityInput: React.FC<Props> = ({
  capacities,
  onCapacityChange,
  selectedAssets,
}) => (
  <div className="space-y-6">
    {selectedAssets.map((assetClass, index) => {
      const capacity = capacities[index] ?? '';
      return (
        <AssetSection
          key={`${assetClass}-${index}`}
          assetLabel={assetClass}
          capacity={capacity}
          index={index}
          capacities={capacities}
          onCapacityChange={onCapacityChange}
        />
      );
    })}
  </div>
);

export default CapacityInput;
