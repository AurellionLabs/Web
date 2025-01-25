'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { colors } from '@/lib/constants/colors';
import { ethers } from 'ethers';
import { createOperation } from '@/dapp-connectors/staking-controller';

export default function CreateOperationPage() {
  const [formData, setFormData] = useState({
    name: '',
    token: '',
    provider: '',
    lengthInDays: '',
    reward: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('hererer');
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert reward to proper format (assuming 18 decimals)
      const rewardInWei = ethers.parseEther(formData.reward);

      console.log(
        await createOperation(
          formData.name,
          formData.token,
          formData.provider,
          parseInt(formData.lengthInDays),
          rewardInWei,
        ),
      );
    } catch (error: any) {
      setError(
        error.message || 'An error occurred while creating the operation',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-8">Create Operation</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Operation Name
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter operation name"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Token Address
            </label>
            <Input
              name="token"
              value={formData.token}
              onChange={handleChange}
              required
              placeholder="Enter token address"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Provider Address
            </label>
            <Input
              name="provider"
              value={formData.provider}
              onChange={handleChange}
              required
              placeholder="Enter provider address"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Length (Days)
            </label>
            <Input
              name="lengthInDays"
              type="number"
              value={formData.lengthInDays}
              onChange={handleChange}
              required
              min="1"
              placeholder="Enter length in days"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Reward Amount
            </label>
            <Input
              name="reward"
              type="text"
              value={formData.reward}
              onChange={handleChange}
              required
              placeholder="Enter reward amount"
              className="w-full"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{`error when submitting form ${error}`}</div>
          )}

          <Button
            type="submit"
            onClick={() => {
              console.log('pop');
            }}
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Creating...' : 'Create Operation'}
          </Button>
        </form>
      </div>
    </div>
  );
}
