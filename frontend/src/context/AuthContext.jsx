import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, datasetService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDataset, setActiveDatasetState] = useState(null);

  // Sync session with Local JWT Authentication
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          const activeUser = {
            ...userData,
            uid: userData._id || userData.id
          };
          setUser(activeUser);
          console.log('[AuthContext] JWT session synced user:', activeUser);

          // Rehydrate active dataset workspace if cached in session storage
          const savedActiveDataset = sessionStorage.getItem('activeDataset');
          if (savedActiveDataset) {
            try {
              setActiveDatasetState(JSON.parse(savedActiveDataset));
            } catch (e) {
              console.error('Failed to parse active dataset from session:', e);
            }
          } else {
            try {
              const datasets = await datasetService.getDatasets();
              if (datasets && datasets.length > 0) {
                const mostRecent = {
                  id: datasets[0]._id || datasets[0].id,
                  _id: datasets[0]._id || datasets[0].id,
                  ...datasets[0]
                };
                setActiveDatasetState(mostRecent);
                sessionStorage.setItem('activeDataset', JSON.stringify(mostRecent));
              }
            } catch (err) {
              console.warn('Auto-loading most recent dataset failed:', err.message);
            }
          }
        } catch (error) {
          console.error('Session validation failed:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    const responseData = await authService.login(email, password);
    const activeUser = {
      _id: responseData._id,
      name: responseData.name,
      email: responseData.email,
      uid: responseData._id
    };
    localStorage.setItem('token', responseData.token);
    setUser(activeUser);
    
    // Auto-load most recent dataset on login
    try {
      const datasets = await datasetService.getDatasets();
      if (datasets && datasets.length > 0) {
        const mostRecent = {
          id: datasets[0]._id || datasets[0].id,
          _id: datasets[0]._id || datasets[0].id,
          ...datasets[0]
        };
        setActiveDatasetState(mostRecent);
        sessionStorage.setItem('activeDataset', JSON.stringify(mostRecent));
      }
    } catch (err) {
      console.warn('Auto-loading most recent dataset on login failed:', err.message);
    }
    
    return activeUser;
  };

  const register = async (name, email, password) => {
    const responseData = await authService.register(name, email, password);
    const activeUser = {
      _id: responseData._id,
      name: responseData.name,
      email: responseData.email,
      uid: responseData._id
    };
    localStorage.setItem('token', responseData.token);
    setUser(activeUser);
    return activeUser;
  };

  const logout = async () => {
    authService.logout();
    setUser(null);
    setActiveDatasetState(null);
    sessionStorage.removeItem('activeDataset');
  };

  const setActiveDataset = (dataset) => {
    setActiveDatasetState(dataset);
    if (dataset) {
      sessionStorage.setItem('activeDataset', JSON.stringify(dataset));
    } else {
      sessionStorage.removeItem('activeDataset');
    }
  };

  const refreshActiveDataset = async () => {
    if (!activeDataset?._id && !activeDataset?.id) return;
    try {
      const datasetId = activeDataset._id || activeDataset.id;
      const updatedDataset = await datasetService.getOverview(datasetId);
      setActiveDatasetState(updatedDataset);
      sessionStorage.setItem('activeDataset', JSON.stringify(updatedDataset));
    } catch (err) {
      console.error('Error refreshing active dataset:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeDataset,
        login,
        register,
        logout,
        setActiveDataset,
        refreshActiveDataset,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
