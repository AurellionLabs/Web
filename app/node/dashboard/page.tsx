'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { StatCard } from '@/components/ui/stat-card';
import { useRouter } from 'next/navigation';
import { useNode } from '@/app/providers/node.provider';

// This would typically come from an API or configuration
const supportedAssets = [
  { value: 'goat', label: 'Goat' },
  { value: 'sheep', label: 'Sheep' },
  { value: 'cow', label: 'Cow' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'duck', label: 'Duck' },
] as const;

const tokenizeFormSchema = z.object({
  assetType: z.string({
    required_error: 'Please select an asset type.',
  }),
  quantity: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid quantity greater than 0.',
    },
  ),
  value: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: 'Please enter a valid value greater than 0.',
    },
  ),
});

export default function NodeDashboardPage() {
  const { setCurrentUserRole } = useMainProvider();
  const { orders } = useNode();
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof tokenizeFormSchema>>({
    resolver: zodResolver(tokenizeFormSchema),
    defaultValues: {
      assetType: '',
      quantity: '',
      value: '',
    },
  });

  useEffect(() => {
    setCurrentUserRole('node');
  }, [setCurrentUserRole]);

  async function onSubmit(values: z.infer<typeof tokenizeFormSchema>) {
    try {
      // TODO: Add your blockchain call here to tokenize the asset
      console.log('Form values:', values);
      setIsAddAssetOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Error tokenizing asset:', error);
    }
  }

  // Calculate some statistics for the overview cards
  const totalValue = orders.reduce(
    (sum, order) => sum + parseFloat(order.value),
    0,
  );
  const activeOrders = orders.filter(
    (order) => order.status === 'active',
  ).length;
  const completedOrders = orders.filter(
    (order) => order.status === 'completed',
  );
  const monthlyRevenue = completedOrders
    .reduce((sum, order) => sum + parseFloat(order.value), 0)
    .toFixed(2);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Node Dashboard</h1>
        <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tokenize New Asset</DialogTitle>
              <DialogDescription>
                Add a new asset to be tokenized in the network.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supportedAssets.map((asset) => (
                            <SelectItem key={asset.value} value={asset.value}>
                              {asset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter quantity"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the number of assets to tokenize.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value (USDT)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter value in USDT"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the total value of the assets in USDT.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Tokenize Asset
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCard
              title="Value"
              value={`${totalValue.toFixed(2)} USDT`}
              change="+12.5% from last month"
            />
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => router.push('/node/orders?status=active')}
        >
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCard title="Count" value={activeOrders.toString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <StatCard
              title="This Month"
              value={`${monthlyRevenue} USDT`}
              change="+5.2% from last month"
            />
          </CardContent>
        </Card>
      </div>

      {/* Tokenized Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Tokenized Assets</CardTitle>
          <CardDescription>
            Overview of your tokenized assets in the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">Asset ID</th>
                  <th className="h-12 px-4 text-left align-middle">Type</th>
                  <th className="h-12 px-4 text-left align-middle">Quantity</th>
                  <th className="h-12 px-4 text-left align-middle">Value</th>
                  <th className="h-12 px-4 text-left align-middle">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-4">{order.id}</td>
                    <td className="p-4 capitalize">{order.asset}</td>
                    <td className="p-4">{order.quantity}</td>
                    <td className="p-4">{order.value} USDT</td>
                    <td className="p-4 capitalize">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Track your accepted orders and their status
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => router.push('/node/orders')}>
            View All Orders
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left align-middle">Order ID</th>
                  <th className="h-12 px-4 text-left align-middle">Customer</th>
                  <th className="h-12 px-4 text-left align-middle">Asset</th>
                  <th className="h-12 px-4 text-left align-middle">Quantity</th>
                  <th className="h-12 px-4 text-left align-middle">Value</th>
                  <th className="h-12 px-4 text-left align-middle">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-4">{order.id}</td>
                    <td className="p-4">{order.customer}</td>
                    <td className="p-4 capitalize">{order.asset}</td>
                    <td className="p-4">{order.quantity}</td>
                    <td className="p-4">{order.value} USDT</td>
                    <td className="p-4 capitalize">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
