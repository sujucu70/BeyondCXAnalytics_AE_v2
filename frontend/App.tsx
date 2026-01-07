// App.tsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import SinglePageDataRequestIntegrated from './components/SinglePageDataRequestIntegrated';
import { AuthProvider, useAuth } from './utils/AuthContext';
import LoginPage from './components/LoginPage';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? (
        <SinglePageDataRequestIntegrated />
      ) : (
        <LoginPage />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppContent />
    </AuthProvider>
  );
};

export default App;

