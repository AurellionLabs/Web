import React from 'react';
import { Input } from '@/app/components/ui/input';
import AssetAttributeInput from './AssetAttributeInput';
import { Asset } from '@/domain/node';
import { FormLabel } from '@/app/components/ui/form';

type CustomAttribute = {
  name: string;
  type: 'string' | 'number';
  value?: any;
};

type Props = {
  asset: Asset;
  assetLabel: string;
  cap: number;
  price: number;
  index: number;
  capacityValue: number[];
  priceValue: number[];
  onCapacityChange: (value: number[]) => void;
  onPriceChange: (value: number[]) => void;
  attributeValues: Record<string, any>;
  customAttributes: CustomAttribute[];
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

const AssetSection: React.FC<Props> = ({
  asset,
  assetLabel,
  cap,
  price,
  index,
  capacityValue,
  priceValue,
  onCapacityChange,
  onPriceChange,
  attributeValues,
  customAttributes,
  onAssetAttributeChange,
  onCustomAttributeChange,
}) => (
  <>
    {index > 0 && (
      <hr className="my-8 border-t border-gray-700 dark:border-gray-600" />
    )}
    <div>
      {/* Asset Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {assetLabel}
        </h3>
      </div>
      {/* Capacity Row */}
      <div className="mb-6">
        <FormLabel className="block font-semibold text-sm mb-2 text-white">
          Capacity
        </FormLabel>
        <Input
          type="number"
          value={cap}
          onChange={(e) => {
            const newValue = [...capacityValue];
            newValue[index] = parseInt(e.target.value) || 0;
            onCapacityChange(newValue);
          }}
          placeholder="Maximum capacity"
          min="0"
          className="w-full h-12 px-4 border border-gray-700 bg-transparent text-sm placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
      {/* Price Row */}
      <div className="mb-6">
        <FormLabel className="block font-semibold text-sm mb-2 text-white">
          Price
        </FormLabel>
        <Input
          type="number"
          value={price}
          onChange={(e) => {
            const newValue = [...priceValue];
            newValue[index] = parseInt(e.target.value) || 0;
            onPriceChange(newValue);
          }}
          placeholder="Price per unit"
          min="0"
          className="w-full h-12 px-4 border border-gray-700 bg-transparent text-sm placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
      {/* Asset Attributes */}
      <AssetAttributeInput
        asset={asset}
        attributeValues={attributeValues}
        customAttributes={customAttributes}
        onAttributeChange={onAssetAttributeChange}
        onCustomAttributeChange={onCustomAttributeChange}
      />
    </div>
  </>
);

export default AssetSection;
