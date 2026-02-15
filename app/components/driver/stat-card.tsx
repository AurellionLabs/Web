'use client';

import { HexStatCard } from '@/app/components/eva/eva-components';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: number | string;
  color?: 'gold' | 'crimson' | 'emerald';
  powerLevel?: number;
  onClick?: () => void;
  isClickable?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  color = 'gold',
  powerLevel = 0,
  onClick,
  isClickable = false,
}) => (
  <div
    className={cn(
      isClickable &&
        'cursor-pointer transition-transform duration-300 hover:scale-[1.03]',
    )}
    onClick={onClick}
  >
    <HexStatCard
      label={title}
      value={typeof value === 'number' ? value.toString() : value}
      color={color}
      powerLevel={powerLevel}
    />
  </div>
);
