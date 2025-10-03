'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { useSelectedNode } from '@/app/providers/selected-node.provider';
import { toast } from 'react-hot-toast';

interface EditPriceProps {
  nodeAddress: string;
  assetId: number;
  currentPrice: string;
  supportedAssets: bigint[];
  assetPrices: bigint[];
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
  const { updateAssetPrice } = useSelectedNode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await updateAssetPrice(
        nodeAddress, // This will be used as assetToken
        String(assetId), // assetTokenId
        BigInt(newPrice), // newPrice as bigint
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
        <Button variant="ghost" className="w-full justify-start">
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
