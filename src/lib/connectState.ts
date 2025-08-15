const KEY = 'kutable_connect_state'

type ConnectState = { 
  userId: string; 
  accountId?: string; 
  inProgress?: boolean;
  lastUpdated?: string;
}

export function getConnectState(): ConnectState | null {
  try { 
    const raw = localStorage.getItem(KEY); 
    return raw ? JSON.parse(raw) : null;
  } catch { 
    return null;
  }
}

export function setConnectState(s: ConnectState) { 
  const stateWithTimestamp = {
    ...s,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem(KEY, JSON.stringify(stateWithTimestamp));
}

export function clearConnectState() { 
  localStorage.removeItem(KEY);
}

export function isConnectStateForUser(userId: string): boolean {
  const state = getConnectState();
  return state?.userId === userId;
}