'use client';
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type UserRole = 'customer' | 'node' | 'driver';

interface ChainContextType {
  connected: boolean;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const useMainProvider = () => {
  const context = useContext(ChainContext);
  if (!context)
    throw new Error('useMainProvider must be used within MainProvider');
  return context;
};

const MainProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('customer');

  return (
    <ChainContext.Provider
      value={{
        connected,
        setConnected,
        currentUserRole,
        setCurrentUserRole,
      }}
    >
      {children}
    </ChainContext.Provider>
  );
};

export default MainProvider;
