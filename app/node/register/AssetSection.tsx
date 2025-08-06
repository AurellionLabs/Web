import React from 'react';
import { Input } from '@/app/components/ui/input';
import { FormLabel } from '@/app/components/ui/form';

type Props = {
  assetLabel: string;
  cap: number;
  price: number;
  index: number;
  capacityValue: number[];
  priceValue: number[];
  onCapacityChange: (value: number[]) => void;
  onPriceChange: (value: number[]) => void;
};

const AssetSection: React.FC<Props> = ({
  assetLabel,
  cap,
  price,
  index,
  capacityValue,
  priceValue,
  onCapacityChange,
  onPriceChange,
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
          type="text"
          value={cap === 0 ? '' : cap}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty string, numbers, and backspace
            if (value === '' || /^\d*$/.test(value)) {
              const newValue = [...capacityValue];
              newValue[index] = value === '' ? 0 : parseInt(value) || 0;
              onCapacityChange(newValue);
            }
          }}
          placeholder="Maximum capacity"
          className="w-full h-12 px-4 border border-gray-700 bg-transparent text-sm placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
      {/* Price Row */}
      <div className="mb-6">
        <FormLabel className="block font-semibold text-sm mb-2 text-white">
          Price
        </FormLabel>
        <Input
          type="text"
          value={price === 0 ? '' : price}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty string, numbers, and backspace
            if (value === '' || /^\d*$/.test(value)) {
              const newValue = [...priceValue];
              newValue[index] = value === '' ? 0 : parseInt(value) || 0;
              onPriceChange(newValue);
            }
          }}
          placeholder="Price per unit"
          className="w-full h-12 px-4 border border-gray-700 bg-transparent text-sm placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
    </div>
  </>
);

export default AssetSection;
