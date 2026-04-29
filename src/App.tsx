import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { ThemeProvider } from "next-themes";
import { ClientProvider } from "@/context/ClientContext";
import { Header } from "@/components/Header";
import { BottomNavbar } from "@/components/BottomNavbar";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import TaskNotifications from "./components/TaskNotifications";
import { Loader2 } from "lucide-react";
// AIAssistant temporariamente desativado
// import { AIAssistant } from "@/components/dashboard/AIAssistant";

const Index = lazy(() => import("./pages/Index"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const SpreadsheetPage = lazy(() => import("./pages/SpreadsheetPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ReelsPage = lazy(() => import("./pages/ReelsPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
    <img src="/app-icon.png" alt="Cantinho do AuAu" className="w-20 h-20 rounded-2xl shadow-lg" />
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const RouteLoader = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const AppContent = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!session) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <ClientProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-6">
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/spreadsheet" element={<SpreadsheetPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reels" element={<ReelsPage />} />
              <Route path="/contracts" element={<ContractsRoute />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <TaskNotifications />
        </main>
        <BottomNavbar />
        <PWAInstallPrompt />
        {/* <AIAssistant /> desativado */}
      </div>
    </ClientProvider>
  );
};

const ContractsRoute = () => {
  const { canManageContracts, loading } = useUserRole();
  if (loading) return <RouteLoader />;
  if (!canManageContracts) return <Navigate to="/" replace />;
  return <ContractsPage />;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
