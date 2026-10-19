import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface ParentSession {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

const ParentSessionContext = createContext<ParentSession | null>(null)

/** 家长模式的解锁状态只保存在内存里：刷新页面或返回孩子模式后需要重新输入 PIN。 */
export function ParentSessionProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const value = useMemo(
    () => ({ unlocked, unlock: () => setUnlocked(true), lock: () => setUnlocked(false) }),
    [unlocked],
  )
  return <ParentSessionContext.Provider value={value}>{children}</ParentSessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useParentSession(): ParentSession {
  const session = useContext(ParentSessionContext)
  if (!session) throw new Error('useParentSession must be used inside ParentSessionProvider')
  return session
}
