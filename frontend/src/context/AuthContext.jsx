import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, datasetService } from '../services/api';

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDataset, setActiveDatasetState] = useState(null);

  // On mount: rehydrate JWT session and restore workspace
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await authService.getCurrentUser();
        const activeUser = {
          ...userData,
          uid: userData._id || userData.id,
          _id: userData._id || userData.id,
        };
        setUser(activeUser);

        // Try sessionStorage first (same tab / page refresh)
        const saved = sessionStorage.getItem('activeDataset');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const datasetId = parsed._id || parsed.id;
            if (datasetId) {
              setActiveDatasetState(parsed); // show immediately without waiting
              // Re-validate in background to keep data fresh
              datasetService.getOverview(datasetId)
                .then(fresh => {
                  fresh.edaResults = fresh.edaResults || parsed.edaResults || {};
                  setActiveDatasetState(fresh);
                  sessionStorage.setItem('activeDataset', JSON.stringify(fresh));
                })
                .catch(() => {}); // keep cached version if refresh fails
            } else {
              throw new Error('Invalid cached dataset ID');
            }
          } catch {
            sessionStorage.removeItem('activeDataset');
          }
        } else {
          // Fresh login in a new tab/window — load from DB
          try {
            const dataset = await loadMostRecentDataset();
            if (dataset) {
              setActiveDatasetState(dataset);
              sessionStorage.setItem('activeDataset', JSON.stringify(dataset));
            }
          } catch (err) {
            console.warn('[AuthContext] Could not auto-load dataset on session restore:', err.message);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Session validation failed:', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('activeDataset');
        setUser(null);
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const responseData = await authService.login(email, password);

    const activeUser = {
      _id: responseData._id,
      name: responseData.name,
      email: responseData.email,
      uid: responseData._id,
    };
    localStorage.setItem('token', responseData.token);
    setUser(activeUser);

    // Restore previous workspace: load and fully normalize the most recent dataset
    let mostRecent = null;
    try {
      mostRecent = await loadMostRecentDataset();
      if (mostRecent) {
        setActiveDatasetState(mostRecent);
        sessionStorage.setItem('activeDataset', JSON.stringify(mostRecent));
      }
    } catch (err) {
      console.warn('[AuthContext] Could not restore workspace on login:', err.message);
    }

    return { user: activeUser, activeDataset: mostRecent };
  };

  // ── register ───────────────────────────────────────────────────────────────
  const register = async (name, email, password) => {
    const responseData = await authService.register(name, email, password);
    const activeUser = {
      _id: responseData._id,
      name: responseData.name,
      email: responseData.email,
      uid: responseData._id,
    };
    localStorage.setItem('token', responseData.token);
    setUser(activeUser);
    return activeUser;
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    authService.logout();
    setUser(null);
    setActiveDatasetState(null);
    sessionStorage.removeItem('activeDataset');
    sessionStorage.removeItem('lastSelectedChartType');
  };

  // ── setActiveDataset ───────────────────────────────────────────────────────
  const setActiveDataset = (dataset) => {
    setActiveDatasetState(dataset);
    if (dataset) {
      sessionStorage.setItem('activeDataset', JSON.stringify(dataset));
    } else {
      sessionStorage.removeItem('activeDataset');
    }
  };

  // ── refreshActiveDataset ───────────────────────────────────────────────────
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
