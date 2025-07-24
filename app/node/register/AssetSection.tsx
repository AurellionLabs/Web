import React from 'react';
import { Input } from '@/app/components/ui/input';
import AssetAttributeInput from './AssetAttributeInput';
import { Asset } from '@/domain/node';

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
        <div className="w-2 h-8 bg-amber-300 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {assetLabel}
        </h3>
      </div>
      {/* Capacity Row */}
      <div className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Capacity <span className="text-red-500">*</span>
          </label>
        </div>
        <div className="col-span-3">
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
            className="w-full h-9"
          />
        </div>
      </div>
      {/* Price Row */}
      <div className="grid grid-cols-5 gap-4 items-center py-3 mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Price <span className="text-red-500">*</span>
          </label>
        </div>
        <div className="col-span-3">
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
            className="w-full h-9"
          />
        </div>
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
