import { createContext, useContext } from 'react';

// Shared by all pages inside the app layout:
// month, setMonth, refresh (reload data), openTransaction (add/edit pop-up), askConfirm (yes/no pop-up)
export const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);
