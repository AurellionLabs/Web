import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Asset } from '@/domain/node';
import React from 'react';

// Utility function to format snake_case to Title Case
const formatAttributeName = (name: string): string => {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

type CustomAttribute = {
  name: string;
  type: 'string' | 'number';
  value?: any;
};

type Props = {
  asset: Asset;
  attributeValues: Record<string, any>;
  customAttributes: CustomAttribute[];
  onAttributeChange: (
    assetId: number,
    attributeName: string,
    value: any,
  ) => void;
  onCustomAttributeChange: (
    assetId: number,
    attributes: CustomAttribute[],
  ) => void;
};

const AssetAttributeInput: React.FC<Props> = ({
  asset,
  attributeValues,
  customAttributes,
  onAttributeChange,
  onCustomAttributeChange,
}) => {
  const addCustomAttribute = () => {
    const newAttribute: CustomAttribute = {
      name: '',
      type: 'string',
      value: '',
    };
    onCustomAttributeChange(asset.id, [...customAttributes, newAttribute]);
  };

  const updateCustomAttribute = (
    index: number,
    field: keyof CustomAttribute,
    value: any,
  ) => {
    const updated = [...customAttributes];
    if (field === 'value') {
      const isNumber =
        value !== '' && !isNaN(Number(value)) && isFinite(Number(value));
      updated[index] = {
        ...updated[index],
        value: isNumber ? Number(value) : value,
        type: isNumber ? 'number' : 'string',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    onCustomAttributeChange(asset.id, updated);
  };

  const removeCustomAttribute = (index: number) => {
    const updated = customAttributes.filter((_, i) => i !== index);
    onCustomAttributeChange(asset.id, updated);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Attributes
        </h5>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustomAttribute}
          className="text-xs text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          + Add Custom
        </Button>
      </div>
      {/* Default Attributes */}
      {asset.defaultAttributes.map((attribute) => {
        const currentValue =
          attributeValues[attribute.name] ?? attribute.defaultValue;
        return (
          <div
            key={attribute.name}
            className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatAttributeName(attribute.name)}
                {attribute.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                {attribute.unit && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({attribute.unit})
                  </span>
                )}
              </label>
            </div>
            <div className="col-span-3">
              {attribute.type === 'number' ? (
                <Input
                  type="number"
                  value={currentValue}
                  onChange={(e) => {
                    const value =
                      e.target.value === '' ? '' : Number(e.target.value);
                    onAttributeChange(asset.id, attribute.name, value);
                  }}
                  placeholder={
                    attribute.description ||
                    `Enter ${formatAttributeName(attribute.name).toLowerCase()}`
                  }
                  required={attribute.required}
                  min="0"
                  className="w-full h-9"
                />
              ) : (
                <Input
                  type="text"
                  value={currentValue || ''}
                  onChange={(e) => {
                    onAttributeChange(asset.id, attribute.name, e.target.value);
                  }}
                  placeholder={
                    attribute.description ||
                    `Enter ${formatAttributeName(attribute.name).toLowerCase()}`
                  }
                  required={attribute.required}
                  className="w-full h-9"
                />
              )}
            </div>
          </div>
        );
      })}
      {/* Custom Attributes */}
      {customAttributes.map((attr, index) => (
        <div
          key={index}
          className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        >
          <div className="col-span-2">
            <Input
              type="text"
              value={attr.name}
              onChange={(e) =>
                updateCustomAttribute(index, 'name', e.target.value)
              }
              placeholder="Attribute name"
              className="w-full h-9 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="text"
              value={attr.value}
              onChange={(e) => {
                updateCustomAttribute(index, 'value', e.target.value);
              }}
              placeholder="Enter value"
              className="w-full h-9"
            />
          </div>
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCustomAttribute(index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetAttributeInput;
