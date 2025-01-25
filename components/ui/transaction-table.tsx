interface Transaction {
  time: string;
  type: string;
  usdValue: string;
  token0Amount: string;
  token1Amount: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">Transactions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-gray-400">
              <th className="py-3 px-4 text-left">Time</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-right">USD Value</th>
              <th className="py-3 px-4 text-right">Token Amount</th>
              <th className="py-3 px-4 text-right">Token Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr
                key={index}
                className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-4 px-4 text-gray-400">{tx.time}</td>
                <td
                  className={`py-4 px-4 ${
                    tx.type === 'Remove'
                      ? 'text-red-500'
                      : tx.type === 'Add'
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`}
                >
                  {tx.type}
                </td>
                <td className="py-4 px-4 text-right">{tx.usdValue}</td>
                <td className="py-4 px-4 text-right">{tx.token0Amount}</td>
                <td className="py-4 px-4 text-right">{tx.token1Amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
