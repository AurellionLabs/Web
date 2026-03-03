interface PoolBalanceProps {
  poolName: string;
  completionPercentage: string;
}

export function PoolBalance({
  poolName,
  completionPercentage,
}: PoolBalanceProps) {
  return (
    <div>
      <h3 className="text-sm text-white/80 mb-2">Completion Progress</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{poolName}</span>
          <span className="text-green-500">{completionPercentage}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-red-700"
            style={{ width: `${completionPercentage}` }}
          />
        </div>
      </div>
    </div>
  );
}
