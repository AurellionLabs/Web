interface PoolBalanceProps {
  token0Balance: string;
  token1Balance: string;
}

export function PoolBalance({
  token0Balance,
  token1Balance,
}: PoolBalanceProps) {
  return (
    <div>
      <h3 className="text-sm text-gray-400 mb-2">Pool balances</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{token0Balance}</span>
          <span>{token1Balance}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            style={{ width: '70%' }}
          />
        </div>
      </div>
    </div>
  );
}
