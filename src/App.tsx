import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ClientProvider } from "@/context/ClientContext";
import { Header } from "@/components/Header";
import { BottomNavbar } from "@/components/BottomNavbar";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import ClientsPage from "./pages/ClientsPage";
import SpreadsheetPage from "./pages/SpreadsheetPage";
import ReportsPage from "./pages/ReportsPage";
import AccountPage from "./pages/AccountPage";
import ReelsPage from "./pages/ReelsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import TaskNotifications from "./components/TaskNotifications";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <img src="/app-icon.png" alt="Cantinho do AuAu" className="w-20 h-20 rounded-2xl shadow-lg" />
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <ClientProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-6">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/spreadsheet" element={<SpreadsheetPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <BottomNavbar />
        <PWAInstallPrompt />
      </div>
    </ClientProvider>
  );
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
