import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssetClassFilterProps {
  selectedAssetClass: string;
  onSelectAssetClass: (assetClass: string) => void;
}

const assetClasses = [
  { value: 'all', label: 'All Assets' },
  { value: 'goat', label: 'Goat' },
  { value: 'sheep', label: 'Sheep' },
  { value: 'cattle', label: 'Cattle' },
] as const;

export function AssetClassFilter({
  selectedAssetClass,
  onSelectAssetClass,
}: AssetClassFilterProps) {
  return (
    <div className="space-y-2 w-[180px]">
      <label className="text-sm font-medium">Asset Type</label>
      <Select value={selectedAssetClass} onValueChange={onSelectAssetClass}>
        <SelectTrigger>
          <SelectValue placeholder="Select asset type" />
        </SelectTrigger>
        <SelectContent>
          {assetClasses.map((asset) => (
            <SelectItem key={asset.value} value={asset.value}>
              {asset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
