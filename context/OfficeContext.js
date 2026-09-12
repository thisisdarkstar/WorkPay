// useContext
import { createContext, useContext, useState } from 'react';
const defaultOfficeContext = {
  officeData: [],
  setOfficeData: () => {},
};

// 1. Create Context
const OfficeContext = createContext(defaultOfficeContext);

// 2. Create Provider Component
export const OfficeProvider = ({ children }) => {
  const [officeData, setOfficeData] = useState([]);

  return (
    <OfficeContext.Provider value={{ officeData, setOfficeData }}>
      {children}
    </OfficeContext.Provider>
  );
};

// 3. Custom Hook for using context
export const useOfficeContextData = () => {
  const context = useContext(OfficeContext);
  return context || defaultOfficeContext;
};

