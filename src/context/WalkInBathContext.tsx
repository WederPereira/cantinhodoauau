import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WalkInBath, BathStatus } from '@/types/client';

const STORAGE_KEY = 'walkin-baths';

interface WalkInBathContextType {
  baths: WalkInBath[];
  addBath: (data: Omit<WalkInBath, 'id' | 'createdAt'>) => void;
  updateBathStatus: (id: string, status: BathStatus) => void;
  deleteBath: (id: string) => void;
  getTodayBaths: () => WalkInBath[];
  getTotalRevenue: () => number;
  getByStatus: (status: BathStatus) => WalkInBath[];
}

const WalkInBathContext = createContext<WalkInBathContextType | undefined>(undefined);

const loadBaths = (): WalkInBath[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored).map((b: any) => ({
        ...b,
        date: new Date(b.date),
        createdAt: new Date(b.createdAt),
        serviceType: b.serviceType || 'Banho',
        petSize: b.petSize || 'Médio',
        status: b.status || 'Concluído',
      }));
    }
  } catch (e) {
    console.error('Error loading baths:', e);
  }
  return [];
};

const saveBaths = (baths: WalkInBath[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(baths));
  } catch (e) {
    console.error('Error saving baths:', e);
  }
};

export const WalkInBathProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [baths, setBaths] = useState<WalkInBath[]>(() => loadBaths());

  useEffect(() => { saveBaths(baths); }, [baths]);

  const addBath = useCallback((data: Omit<WalkInBath, 'id' | 'createdAt'>) => {
    const newBath: WalkInBath = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setBaths(prev => [newBath, ...prev]);
  }, []);

  const updateBathStatus = useCallback((id: string, status: BathStatus) => {
    setBaths(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }, []);

  const deleteBath = useCallback((id: string) => {
    setBaths(prev => prev.filter(b => b.id !== id));
  }, []);

  const getTodayBaths = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return baths.filter(b => {
      const d = new Date(b.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }, [baths]);

  const getTotalRevenue = useCallback(() => {
    return baths.reduce((sum, b) => sum + b.price, 0);
  }, [baths]);

  const getByStatus = useCallback((status: BathStatus) => {
    return baths.filter(b => b.status === status);
  }, [baths]);

  return (
    <WalkInBathContext.Provider value={{ baths, addBath, updateBathStatus, deleteBath, getTodayBaths, getTotalRevenue, getByStatus }}>
      {children}
    </WalkInBathContext.Provider>
  );
};

export const useWalkInBaths = () => {
  const ctx = useContext(WalkInBathContext);
  if (!ctx) throw new Error('useWalkInBaths must be used within WalkInBathProvider');
  return ctx;
};
