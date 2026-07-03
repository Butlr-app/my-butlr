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
import { DaySheet } from './pages/app/DaySheet'
import { Incidents } from './pages/app/Incidents'
import { CalendarPage } from './pages/app/CalendarPage'
import { Partners } from './pages/app/Partners'
import { ServiceProviders } from './pages/app/ServiceProviders'
import { ConciergePortal } from './pages/app/ConciergePortal'
import { Payments } from './pages/app/Payments'
import { Contracts } from './pages/app/Contracts'
import { Reports } from './pages/app/Reports'
import { Apa } from './pages/app/Apa'
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
import { GuestLayout } from './pages/mobile/guest/GuestLayout'
import { GuestExplore } from './pages/mobile/guest/GuestExplore'
import { GuestStays } from './pages/mobile/guest/GuestStays'
import { GuestServices } from './pages/mobile/guest/GuestServices'
import { GuestMessages } from './pages/mobile/guest/GuestMessages'
import { GuestProfile } from './pages/mobile/guest/GuestProfile'
import { GuestGuides } from './pages/mobile/guest/GuestGuides'
import { PartnerLayout } from './pages/mobile/partner/PartnerLayout'
import { PartnerDashboard } from './pages/mobile/partner/PartnerDashboard'
import { PartnerBookings } from './pages/mobile/partner/PartnerBookings'
import { PartnerEarnings } from './pages/mobile/partner/PartnerEarnings'
import { PartnerServices } from './pages/mobile/partner/PartnerServices'
import { PartnerProfile } from './pages/mobile/partner/PartnerProfile'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { Terms } from './pages/Terms'
import { Onboarding } from './pages/app/Onboarding'
import { Guides } from './pages/app/Guides'
import { Inspections } from './pages/app/Inspections'
import { InspectionDetail } from './pages/app/InspectionDetail'
import { CookieConsent } from './components/CookieConsent'
import { InstallPrompt } from './components/InstallPrompt'

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
          <Route path="day-sheet" element={<DaySheet />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="service-providers" element={<ServiceProviders />} />
          <Route path="concierge-portal" element={<ConciergePortal />} />
          <Route path="payments" element={<Payments />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/generate" element={<ContractGenerator />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/generate" element={<InvoiceGenerator />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="guides" element={<Guides />} />
          <Route path="apa" element={<Apa />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="inspections/:id" element={<InspectionDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="search" element={<SearchResults />} />
        </Route>

        {/* Guest Mobile App (Airbnb-style) */}
        <Route path="/guest" element={<ProtectedRoute><GuestLayout /></ProtectedRoute>}>
          <Route index element={<GuestExplore />} />
          <Route path="stays" element={<GuestStays />} />
          <Route path="services" element={<GuestServices />} />
          <Route path="guides" element={<GuestGuides />} />
          <Route path="messages" element={<GuestMessages />} />
          <Route path="profile" element={<GuestProfile />} />
        </Route>

        {/* Partner Mobile App (Airbnb-style) */}
        <Route path="/partner" element={<ProtectedRoute><PartnerLayout /></ProtectedRoute>}>
          <Route index element={<PartnerDashboard />} />
          <Route path="bookings" element={<PartnerBookings />} />
          <Route path="earnings" element={<PartnerEarnings />} />
          <Route path="services" element={<PartnerServices />} />
          <Route path="profile" element={<PartnerProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <CookieConsent />
    <InstallPrompt />
    </ToastProvider>
    </SearchProvider>
    </RoleProvider>
    </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  )
}
