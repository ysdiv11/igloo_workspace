import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'

// Root component that handles auth state
const RootApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-bg-orb orb-1" />
        <div className="login-bg-orb orb-2" />
        <div className="login-logo" style={{ animation: 'pulse 1.5s infinite' }}>
          <span className="logo-icon">❄️</span>
        </div>
      </div>
    );
  }

  return user ? <App /> : <LoginPage />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  </StrictMode>,
)
