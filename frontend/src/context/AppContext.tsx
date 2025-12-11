import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Show } from '../api/client';

/**
 * Global application context for state management.
 * I'm using Context API to avoid prop drilling and keep state accessible
 * across components without needing Redux or other heavy libraries.
 */

interface AppContextType {
  shows: Show[];
  setShows: (shows: Show[]) => void;
  selectedShowId: number | null;
  setSelectedShowId: (id: number | null) => void;
  refreshShows: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  const refreshShows = () => {
    // Trigger for parent components to refetch data
    // Could be extended with actual state if needed
  };

  return (
    <AppContext.Provider
      value={{
        shows,
        setShows,
        selectedShowId,
        setSelectedShowId,
        refreshShows,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook to use the app context.
 * This provides type safety and ensures the context is used within a provider.
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
