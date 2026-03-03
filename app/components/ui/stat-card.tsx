interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon?: React.ReactNode;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  description,
}: StatCardProps) {
  const isPositive =
    change && (change.startsWith('+') || !change.includes('-'));

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
      {icon && <div>{icon}</div>}
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-white/80">{title}</span>
          {change && (
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {change}
            </span>
          )}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {description && (
          <div className="text-sm text-white/80 mt-1">{description}</div>
        )}
      </div>
    </div>
  );
}
