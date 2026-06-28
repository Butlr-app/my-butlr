import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RoleProvider } from './lib/roleContext'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './lib/authContext'
import { SearchProvider } from './lib/searchContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { EarlyAccess } from './pages/EarlyAccess'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/app/Dashboard'
import { Properties } from './pages/app/Properties'
import { PropertyDetail } from './pages/app/PropertyDetail'
import { Reservations } from './pages/app/Reservations'
import { GuestPortal } from './pages/app/GuestPortal'
import { Messages } from './pages/app/Messages'
import { Services } from './pages/app/Services'
import { ServiceRequests } from './pages/app/ServiceRequests'
import { Tasks } from './pages/app/Tasks'
import { CalendarPage } from './pages/app/CalendarPage'
import { Partners } from './pages/app/Partners'
import { Payments } from './pages/app/Payments'
import { Contracts } from './pages/app/Contracts'
import { Reports } from './pages/app/Reports'
import { Settings } from './pages/app/Settings'
import { SearchResults } from './pages/app/SearchResults'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { ContractGenerator } from './pages/app/ContractGenerator'
import { InvoiceGenerator } from './pages/app/InvoiceGenerator'
import { Invoices } from './pages/app/Invoices'
import { NotificationsPage } from './pages/app/NotificationsPage'
import { ContractSigning } from './pages/ContractSigning'
import { NotFound } from './pages/NotFound'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { Terms } from './pages/Terms'
import { Onboarding } from './pages/app/Onboarding'
import { CookieConsent } from './components/CookieConsent'

export default function App() {
  return (
    <ErrorBoundary>
    <LanguageProvider>
    <AuthProvider>
    <RoleProvider>
    <SearchProvider>
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/early-access" element={<EarlyAccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Onboarding wizard */}
        <Route path="/app/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Public signing page */}
        <Route path="/sign/:token" element={<ContractSigning />} />

        {/* Protected app pages */}
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="guest-portal" element={<GuestPortal />} />
          <Route path="messages" element={<Messages />} />
          <Route path="services" element={<Services />} />
          <Route path="service-requests" element={<ServiceRequests />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="payments" element={<Payments />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/generate" element={<ContractGenerator />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/generate" element={<InvoiceGenerator />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="search" element={<SearchResults />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <CookieConsent />
    </ToastProvider>
    </SearchProvider>
    </RoleProvider>
    </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  )
}
