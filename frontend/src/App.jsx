import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Businesses from "./pages/Businesses";
import BusinessWorkers from "./pages/BusinessWorkers";
import OwnerDashboard from "./pages/OwnerDashboard";

function ProtectedOwner({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "owner" && user.role !== "admin") return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Businesses />} />
          <Route path="/business/:id" element={<BusinessWorkers />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/owner"
            element={
              <ProtectedOwner>
                <OwnerDashboard />
              </ProtectedOwner>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
