import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { EntryRedirect, PublicOnly, RequireAuth, RequireRole } from "./components/RouteGuards";
import Businesses from "./pages/Businesses";
import BusinessWorkers from "./pages/BusinessWorkers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPortal from "./pages/AdminPortal";
import OwnerPortal from "./pages/OwnerPortal";
import WorkerPortal from "./pages/WorkerPortal";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<EntryRedirect />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminPortal />
              </RequireRole>
            }
          />
          <Route
            path="/owner"
            element={
              <RequireRole role="owner">
                <OwnerPortal />
              </RequireRole>
            }
          />
          <Route
            path="/worker"
            element={
              <RequireRole role="worker">
                <WorkerPortal />
              </RequireRole>
            }
          />
          <Route
            path="/businesses"
            element={
              <RequireAuth>
                <Businesses />
              </RequireAuth>
            }
          />
          <Route
            path="/businesses/:id"
            element={
              <RequireAuth>
                <BusinessWorkers />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
