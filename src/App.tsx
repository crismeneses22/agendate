import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import PublicBooking from "./pages/PublicBooking";
import ClienteDashboard from "./pages/cliente/Dashboard";
import Agendar from "./pages/cliente/Agendar";
import ProveedorDashboard from "./pages/proveedor/Dashboard";
import ProveedorServicios from "./pages/proveedor/Servicios";
import ProveedorDisponibilidad from "./pages/proveedor/Disponibilidad";
import ProveedorEstadisticas from "./pages/proveedor/Estadisticas";
import AdminDashboard from "./pages/admin/Dashboard";

const queryClient = new QueryClient();

// If already logged in, redirect to dashboard; otherwise show landing page
function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/verificar" element={<VerifyEmail />} />
          <Route path="/b/:providerId" element={<PublicBooking />} />

          <Route path="/cliente" element={<ProtectedRoute role="cliente"><ClienteDashboard /></ProtectedRoute>} />
          <Route path="/cliente/agendar" element={<ProtectedRoute role="cliente"><Agendar /></ProtectedRoute>} />

          <Route path="/proveedor" element={<ProtectedRoute role="proveedor"><ProveedorDashboard /></ProtectedRoute>} />
          <Route path="/proveedor/servicios" element={<ProtectedRoute role="proveedor"><ProveedorServicios /></ProtectedRoute>} />
          <Route path="/proveedor/disponibilidad" element={<ProtectedRoute role="proveedor"><ProveedorDisponibilidad /></ProtectedRoute>} />
          <Route path="/proveedor/estadisticas" element={<ProtectedRoute role="proveedor"><ProveedorEstadisticas /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
