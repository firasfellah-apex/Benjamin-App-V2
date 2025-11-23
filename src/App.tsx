import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RoleBasedRedirect } from '@/components/auth/RoleBasedRedirect';
import { ViewportIndicator } from '@/components/dev/ViewportIndicator';
import { useViewport } from '@/hooks/useViewport';
import routes from './routes';

// Debug page to prove renderer works
function DebugPage() {
  return (
    <div style={{ padding: 24, fontSize: 18 }}>✅ Router works. This is /debug</div>
  );
}

const App = () => {
  // Initialize viewport management - this is inside Router context
  useViewport();

  return (
    <>
      <RequireAuth whitelist={["/login", "/404", "/debug", "/debug/map", "/onboarding/profile"]}>
        <Routes>
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/" element={<RoleBasedRedirect />} />
          {routes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={route.element}
            />
          ))}
        </Routes>
      </RequireAuth>
      <ViewportIndicator />
    </>
  );
};

export default App;
