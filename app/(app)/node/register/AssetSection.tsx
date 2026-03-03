import React from 'react';
import { Input } from '@/app/components/ui/input';
import { FormLabel } from '@/app/components/ui/form';

type Props = {
  assetLabel: string;
  capacity: string;
  index: number;
  capacities: string[];
  onCapacityChange: (value: string[]) => void;
};

const AssetSection: React.FC<Props> = ({
  assetLabel,
  capacity,
  index,
  capacities,
  onCapacityChange,
}) => (
  <>
    {index > 0 && (
      <hr className="my-8 border-t border-gray-700 dark:border-gray-600" />
    )}
    <div>
      {/* Asset Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-white">{assetLabel}</h3>
      </div>
      {/* Capacity Row */}
      <div className="mb-6">
        <FormLabel className="block font-semibold text-sm mb-2 text-white">
          Capacity
        </FormLabel>
        <Input
          type="text"
          value={capacity}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^\d*$/.test(value)) {
              const next = [...capacities];
              next[index] = value;
              onCapacityChange(next);
            }
          }}
          placeholder="Enter capacity"
          className="w-full h-12 px-4 border border-gray-700 bg-transparent text-sm placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
    </div>
  </>
);

export default AssetSection;
