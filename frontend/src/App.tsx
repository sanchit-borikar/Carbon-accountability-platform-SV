import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import OverviewPage from "./pages/dashboard/OverviewPage";
import LiveMapPage from "./pages/dashboard/LiveMapPage";
import ProfilesPage from "./pages/dashboard/ProfilesPage";
import ComplianceDetailPage from "./pages/dashboard/ComplianceDetailPage";
import DataVerificationPage from "./pages/dashboard/DataVerificationPage";
import RankingsPage from "./pages/dashboard/RankingsPage";
import AlertsPage from "./pages/dashboard/AlertsPage";
import MyCompanyPage from "./pages/dashboard/MyCompanyPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import { type ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/verify" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<OverviewPage />} />
        <Route path="map" element={<LiveMapPage />} />
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="profiles/:id" element={<ComplianceDetailPage />} />
        <Route path="data" element={<DataVerificationPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="company" element={<MyCompanyPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
