import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { CustomerBookingsPage } from './pages/CustomerBookingsPage';
import { WaitlistClaimPage } from './pages/WaitlistClaimPage';
import { OrganiserDashboard } from './pages/OrganiserDashboard';
import { AdminVenuePage } from './pages/AdminVenuePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/booking/success/:reference" element={<BookingSuccessPage />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <CustomerBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/waitlist/claim/:token" element={<WaitlistClaimPage />} />
          <Route
            path="/organiser"
            element={
              <ProtectedRoute allowedRoles={['ORGANISER', 'ADMIN']}>
                <OrganiserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/venues"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminVenuePage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500 glass-panel mt-auto">
        <p className="font-semibold text-slate-400">
          TicketVault Platform • High-Concurrency Ticket Booking & Waitlist Engine
        </p>
        <p className="mt-1">
          Atomic CAS Concurrency • TTL Auto-Release • QR Pass Verification • Zero Seat Loss
        </p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
