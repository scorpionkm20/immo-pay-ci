import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Properties from "./pages/Properties";
import CreateProperty from "./pages/CreateProperty";
import PropertyDetail from "./pages/PropertyDetail";
import EditProperty from "./pages/EditProperty";
import MyProperties from "./pages/MyProperties";
import MyLeases from "./pages/MyLeases";
import Payments from "./pages/Payments";
import PaymentHistory from "./pages/PaymentHistory";
import PendingPayments from "./pages/PendingPayments";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Documents from "./pages/Documents";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";
import NotificationSettings from "./pages/NotificationSettings";
import SearchAlerts from "./pages/SearchAlerts";
import Favorites from "./pages/Favorites";
import FavoritesCompare from "./pages/FavoritesCompare";
import ManageSpace from "./pages/ManageSpace";
import AcceptInvitation from "./pages/AcceptInvitation";
import Finance from "./pages/Finance";
import AdminPanel from "./pages/AdminPanel";
import BedroomDesigner from "./pages/BedroomDesigner";
import RentalRequests from "./pages/RentalRequests";
import ManagerDashboard from "./pages/ManagerDashboard";
import QuickRentalRequests from "./pages/QuickRentalRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/create" element={<CreateProperty />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/properties/:id/edit" element={<EditProperty />} />
          <Route path="/my-properties" element={<MyProperties />} />
          <Route path="/my-leases" element={<MyLeases />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/payment-history" element={<PaymentHistory />} />
          <Route path="/pending-payments" element={<PendingPayments />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/search-alerts" element={<SearchAlerts />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/favorites/compare" element={<FavoritesCompare />} />
            <Route path="/manage-space" element={<ManageSpace />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/bedroom-designer" element={<BedroomDesigner />} />
            <Route path="/rental-requests" element={<RentalRequests />} />
            <Route path="/manager-dashboard" element={<ManagerDashboard />} />
            <Route path="/quick-requests" element={<QuickRentalRequests />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
