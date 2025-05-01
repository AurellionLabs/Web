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
import {
  CheckCircle2,
  MapPin,
  Navigation,
  Clock,
  Package,
  Truck,
} from 'lucide-react';
import { Delivery } from '@/app/providers/driver.provider';
import { useState } from 'react';

interface DeliveryActionDialogProps {
  delivery: Delivery;
  onConfirm: (jobId: string) => Promise<void>;
  variant: 'accept' | 'pickup' | 'complete';
}

interface ActionConfig {
  title: string;
  description: string;
  icon: JSX.Element;
  confirmText: string;
  cancelText: string;
  buttonStyle: string;
  triggerText: string;
  confirmationMessage: string;
  accentColor: string;
}

const ACTION_CONFIGS: Record<'accept' | 'pickup' | 'complete', ActionConfig> = {
  accept: {
    title: 'Accept Delivery',
    description: 'Please review the delivery details below before accepting.',
    icon: <CheckCircle2 className="h-6 w-6 text-amber-500" />,
    confirmText: 'Accept Delivery',
    cancelText: 'Cancel',
    buttonStyle: 'bg-amber-500 hover:bg-amber-600',
    triggerText: 'Accept Delivery',
    confirmationMessage:
      'By accepting this delivery, you commit to picking up and delivering the parcel according to the specified locations and timeline.',
    accentColor: 'text-amber-500',
  },
  pickup: {
    title: 'Confirm Parcel Pickup',
    description:
      'Please confirm that you have picked up the parcel from the pickup location.',
    icon: <Package className="h-6 w-6 text-blue-500" />,
    confirmText: 'Confirm Pickup',
    cancelText: 'Cancel',
    buttonStyle: 'bg-blue-500 hover:bg-blue-600',
    triggerText: 'Confirm Pickup',
    confirmationMessage:
      'By confirming pickup, you acknowledge that you have received the parcel and will deliver it to the specified destination.',
    accentColor: 'text-blue-500',
  },
  complete: {
    title: 'Confirm Parcel Delivery',
    description:
      'Please confirm that you have delivered the parcel to the destination.',
    icon: <Truck className="h-6 w-6 text-green-500" />,
    confirmText: 'Confirm Delivery',
    cancelText: 'Cancel',
    buttonStyle: 'bg-green-500 hover:bg-green-600',
    triggerText: 'Confirm Delivery',
    confirmationMessage:
      'By confirming delivery, you certify that you have successfully delivered the parcel to the specified destination.',
    accentColor: 'text-green-500',
  },
};

export function DeliveryActionDialog({
  delivery,
  onConfirm,
  variant,
}: DeliveryActionDialogProps) {
  const [open, setOpen] = useState(false);
  const config = ACTION_CONFIGS[variant];

  const handleConfirm = async () => {
    await onConfirm(delivery.jobId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={config.buttonStyle}>{config.triggerText}</Button>
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
                Delivery Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Job ID</span>
                <span className="text-base font-medium text-right">
                  {delivery.jobId}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Customer</span>
                <span className="text-base font-medium text-right">
                  {delivery.customer}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">Bounty</span>
                <span
                  className={`text-base font-medium text-right ${config.accentColor}`}
                >
                  ${delivery.fee.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-base text-gray-400">ETA</span>
                <span className="text-base font-medium text-right">
                  {delivery.ETA} mins
                </span>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <span className="text-base text-gray-400 block">
                        Pickup Location
                      </span>
                      <span className="text-base font-medium">
                        {delivery.parcelData.startName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <span className="text-base text-gray-400 block">
                        Delivery Location
                      </span>
                      <span className="text-base font-medium">
                        {delivery.parcelData.endName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogDescription className="text-center text-base py-4">
            {config.confirmationMessage}
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
            className={`w-full ${config.buttonStyle}`}
            onClick={handleConfirm}
          >
            {config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
