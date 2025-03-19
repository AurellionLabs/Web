import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle } from 'lucide-react';
import { CustomerOrder } from '@/app/providers/customer.provider';
import { useState } from 'react';

interface OrderActionDialogProps {
  order: CustomerOrder;
  onConfirm: (orderId: string) => Promise<void>;
  variant: 'cancel' | 'confirm';
}

interface ActionConfig {
  title: string;
  description: string;
  icon: JSX.Element;
  confirmText: string;
  cancelText: string;
  buttonVariant: 'destructive' | 'default';
  buttonStyle: string;
  triggerText: string;
}

const ACTION_CONFIGS: Record<'cancel' | 'confirm', ActionConfig> = {
  cancel: {
    title: 'Cancel Order',
    description: 'Please review the order details below before cancelling.',
    icon: <XCircle className="h-6 w-6" />,
    confirmText: 'Yes, cancel order',
    cancelText: 'No, keep order',
    buttonVariant: 'destructive',
    buttonStyle: 'w-32',
    triggerText: 'Cancel Order',
  },
  confirm: {
    title: 'Confirm Order Receipt',
    description:
      'Please review the order details below before confirming receipt.',
    icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    confirmText: 'Confirm Receipt',
    cancelText: 'Cancel',
    buttonVariant: 'default',
    buttonStyle: 'w-32 bg-green-500 hover:bg-green-600',
    triggerText: 'Confirm Receipt',
  },
};

export function OrderActionDialog({
  order,
  onConfirm,
  variant,
}: OrderActionDialogProps) {
  const [open, setOpen] = useState(false);
  const config = ACTION_CONFIGS[variant];
  const confirmationMessage =
    variant === 'cancel'
      ? 'Are you sure you want to cancel this order?'
      : 'By confirming receipt, you acknowledge that you have received the order in good condition.';

  const handleConfirm = async () => {
    await onConfirm(order.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={config.buttonVariant}
          size="sm"
          className={config.buttonStyle}
        >
          {config.triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8">
          <div className="rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="font-semibold text-gray-200 text-lg">
                Order Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Order ID</span>
                <span className="text-base font-medium text-right">
                  {order.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Asset</span>
                <span className="text-base font-medium text-right capitalize">
                  {order.asset}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Quantity</span>
                <span className="text-base font-medium text-right">
                  {order.quantity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Value</span>
                <span className="text-base font-medium text-right">
                  {order.value} USDT
                </span>
              </div>
            </div>
          </div>
          <DialogDescription className="text-center text-base py-4">
            {confirmationMessage}
            <br />
            <br />
            This action cannot be undone.
          </DialogDescription>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between gap-4 pt-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            {config.cancelText}
          </Button>
          <Button
            type="submit"
            variant={config.buttonVariant}
            className={`w-full ${variant === 'confirm' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={handleConfirm}
          >
            {config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
