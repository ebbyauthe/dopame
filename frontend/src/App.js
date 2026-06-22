import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import Fitness from "./pages/Fitness";
import Nutrition from "./pages/Nutrition";
import Communication from "./pages/Communication";
import Habits from "./pages/Habits";
import Goals from "./pages/Goals";
import Journal from "./pages/Journal";
import Coach from "./pages/Coach";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
  </div>
);

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (user === undefined) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/app" element={<Protected><AppShell /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="finance" element={<Finance />} />
              <Route path="fitness" element={<Fitness />} />
              <Route path="nutrition" element={<Nutrition />} />
              <Route path="communication" element={<Communication />} />
              <Route path="habits" element={<Habits />} />
              <Route path="goals" element={<Goals />} />
              <Route path="journal" element={<Journal />} />
              <Route path="coach" element={<Coach />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
