import { createContext, useContext, useState, useCallback } from 'react';

interface Transaction {
  hash: string;
  description: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'timestamp'>) => void;
  updateTransaction: (hash: string, status: Transaction['status']) => void;
}

const TransactionContext = createContext<TransactionContextType | null>(null);

export function TransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'timestamp'>) => {
    setTransactions((prev) => [...prev, { ...tx, timestamp: Date.now() }]);
  }, []);

  const updateTransaction = useCallback(
    (hash: string, status: Transaction['status']) => {
      setTransactions((prev) =>
        prev.map((tx) => (tx.hash === hash ? { ...tx, status } : tx)),
      );
    },
    [],
  );

  return (
    <TransactionContext.Provider
      value={{ transactions, addTransaction, updateTransaction }}
    >
      {children}
    </TransactionContext.Provider>
  );
}
