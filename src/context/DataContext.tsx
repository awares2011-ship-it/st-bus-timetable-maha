import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Division, Route, ServiceType, Stop, Depot } from '@/types/domain';
import { loadCore, type CoreData } from '@/services/data';

type Status = 'loading' | 'ready' | 'error';

interface DataContextValue {
  status: Status;
  core: CoreData | null;
  error?: string;
  reload: () => void;
  online: boolean;
  stopById: Map<string, Stop>;
  divisionById: Map<string, Division>;
  serviceById: Map<string, ServiceType>;
  depotById: Map<string, Depot>;
  routeById: Map<string, Route>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [core, setCore] = useState<CoreData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>();
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const reload = useCallback(() => {
    setStatus('loading');
    setError(undefined);
    loadCore()
      .then((c) => {
        setCore(c);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const maps = useMemo(() => {
    return {
      stopById: new Map((core?.stops ?? []).map((s) => [s.id, s])),
      divisionById: new Map((core?.divisions ?? []).map((d) => [d.id, d])),
      serviceById: new Map((core?.serviceTypes ?? []).map((s) => [s.id, s])),
      depotById: new Map((core?.depots ?? []).map((d) => [d.id, d])),
      routeById: new Map((core?.routes ?? []).map((r) => [r.id, r])),
    };
  }, [core]);

  const value: DataContextValue = { status, core, error, reload, online, ...maps };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
