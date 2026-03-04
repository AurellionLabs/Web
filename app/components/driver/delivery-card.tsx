'use client';

import {
  EvaPanel,
  EvaStatusBadge,
  EvaScanLine,
} from '@/app/components/eva/eva-components';
import { DeliveryActionDialog } from '@/app/components/ui/delivery-action-dialog';
import { Delivery, DeliveryStatus } from '@/domain/driver';
import {
  MapPin,
  Navigation,
  Clock,
  Package,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

export interface DeliveryCardProps {
  delivery: Delivery;
  onAccept?: (jobId: string) => Promise<void>;
  onPickup?: (jobId: string) => Promise<void>;
  onComplete?: (jobId: string) => Promise<void>;
  isLoading?: boolean;
  isWaitingForCustomer?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onAccept,
  onPickup,
  onComplete,
  isLoading,
  isWaitingForCustomer,
}) => {
  const getStatusBadge = () => {
    switch (delivery.currentStatus) {
      case DeliveryStatus.PENDING:
        return <EvaStatusBadge status="created" label="Available" />;
      case DeliveryStatus.ACCEPTED:
        return <EvaStatusBadge status="processing" label="Accepted" />;
      case DeliveryStatus.AWAITING_SENDER:
        return <EvaStatusBadge status="pending" label="Waiting for Sender" />;
      case DeliveryStatus.PICKED_UP:
        return <EvaStatusBadge status="active" label="In Transit" />;
      case DeliveryStatus.COMPLETED:
        return <EvaStatusBadge status="completed" label="Completed" />;
      default:
        return <EvaStatusBadge status="pending" label="Unknown" />;
    }
  };

  const statusAccent: 'gold' | 'crimson' =
    delivery.currentStatus === DeliveryStatus.COMPLETED ||
    delivery.currentStatus === DeliveryStatus.PICKED_UP
      ? 'gold'
      : 'crimson';

  return (
    <EvaPanel
      label="Delivery"
      sysId={`JOB-${delivery.jobId.slice(0, 6)}`}
      accent={statusAccent}
    >
      {/* Top row: Job ID + Status + Fee */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40">
            Job ID:
          </span>
          <span className="font-mono font-bold text-gold tracking-wider text-sm">
            {delivery.jobId.slice(0, 10)}...{delivery.jobId.slice(-6)}
          </span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gold/60" />
          <span className="font-mono text-2xl font-bold tabular-nums text-gold">
            ${delivery.fee.toFixed(2)}
          </span>
        </div>
      </div>

      <EvaScanLine variant="gold" />

      {/* Route visualization */}
      <div className="mt-4 mb-4">
        <div className="flex items-stretch gap-3">
          {/* Pickup */}
          <div
            className="flex-1 bg-card/40 border border-border/20 p-3"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-crimson" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-crimson/70 font-bold">
                Pickup
              </span>
            </div>
            <p
              className={`font-mono text-sm leading-relaxed ${delivery.parcelData.startName ? 'text-foreground/80' : 'text-amber-400 italic'}`}
            >
              {delivery.parcelData.startName || 'Location not set'}
            </p>
          </div>

          {/* Arrow connector */}
          <div className="flex items-center">
            <div className="flex items-center gap-1">
              <div className="w-4 h-[1px] bg-gold/30" />
              <ArrowRight className="w-5 h-5 text-gold/50" />
              <div className="w-4 h-[1px] bg-gold/30" />
            </div>
          </div>

          {/* Delivery */}
          <div
            className="flex-1 bg-card/40 border border-border/20 p-3"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-emerald-400/70 font-bold">
                Delivery
              </span>
            </div>
            <p className="font-mono text-sm text-foreground/80 leading-relaxed">
              {delivery.parcelData.endName}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom row: Meta info + Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 font-mono text-xs text-foreground/40 tracking-wider">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="uppercase tabular-nums">
              ETA:{' '}
              {delivery.ETA > 946684800
                ? (() => {
                    const diff = delivery.ETA - Math.floor(Date.now() / 1000);
                    if (diff <= 0) return 'Overdue';
                    const h = Math.floor(diff / 3600);
                    const m = Math.floor((diff % 3600) / 60);
                    if (h > 48)
                      return (
                        new Date(delivery.ETA * 1000).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'short' },
                        ) +
                        ' ' +
                        new Date(delivery.ETA * 1000).toLocaleTimeString(
                          'en-GB',
                          { hour: '2-digit', minute: '2-digit' },
                        )
                      );
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                  })()
                : `${
                    delivery.ETA > 946684800
                      ? (() => {
                          const diff =
                            delivery.ETA - Math.floor(Date.now() / 1000);
                          if (diff <= 0) return 'Overdue';
                          const h = Math.floor(diff / 3600);
                          const m = Math.floor((diff % 3600) / 60);
                          if (h > 48)
                            return (
                              new Date(delivery.ETA * 1000).toLocaleDateString(
                                'en-GB',
                                { day: 'numeric', month: 'short' },
                              ) +
                              ' ' +
                              new Date(delivery.ETA * 1000).toLocaleTimeString(
                                'en-GB',
                                { hour: '2-digit', minute: '2-digit' },
                              )
                            );
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()
                      : `${delivery.ETA} mins`
                  }`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {delivery.customer.slice(0, 6)}...{delivery.customer.slice(-4)}
            </span>
          </div>
        </div>

        <div>
          {delivery.currentStatus === DeliveryStatus.PENDING && onAccept && (
            <DeliveryActionDialog
              delivery={delivery}
              onConfirm={onAccept}
              variant="accept"
              isLoading={isLoading}
              missingPickupLocation={!delivery.parcelData.startName}
            />
          )}
          {delivery.currentStatus === DeliveryStatus.ACCEPTED && onPickup && (
            <DeliveryActionDialog
              delivery={delivery}
              onConfirm={onPickup}
              variant="pickup"
              isLoading={isLoading}
            />
          )}
          {delivery.currentStatus === DeliveryStatus.AWAITING_SENDER && (
            <div
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20"
              style={{
                clipPath:
                  'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              }}
            >
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-amber-300">
                Waiting for sender
              </span>
            </div>
          )}
          {delivery.currentStatus === DeliveryStatus.PICKED_UP &&
            onComplete && (
              <DeliveryActionDialog
                delivery={delivery}
                onConfirm={onComplete}
                variant="complete"
                isLoading={isLoading}
                isWaitingForSignature={isWaitingForCustomer}
                waitingForRole="customer"
              />
            )}
        </div>
      </div>
    </EvaPanel>
  );
};
