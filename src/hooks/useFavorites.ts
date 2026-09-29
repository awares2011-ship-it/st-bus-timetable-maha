import { useCallback, useEffect, useState } from 'react';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  type Favorite,
  type FavoriteRoute,
  type FavoriteStation,
} from '@/services/db';

/** Favourites live in IndexedDB — no account, fully offline, per-device. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    setFavorites(await getFavorites());
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const has = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const toggleRoute = useCallback(
    async (r: Omit<FavoriteRoute, 'kind' | 'savedAt'>) => {
      const id = r.id;
      if (favorites.some((f) => f.id === id)) await removeFavorite(id);
      else await addFavorite({ ...r, kind: 'route', savedAt: Date.now() });
      await refresh();
    },
    [favorites, refresh],
  );

  const toggleStation = useCallback(
    async (s: Omit<FavoriteStation, 'kind' | 'savedAt'>) => {
      const id = s.id;
      if (favorites.some((f) => f.id === id)) await removeFavorite(id);
      else await addFavorite({ ...s, kind: 'station', savedAt: Date.now() });
      await refresh();
    },
    [favorites, refresh],
  );

  return { favorites, loaded, has, toggleRoute, toggleStation, refresh };
}
