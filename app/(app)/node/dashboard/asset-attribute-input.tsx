import { Input } from '@/app/components/ui/input';
import { Asset } from '@/domain/shared';
import React from 'react';
import { FormLabel } from '@/app/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

// Utility function to format snake_case to Title Case
const formatAttributeName = (name?: string | null): string => {
  const safeName = (name ?? '').toString();
  if (safeName.length === 0) return '';
  return safeName
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

type AttributeValue = string | number | boolean;

type Props = {
  asset: Asset;
  attributeValues: Record<string, AttributeValue>;
  onAttributeChange: (
    assetId: string,
    attributeName: string,
    value: AttributeValue,
  ) => void;
};

const AssetAttributeInput: React.FC<Props> = ({
  asset,
  attributeValues,
  onAttributeChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Attributes
        </h5>
      </div>
      {asset.attributes.map((attribute) => {
        const currentValue = attributeValues[attribute.name] ?? '';
        const hasOptions =
          Array.isArray(attribute.values) && attribute.values.length > 0;
        return (
          <div key={attribute.name} className="mb-4">
            <FormLabel className="block font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">
              {formatAttributeName(attribute.name)}
            </FormLabel>
            {hasOptions ? (
              <Select
                value={currentValue?.toString() ?? ''}
                onValueChange={(value) =>
                  onAttributeChange(
                    String(asset.tokenId ?? ''),
                    attribute.name,
                    value,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select ${formatAttributeName(attribute.name)}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {attribute.values.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={
                  currentValue === 0 || currentValue === ''
                    ? ''
                    : String(currentValue)
                }
                onChange={(e) =>
                  onAttributeChange(
                    String(asset.tokenId ?? ''),
                    attribute.name,
                    e.target.value,
                  )
                }
                placeholder={
                  attribute.description ||
                  `Enter ${formatAttributeName(attribute.name).toLowerCase()}`
                }
                className="w-full"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AssetAttributeInput;
