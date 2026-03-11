import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ClientProvider } from "@/context/ClientContext";
import { WalkInBathProvider } from "@/context/WalkInBathContext";
import { Header } from "@/components/Header";
import { BottomNavbar } from "@/components/BottomNavbar";
import Index from "./pages/Index";
import ClientsPage from "./pages/ClientsPage";
import SpreadsheetPage from "./pages/SpreadsheetPage";
import BanhoPetPage from "./pages/BanhoPetPage";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <ClientProvider>
        <WalkInBathProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-center" />
            <BrowserRouter>
              <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 pb-16 lg:pb-6">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/spreadsheet" element={<SpreadsheetPage />} />
                    <Route path="/banho" element={<BanhoPetPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/qrcode" element={<QrCodePage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <BottomNavbar />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </WalkInBathProvider>
      </ClientProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
