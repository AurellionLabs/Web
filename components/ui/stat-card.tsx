interface StatCardProps {
  title: string;
  value: string;
  change?: string;
}

export function StatCard({ title, value, change }: StatCardProps) {
  const isPositive =
    change && (change.startsWith('+') || !change.includes('-'));

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-400">{title}</span>
        {change && (
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
