// Office context: holds the list of offices for admin screens.
import { createContext, useCallback, useContext, useState } from 'react';
import { api, getActiveSession, getApiErrorMessage } from '../services/ApiService';

const defaultOfficeContext = {
  officeData: [],
  setOfficeData: () => {},
  refreshOffices: async () => [],
  officesLoading: false,
  officesError: null,
};

// 1. Create Context
const OfficeContext = createContext(defaultOfficeContext);

// 2. Create Provider Component
export const OfficeProvider = ({ children }) => {
  const [officeData, setOfficeData] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [officesError, setOfficesError] = useState(null);

  // L-03: Let the context own its data fetching instead of relying on the
  // Dashboard screen to populate it as a side-effect. The offices endpoint is
  // admin-only, so we only fetch when an admin session is present; this keeps
  // the provider safe to mount app-wide (including employee/login screens).
  const refreshOffices = useCallback(async () => {
    try {
      const session = await getActiveSession();
      if (!session?.token || session.role !== 'admin') {
        return [];
      }

      setOfficesLoading(true);
      setOfficesError(null);

      const response = await api.get('/api/offices');
      const offices = Array.isArray(response.data?.offices) ? response.data.offices : [];
      setOfficeData(offices);
      return offices;
    } catch (error) {
      setOfficesError(getApiErrorMessage(error, 'Failed to load offices'));
      return [];
    } finally {
      setOfficesLoading(false);
    }
  }, []);

  return (
    <OfficeContext.Provider
      value={{ officeData, setOfficeData, refreshOffices, officesLoading, officesError }}
    >
      {children}
    </OfficeContext.Provider>
  );
};

// 3. Custom Hook for using context
export const useOfficeContextData = () => {
  const context = useContext(OfficeContext);
  return context || defaultOfficeContext;
};
