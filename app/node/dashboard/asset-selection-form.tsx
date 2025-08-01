import React, { useState, useEffect } from 'react';
import { Asset } from '@/domain/node';
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

type CustomAttribute = {
  name: string;
  type: 'string' | 'number';
  value?: any;
};

type Props = {
  selectedAssetId: string;
  quantity: string;
  supportedAssets: Asset[];
  onAssetIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
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

const AssetSelectionForm: React.FC<Props> = ({
  selectedAssetId,
  quantity,
  supportedAssets,
  onAssetIdChange,
  onQuantityChange,
  assetAttributes,
  customAttributes,
  onAssetAttributeChange,
  onCustomAttributeChange,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Update selected asset when assetId changes
  useEffect(() => {
    if (selectedAssetId) {
      const asset = supportedAssets.find(
        (a) => a.id.toString() === selectedAssetId,
      );
      setSelectedAsset(asset || null);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, supportedAssets]);

  return (
    <div className="space-y-6">
      {/* Asset Selection */}
      <div>
        <FormLabel>Asset</FormLabel>
        {supportedAssets.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p>No assets available for this node.</p>
            <p className="text-sm mt-1">
              Please check if the node has any supported assets.
            </p>
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
              {supportedAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id.toString()}>
                  {asset.label}
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter the number of assets to tokenize.
        </p>
      </div>

      {/* Asset Attributes */}
      {selectedAsset && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {selectedAsset.label} Attributes
          </h3>
          <AssetAttributeInput
            asset={selectedAsset}
            attributeValues={assetAttributes[selectedAsset.id.toString()] || {}}
            customAttributes={
              customAttributes[selectedAsset.id.toString()] || []
            }
            onAttributeChange={onAssetAttributeChange}
            onCustomAttributeChange={onCustomAttributeChange}
          />
        </div>
      )}
    </div>
  );
};

export default AssetSelectionForm;
