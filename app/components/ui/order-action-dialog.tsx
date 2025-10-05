import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { CheckCircle2, XCircle, Loader2, User, Package } from 'lucide-react';
import { OrderWithAsset } from '@/app/providers/customer.provider';
import { useState } from 'react';

interface OrderActionDialogProps {
  order: OrderWithAsset;
  onConfirm: (orderId: string) => Promise<void>;
  variant: 'cancel' | 'confirm' | 'pickup';
  isLoading?: boolean;
  isWaitingForSignature?: boolean;
  waitingForRole?: 'driver' | 'customer';
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
  waitingForDriverText: string;
  waitingForCustomerText: string;
}

const ACTION_CONFIGS: Record<'cancel' | 'confirm' | 'pickup', ActionConfig> = {
  cancel: {
    title: 'Cancel Order',
    description: 'Please review the order details below before cancelling.',
    icon: <XCircle className="h-6 w-6" />,
    confirmText: 'Yes, cancel order',
    cancelText: 'No, keep order',
    buttonVariant: 'destructive',
    buttonStyle: 'w-32',
    triggerText: 'Cancel Order',
    waitingForDriverText: 'Waiting for driver to sign...',
    waitingForCustomerText: 'Waiting for customer to sign...',
  },
  pickup: {
    title: 'Confirm Package Pickup',
    description:
      'Please review and sign to confirm the driver can pick up your package.',
    icon: <Package className="h-6 w-6 text-amber-500" />,
    confirmText: 'Sign for Pickup',
    cancelText: 'Cancel',
    buttonVariant: 'default',
    buttonStyle: 'w-32 bg-amber-500 hover:bg-amber-600',
    triggerText: 'Sign for Pickup',
    waitingForDriverText: 'Waiting for driver signature...',
    waitingForCustomerText: 'Waiting for your signature...',
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
    waitingForDriverText: 'Waiting for driver to sign...',
    waitingForCustomerText: 'Waiting for customer to sign...',
  },
};

export function OrderActionDialog({
  order,
  onConfirm,
  variant,
  isLoading = false,
  isWaitingForSignature = false,
  waitingForRole,
}: OrderActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const config = ACTION_CONFIGS[variant];
  const confirmationMessage =
    variant === 'cancel'
      ? 'Are you sure you want to cancel this order?'
      : 'By confirming receipt, you acknowledge that you have received the order in good condition.';

  const getWaitingMessage = () => {
    if (!waitingForRole) return '';
    return waitingForRole === 'driver'
      ? config.waitingForDriverText
      : config.waitingForCustomerText;
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(order.id);
      setOpen(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={config.buttonVariant}
          size="sm"
          className={config.buttonStyle}
          disabled={isLoading || isWaitingForSignature}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isWaitingForSignature ? (
            <>
              <User className="mr-2 h-4 w-4" />
              {getWaitingMessage()}
            </>
          ) : (
            config.triggerText
          )}
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
                  {order.asset?.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Quantity</span>
                <span className="text-base font-medium text-right">
                  {order.tokenQuantity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Value</span>
                <span className="text-base font-medium text-right">
                  {order.price} USDT
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
            disabled={isConfirming || isWaitingForSignature}
          >
            {config.cancelText}
          </Button>
          <Button
            type="submit"
            variant={config.buttonVariant}
            className={`w-full ${variant === 'confirm' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={handleConfirm}
            disabled={isConfirming || isWaitingForSignature}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isWaitingForSignature ? (
              <>
                <User className="mr-2 h-4 w-4" />
                {getWaitingMessage()}
              </>
            ) : (
              config.confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
