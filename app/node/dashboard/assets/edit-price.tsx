'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateAssetPrice } from '@/dapp-connectors/aurum-controller';
import { toast } from 'react-hot-toast';

interface EditPriceProps {
  nodeAddress: string;
  assetId: number;
  currentPrice: string;
  supportedAssets: number[];
  assetPrices: string[];
  onPriceUpdated: () => void;
}

export function EditPrice({
  nodeAddress,
  assetId,
  currentPrice,
  supportedAssets,
  assetPrices,
  onPriceUpdated,
}: EditPriceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await updateAssetPrice(
        nodeAddress,
        assetId,
        BigInt(newPrice),
        supportedAssets,
        assetPrices.map((p) => BigInt(p)),
      );

      toast.success('Asset price updated successfully');
      setIsOpen(false);
      onPriceUpdated();
    } catch (error) {
      console.error('Error updating asset price:', error);
      toast.error('Failed to update asset price');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit Price
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Asset Price</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price (in wei)
            </label>
            <Input
              id="price"
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Enter new price"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Price'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
