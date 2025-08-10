import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { usePlatform } from '@/app/providers/platform.provider';

interface AssetClassFilterProps {
  selectedAssetClass: string;
  onSelectAssetClass: (assetClass: string) => void;
}

export function AssetClassFilter({
  selectedAssetClass,
  onSelectAssetClass,
}: AssetClassFilterProps) {
  const { supportedAssetClasses, isLoading } = usePlatform();

  // Create options array with "All Assets" option and dynamic asset classes
  const assetClassOptions = [
    { value: 'all', label: 'All Assets' },
    ...supportedAssetClasses.map((assetClass) => ({
      value: assetClass,
      label: assetClass.charAt(0).toUpperCase() + assetClass.slice(1), // Capitalize first letter
    })),
  ];

  return (
    <div className="space-y-2 w-[180px]">
      <label className="text-sm font-medium">Asset Type</label>
      <Select value={selectedAssetClass} onValueChange={onSelectAssetClass}>
        <SelectTrigger>
          <SelectValue
            placeholder={isLoading ? 'Loading...' : 'Select asset type'}
          />
        </SelectTrigger>
        <SelectContent>
          {assetClassOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
