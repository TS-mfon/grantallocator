import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";
import LandingPage from "./pages/LandingPage";
import ProposalsPage from "./pages/ProposalsPage";
import ProposalDetailPage from "./pages/ProposalDetailPage";
import SubmitPage from "./pages/SubmitPage";
import VotePage from "./pages/VotePage";
import TreasuryPage from "./pages/TreasuryPage";
import AdminPage from "./pages/AdminPage";
import MyProposalsPage from "./pages/MyProposalsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/proposals" element={<ProposalsPage />} />
            <Route path="/proposals/:id" element={<ProposalDetailPage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/treasury" element={<TreasuryPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/my-proposals" element={<MyProposalsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WalletProvider>
  </QueryClientProvider>
);

export default App;
