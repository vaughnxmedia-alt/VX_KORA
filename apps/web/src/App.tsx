import { Outlet, useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { AuthProvider } from './components/AuthProvider';
import { Footer } from './components/Footer';
import { SubscriberPopup } from './components/SubscriberPopup';
import { useEffect, useRef } from 'react';

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <AuthProvider>
      <div className="flex flex-col h-screen bg-background">
        {!isDashboard && (
          <header className="flex-shrink-0">
            <Navigation />
          </header>
        )}
        <main 
          ref={mainRef}
          className="flex-grow h-full min-h-0 overflow-y-auto"
        >
          <Outlet />
          {!isDashboard && <Footer />}
        </main>
        {!isDashboard && <SubscriberPopup />}
      </div>
    </AuthProvider>
  );
}

export default App;
