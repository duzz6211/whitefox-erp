import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface UserDirectory {
  users: User[];
  byId: Map<string, User>;
  nameOf: (id: string | null | undefined) => string;
  reload: () => Promise<void>;
}

const Ctx = createContext<UserDirectory | null>(null);

export function UserDirectoryProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);

  async function reload() {
    try {
      const { data } = await api.get<User[]>('/users');
      setUsers(data);
    } catch {
      // ignore — 로그인 전일 수 있음
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const byId = new Map(users.map((u) => [u.id, u]));

  function nameOf(id: string | null | undefined): string {
    if (!id) return '-';
    const u = byId.get(id);
    if (u) return u.name;
    return id.slice(0, 6);
  }

  return <Ctx.Provider value={{ users, byId, nameOf, reload }}>{children}</Ctx.Provider>;
}

export function useUserDirectory(): UserDirectory {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('UserDirectoryProvider 안에서 사용해야 합니다');
  return ctx;
}
