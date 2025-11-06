import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth } from 'miaoda-auth-react';
import { Toaster } from 'sonner';
import { supabase } from '@/db/supabase';
import { ProfileProvider } from '@/contexts/ProfileContext';
import Header from '@/components/common/Header';
import routes from './routes';

const App = () => {
  return (
    <Router>
      <AuthProvider client={supabase}>
        <ProfileProvider>
          <Toaster position="top-center" richColors />
          <RequireAuth whiteList={["/login", "/404", "/"]}>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                <Routes>
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                </Routes>
              </main>
            </div>
          </RequireAuth>
        </ProfileProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
