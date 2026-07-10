import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, datasetService, api } from '../services/api';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';

const AuthContext = createContext();

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Fetches the most recent dataset for a user and returns it fully normalized
 * by calling getOverview so every consumer gets the complete edaResults shape.
 */
const loadMostRecentDataset = async () => {
  const datasets = await datasetService.getDatasets();
  if (!datasets || datasets.length === 0) return null;

  // datasets are sorted newest-first by the backend
  const first = datasets[0];
  const datasetId = first._id || first.id;

  try {
    // getOverview normalizes the raw DB document into the full shape expected by
    // Dashboard, Visualizations, Analytics and AIReport
    const normalized = await datasetService.getOverview(datasetId);
    // Carry raw edaResults through so all sub-pages always find it
    normalized.edaResults = normalized.edaResults || first.edaResults || {};
    return normalized;
  } catch {
    // getOverview failed; return the raw record so we at least have something
    return {
      id: datasetId,
      _id: datasetId,
      ...first,
    };
  }
};

// ─── provider ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const { isLoaded: isAuthLoaded, userId, getToken, signOut } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useClerkUser();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDataset, setActiveDatasetState] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // Bind the token getter to Axios
  if (isAuthLoaded) {
    api.getClerkToken = getToken;
  }

  // Handle Clerk auth status updates
  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) return;

    if (userId && clerkUser) {
      const activeUser = {
        _id: userId,
        uid: userId,
        name: clerkUser.fullName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
      };
      setUser(activeUser);

      // Load active workspace
      const saved = sessionStorage.getItem('activeDataset');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const datasetId = parsed._id || parsed.id;
          if (datasetId) {
            setActiveDatasetState(parsed);
            // Refresh in background
            datasetService.getOverview(datasetId)
              .then(fresh => {
                fresh.edaResults = fresh.edaResults || parsed.edaResults || {};
                setActiveDatasetState(fresh);
                sessionStorage.setItem('activeDataset', JSON.stringify(fresh));
              })
              .catch((err) => {
                console.warn('[AuthContext] Background refresh failed, clearing if 404:', err.message);
                if (err.response && err.response.status === 404) {
                  setActiveDataset(null);
                }
              });
          }
        } catch {
          sessionStorage.removeItem('activeDataset');
        }
      } else {
        loadMostRecentDataset().then(dataset => {
          if (dataset) {
            setActiveDatasetState(dataset);
            sessionStorage.setItem('activeDataset', JSON.stringify(dataset));
          }
        }).catch(() => {});
      }
    } else {
      setUser(null);
      setActiveDatasetState(null);
      sessionStorage.removeItem('activeDataset');
    }
    setLoading(false);
  }, [isAuthLoaded, isUserLoaded, userId, clerkUser]);

  // Login action (bridged to Clerk UI components)
  const login = async (email, password) => {
    console.warn('[AuthContext] login() called programmatically. Clerk authentication should be handled via the Clerk UI components.');
  };

  // Register action (bridged to Clerk UI components)
  const register = async (name, email, password) => {
    console.warn('[AuthContext] register() called programmatically. Clerk registration should be handled via the Clerk UI components.');
  };

  // Logout action
  const logout = async () => {
    await signOut();
    setUser(null);
    setActiveDatasetState(null);
    sessionStorage.removeItem('activeDataset');
    sessionStorage.removeItem('lastSelectedChartType');
  };

  // Set active dataset
  const setActiveDataset = (dataset) => {
    setActiveDatasetState(dataset);
    if (dataset) {
      sessionStorage.setItem('activeDataset', JSON.stringify(dataset));
    } else {
      sessionStorage.removeItem('activeDataset');
    }
  };

  // Refresh active dataset
  const refreshActiveDataset = async () => {
    const datasetId = activeDataset?._id || activeDataset?.id;
    if (!datasetId) return;
    try {
      const updatedDataset = await datasetService.getOverview(datasetId);
      updatedDataset.edaResults = updatedDataset.edaResults || activeDataset?.edaResults || {};
      setActiveDatasetState(updatedDataset);
      sessionStorage.setItem('activeDataset', JSON.stringify(updatedDataset));
    } catch (err) {
      console.error('[AuthContext] Error refreshing active dataset:', err);
      if (err.response && err.response.status === 404) {
        setActiveDataset(null);
      }
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
        sidebarCollapsed,
        toggleSidebar,
        theme,
        toggleTheme,
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
