import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RoleProvider, STAFF_ROLES } from './lib/roleContext'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './lib/authContext'
import { PermissionsProvider } from './lib/permissionsContext'
import { SearchProvider } from './lib/searchContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { ProtectedRoute, OnboardingRoute } from './components/ProtectedRoute'
import { PartnerRoute, PartnerOnboardingGate } from './components/PartnerRoute'
import { PartnerLayout } from './components/partner/PartnerLayout'
import { PartnerDashboard } from './pages/partner/PartnerDashboard'
import { PartnerProfilePage } from './pages/partner/PartnerProfilePage'
import { PartnerMissionsPage } from './pages/partner/PartnerMissionsPage'
import { PartnerPlanningPage } from './pages/partner/PartnerPlanningPage'
import { PartnerPaymentsPage } from './pages/partner/PartnerPaymentsPage'
import { Landing } from './pages/Landing'
import { EarlyAccess } from './pages/EarlyAccess'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { MagicLink } from './pages/MagicLink'
import { AuthCallback } from './pages/AuthCallback'
import { ResetPassword } from './pages/ResetPassword'
import { Signup } from './pages/Signup'
import { VerifyEmail } from './pages/VerifyEmail'
import { OwnerOnboarding } from './pages/OwnerOnboarding'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/app/Dashboard'
import { Properties } from './pages/app/Properties'
import { PropertyCreate } from './pages/app/PropertyCreate'
import { PropertyDetail } from './pages/app/PropertyDetail'
import { Reservations } from './pages/app/Reservations'
import { GuestPortal } from './pages/app/GuestPortal'
import { Messages } from './pages/app/Messages'
import { Services } from './pages/app/Services'
import { ServiceRequests } from './pages/app/ServiceRequests'
import { Tasks } from './pages/app/Tasks'
import { OperationsHub } from './pages/app/OperationsHub'
import { DaySheet } from './pages/app/DaySheet'
import { TeamPlanning } from './pages/app/TeamPlanning'
import { Incidents } from './pages/app/Incidents'
import { WorkOrders } from './pages/app/WorkOrders'
import { Inventory } from './pages/app/Inventory'
import { Expenses } from './pages/app/Expenses'
import { CalendarPage } from './pages/app/CalendarPage'
import { ClientRequestsPage } from './pages/app/ClientRequestsPage'
import { Partners } from './pages/app/Partners'
import { ServiceProviders } from './pages/app/ServiceProviders'
import { ConciergePortal } from './pages/app/ConciergePortal'
import { Payments } from './pages/app/Payments'
import { Contracts } from './pages/app/Contracts'
import { ContractGenerate } from './pages/app/ContractGenerate'
import { ContractDetail } from './pages/app/ContractDetail'
import { ContractTemplates } from './pages/app/ContractTemplates'
import { ContractGenerator } from './pages/app/ContractGenerator'
import { InvoiceGenerate } from './pages/app/InvoiceGenerate'
import { InvoiceGenerator } from './pages/app/InvoiceGenerator'
import { Invoices } from './pages/app/Invoices'
import { Reports } from './pages/app/Reports'
import { Apa } from './pages/app/Apa'
import { Settings } from './pages/app/Settings'
import { StayReservesPage } from './pages/app/StayReservesPage'
import { BoutiqueOrdersPage } from './pages/app/BoutiqueOrdersPage'
import { BoutiqueCatalogPage } from './pages/app/BoutiqueCatalogPage'
import { BoutiqueProductFormPage } from './pages/app/BoutiqueProductFormPage'
import { BoutiqueLayout } from './components/boutique/BoutiqueLayout'
import { StayMessagesPage } from './pages/app/StayMessagesPage'
import { SignContract } from './pages/SignContract'
import { ContractSigning } from './pages/ContractSigning'
import { GuestPortalPreviewPage } from './pages/GuestPortalPreviewPage'
import { GuestStayPortalPage } from './pages/GuestStayPortalPage'
import { AuthCallbackRedirect } from './components/AuthCallbackRedirect'
import { SearchResults } from './pages/app/SearchResults'
import { NotificationsPage } from './pages/app/NotificationsPage'
import { NotFound } from './pages/NotFound'
import { GuestLayout } from './pages/mobile/guest/GuestLayout'
import { GuestExplore } from './pages/mobile/guest/GuestExplore'
import { GuestStays } from './pages/mobile/guest/GuestStays'
import { GuestServices } from './pages/mobile/guest/GuestServices'
import { GuestMessages } from './pages/mobile/guest/GuestMessages'
import { GuestProfile } from './pages/mobile/guest/GuestProfile'
import { GuestGuides } from './pages/mobile/guest/GuestGuides'
import { PartnerLayout as MobilePartnerLayout } from './pages/mobile/partner/PartnerLayout'
import { PartnerDashboard as MobilePartnerDashboard } from './pages/mobile/partner/PartnerDashboard'
import { PartnerBookings } from './pages/mobile/partner/PartnerBookings'
import { PartnerEarnings } from './pages/mobile/partner/PartnerEarnings'
import { PartnerServices } from './pages/mobile/partner/PartnerServices'
import { PartnerProfile } from './pages/mobile/partner/PartnerProfile'
import { HmLayout } from './pages/mobile/hm/HmLayout'
import { HmToday } from './pages/mobile/hm/HmToday'
import { HmTasks } from './pages/mobile/hm/HmTasks'
import { HmIncidents } from './pages/mobile/hm/HmIncidents'
import { HmNotifications } from './pages/mobile/hm/HmNotifications'
import { HmProfile } from './pages/mobile/hm/HmProfile'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { Terms } from './pages/Terms'
import { Onboarding } from './pages/app/Onboarding'
import { Guides } from './pages/app/Guides'
import { Budgets } from './pages/app/Budgets'
import { TimeClock } from './pages/app/TimeClock'
import { ProviderRatings } from './pages/app/ProviderRatings'
import { Documents } from './pages/app/Documents'
import { Maintenance } from './pages/app/Maintenance'
import { Inspections } from './pages/app/Inspections'
import { InspectionDetail } from './pages/app/InspectionDetail'
import { Activity } from './pages/app/Activity'
import { CookieConsent } from './components/CookieConsent'
import { InstallPrompt } from './components/InstallPrompt'

export default function App() {
  return (
    <ErrorBoundary>
    <LanguageProvider>
    <AuthProvider>
    <RoleProvider>
    <PermissionsProvider>
    <SearchProvider>
    <ToastProvider>
    <BrowserRouter>
      <AuthCallbackRedirect />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/early-access" element={<EarlyAccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/magic-link" element={<MagicLink />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/sign/:token" element={<SignContract />} />
        <Route path="/sign-legacy/:token" element={<ContractSigning />} />
        <Route path="/guest/preview" element={<GuestPortalPreviewPage />} />
        <Route path="/guest/stay/:token" element={<GuestStayPortalPage />} />
        <Route path="/onboarding" element={<OnboardingRoute><OwnerOnboarding /></OnboardingRoute>} />
        <Route path="/app/onboarding" element={<ProtectedRoute allow={STAFF_ROLES}><Onboarding /></ProtectedRoute>} />

        {/* Marketplace partner portal (desktop) */}
        <Route path="/partner" element={<PartnerRoute><PartnerLayout /></PartnerRoute>}>
          <Route
            path="onboarding"
            element={(
              <PartnerOnboardingGate allowIncomplete>
                <PartnerProfilePage mode="onboarding" />
              </PartnerOnboardingGate>
            )}
          />
          <Route
            index
            element={(
              <PartnerOnboardingGate>
                <PartnerDashboard />
              </PartnerOnboardingGate>
            )}
          />
          <Route
            path="profile"
            element={(
              <PartnerOnboardingGate>
                <PartnerProfilePage />
              </PartnerOnboardingGate>
            )}
          />
          <Route
            path="missions"
            element={(
              <PartnerOnboardingGate>
                <PartnerMissionsPage />
              </PartnerOnboardingGate>
            )}
          />
          <Route
            path="planning"
            element={(
              <PartnerOnboardingGate>
                <PartnerPlanningPage />
              </PartnerOnboardingGate>
            )}
          />
          <Route
            path="payments"
            element={(
              <PartnerOnboardingGate>
                <PartnerPaymentsPage />
              </PartnerOnboardingGate>
            )}
          />
        </Route>

        {/* Protected app pages */}
        <Route path="/app" element={<ProtectedRoute allow={STAFF_ROLES}><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/new" element={<PropertyCreate />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="stay-reserves" element={<StayReservesPage />} />
          <Route path="boutique" element={<BoutiqueLayout />}>
            <Route index element={<BoutiqueOrdersPage />} />
            <Route path="catalog" element={<BoutiqueCatalogPage />} />
            <Route path="products/new" element={<BoutiqueProductFormPage />} />
            <Route path="products/:id/edit" element={<BoutiqueProductFormPage />} />
          </Route>
          <Route path="messages" element={<StayMessagesPage />} />
          <Route path="messages/inbox" element={<Messages />} />
          <Route path="guest-portal" element={<GuestPortal />} />
          <Route path="services" element={<Services />} />
          <Route path="service-requests" element={<ServiceRequests />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="operations" element={<OperationsHub />} />
          <Route path="day-sheet" element={<DaySheet />} />
          <Route path="team-planning" element={<TeamPlanning />} />
          <Route path="time-clock" element={<TimeClock />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="client-requests" element={<ClientRequestsPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="service-providers" element={<ServiceProviders />} />
          <Route path="provider-ratings" element={<ProviderRatings />} />
          <Route path="concierge-portal" element={<ConciergePortal />} />
          <Route path="payments" element={<Payments />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/templates" element={<ContractTemplates />} />
          <Route path="contracts/generate" element={<ContractGenerate />} />
          <Route path="contracts/generate-legacy" element={<ContractGenerator />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/generate" element={<InvoiceGenerate />} />
          <Route path="invoices/generate-legacy" element={<InvoiceGenerator />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="guides" element={<Guides />} />
          <Route path="documents" element={<Documents />} />
          <Route path="apa" element={<Apa />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="inspections/:id" element={<InspectionDetail />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="search" element={<SearchResults />} />
        </Route>

        {/* Guest mobile shell (explore) — token stay portal stays at /guest/stay/:token */}
        <Route path="/guest" element={<ProtectedRoute allow={['guest', 'owner']}><GuestLayout /></ProtectedRoute>}>
          <Route index element={<GuestExplore />} />
          <Route path="stays" element={<GuestStays />} />
          <Route path="services" element={<GuestServices />} />
          <Route path="guides" element={<GuestGuides />} />
          <Route path="messages" element={<GuestMessages />} />
          <Route path="profile" element={<GuestProfile />} />
        </Route>

        {/* Mobile partner shell (marketplace partner remains at /partner) */}
        <Route path="/m/partner" element={<ProtectedRoute allow={['partner', 'owner']}><MobilePartnerLayout /></ProtectedRoute>}>
          <Route index element={<MobilePartnerDashboard />} />
          <Route path="bookings" element={<PartnerBookings />} />
          <Route path="earnings" element={<PartnerEarnings />} />
          <Route path="services" element={<PartnerServices />} />
          <Route path="profile" element={<PartnerProfile />} />
        </Route>

        {/* House Manager mobile */}
        <Route path="/hm" element={<ProtectedRoute><HmLayout /></ProtectedRoute>}>
          <Route index element={<HmToday />} />
          <Route path="tasks" element={<HmTasks />} />
          <Route path="incidents" element={<HmIncidents />} />
          <Route path="notifications" element={<HmNotifications />} />
          <Route path="profile" element={<HmProfile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <CookieConsent />
    <InstallPrompt />
    </ToastProvider>
    </SearchProvider>
    </PermissionsProvider>
    </RoleProvider>
    </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  )
}
