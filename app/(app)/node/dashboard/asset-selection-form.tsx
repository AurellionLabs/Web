import React, { useState, useEffect } from 'react';
import { Asset } from '@/domain/shared';

type AttributeValue = string | number | boolean;
import { Input } from '@/app/components/ui/input';
import { FormLabel } from '@/app/components/ui/form';
import AssetAttributeInput from './asset-attribute-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { usePlatform } from '@/app/providers/platform.provider';
type Props = {
  selectedAssetClass: string;
  selectedAssetId: string;
  quantity: string;
  price: string;
  quoteTokenDecimals: number;
  supportedAssetClasses: string[];
  onAssetClassChange: (value: string) => void;
  onAssetIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  assetAttributes: Record<string, Record<string, AttributeValue>>;
  onAssetAttributeChange: (
    assetId: string,
    attributeName: string,
    value: AttributeValue,
  ) => void;
  onSelectedAssetChange?: (asset: Asset | null) => void;
};

/**
 * Asset selection form for tokenizing assets.
 */
const AssetSelectionForm: React.FC<Props> = ({
  selectedAssetClass,
  selectedAssetId,
  quantity,
  price,
  quoteTokenDecimals,
  supportedAssetClasses,
  onAssetClassChange,
  onAssetIdChange,
  onQuantityChange,
  onPriceChange,
  assetAttributes,
  onAssetAttributeChange,
  onSelectedAssetChange,
}) => {
  const { getClassTokenizableAssets } = usePlatform();
  const [classAssets, setClassAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Load assets when asset class changes
  useEffect(() => {
    const loadAssetsForClass = async () => {
      setSelectedAsset(null);
      setClassAssets([]);
      if (!selectedAssetClass) return;
      setLoadingAssets(true);
      try {
        const assets = await getClassTokenizableAssets(selectedAssetClass);
        setClassAssets(assets);
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssetsForClass();
  }, [selectedAssetClass, getClassTokenizableAssets]);

  // Update selected asset when assetId changes
  useEffect(() => {
    if (selectedAssetId) {
      const asset = classAssets.find((a: Asset) => {
        const idStr = String(a?.tokenId ?? a?.tokenID ?? '');
        return idStr === selectedAssetId;
      });
      setSelectedAsset(asset || null);
      onSelectedAssetChange?.(asset || null);
    } else {
      setSelectedAsset(null);
      onSelectedAssetChange?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssetId, classAssets]); // onSelectedAssetChange excluded: stable callback from parent, would cause infinite loop if included

  return (
    <div className="space-y-6">
      {/* Asset Class Selection */}
      <div>
        <FormLabel>Asset Class</FormLabel>
        <Select
          value={selectedAssetClass}
          onValueChange={(value) => {
            onAssetClassChange(value);
            onAssetIdChange('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select asset class" />
          </SelectTrigger>
          <SelectContent>
            {supportedAssetClasses.map((assetClass) => (
              <SelectItem key={assetClass} value={assetClass}>
                {assetClass}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Asset Selection within class */}
      <div>
        <FormLabel>Asset</FormLabel>
        {loadingAssets ? (
          <div className="p-4 text-sm text-white/70">Loading assets...</div>
        ) : classAssets.length === 0 ? (
          <div className="p-4 text-center text-white/80 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p>No assets found for this class.</p>
          </div>
        ) : (
          <Select
            value={selectedAssetId}
            onValueChange={(value) => {
              onAssetIdChange(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an asset" />
            </SelectTrigger>
            <SelectContent>
              {classAssets.map((asset: Asset) => (
                <SelectItem
                  key={String(asset?.tokenId ?? asset?.tokenID)}
                  value={String(asset?.tokenId ?? asset?.tokenID)}
                >
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Quantity Input */}
      <div>
        <FormLabel>Quantity</FormLabel>
        <Input
          type="text"
          placeholder="Enter quantity"
          value={quantity}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow digits and empty string
            if (value === '' || /^\d+$/.test(value)) {
              onQuantityChange(value);
            }
          }}
        />
        <p className="text-sm text-white/80 mt-1">
          Enter the number of assets to tokenize.
        </p>
      </div>

      {/* Price Input */}
      <div>
        <FormLabel>Initial Price</FormLabel>
        <Input
          type="text"
          placeholder="Enter integer price"
          value={price}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^\d+$/.test(value)) {
              onPriceChange(value);
            }
          }}
        />
        <p className="text-sm text-white/80 mt-1">
          Enter a whole-number price. The service scales it on-chain by
          multiplying with 10^{quoteTokenDecimals}.
        </p>
      </div>

      {/* Asset Attributes */}
      {selectedAsset && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 text-white">
            {selectedAsset.name} Attributes
          </h3>
          <AssetAttributeInput
            asset={selectedAsset}
            attributeValues={
              assetAttributes[
                String(selectedAsset?.tokenId ?? selectedAsset?.tokenID ?? '')
              ] || {}
            }
            onAttributeChange={onAssetAttributeChange}
          />
        </div>
      )}
    </div>
  );
};

export default AssetSelectionForm;
