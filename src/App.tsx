import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RoleProvider } from './lib/roleContext'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './lib/authContext'
import { SearchProvider } from './lib/searchContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { STAFF_ROLES } from './lib/roleContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'
import { InstallPrompt } from './components/InstallPrompt'

// Route components are code-split so each page loads on demand, keeping the
// initial bundle small.
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })))
const EarlyAccess = lazy(() => import('./pages/EarlyAccess').then(m => ({ default: m.EarlyAccess })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })))
const AppLayout = lazy(() => import('./components/layout/AppLayout').then(m => ({ default: m.AppLayout })))
const Dashboard = lazy(() => import('./pages/app/Dashboard').then(m => ({ default: m.Dashboard })))
const Properties = lazy(() => import('./pages/app/Properties').then(m => ({ default: m.Properties })))
const PropertyDetail = lazy(() => import('./pages/app/PropertyDetail').then(m => ({ default: m.PropertyDetail })))
const Reservations = lazy(() => import('./pages/app/Reservations').then(m => ({ default: m.Reservations })))
const GuestPortal = lazy(() => import('./pages/app/GuestPortal').then(m => ({ default: m.GuestPortal })))
const Messages = lazy(() => import('./pages/app/Messages').then(m => ({ default: m.Messages })))
const Services = lazy(() => import('./pages/app/Services').then(m => ({ default: m.Services })))
const ServiceRequests = lazy(() => import('./pages/app/ServiceRequests').then(m => ({ default: m.ServiceRequests })))
const Tasks = lazy(() => import('./pages/app/Tasks').then(m => ({ default: m.Tasks })))
const DaySheet = lazy(() => import('./pages/app/DaySheet').then(m => ({ default: m.DaySheet })))
const TeamPlanning = lazy(() => import('./pages/app/TeamPlanning').then(m => ({ default: m.TeamPlanning })))
const Incidents = lazy(() => import('./pages/app/Incidents').then(m => ({ default: m.Incidents })))
const WorkOrders = lazy(() => import('./pages/app/WorkOrders').then(m => ({ default: m.WorkOrders })))
const Inventory = lazy(() => import('./pages/app/Inventory').then(m => ({ default: m.Inventory })))
const Expenses = lazy(() => import('./pages/app/Expenses').then(m => ({ default: m.Expenses })))
const CalendarPage = lazy(() => import('./pages/app/CalendarPage').then(m => ({ default: m.CalendarPage })))
const Partners = lazy(() => import('./pages/app/Partners').then(m => ({ default: m.Partners })))
const ServiceProviders = lazy(() => import('./pages/app/ServiceProviders').then(m => ({ default: m.ServiceProviders })))
const ConciergePortal = lazy(() => import('./pages/app/ConciergePortal').then(m => ({ default: m.ConciergePortal })))
const Payments = lazy(() => import('./pages/app/Payments').then(m => ({ default: m.Payments })))
const Contracts = lazy(() => import('./pages/app/Contracts').then(m => ({ default: m.Contracts })))
const Reports = lazy(() => import('./pages/app/Reports').then(m => ({ default: m.Reports })))
const Apa = lazy(() => import('./pages/app/Apa').then(m => ({ default: m.Apa })))
const Settings = lazy(() => import('./pages/app/Settings').then(m => ({ default: m.Settings })))
const SearchResults = lazy(() => import('./pages/app/SearchResults').then(m => ({ default: m.SearchResults })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })))
const ContractGenerator = lazy(() => import('./pages/app/ContractGenerator').then(m => ({ default: m.ContractGenerator })))
const InvoiceGenerator = lazy(() => import('./pages/app/InvoiceGenerator').then(m => ({ default: m.InvoiceGenerator })))
const Invoices = lazy(() => import('./pages/app/Invoices').then(m => ({ default: m.Invoices })))
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const ContractSigning = lazy(() => import('./pages/ContractSigning').then(m => ({ default: m.ContractSigning })))
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })))
const GuestLayout = lazy(() => import('./pages/mobile/guest/GuestLayout').then(m => ({ default: m.GuestLayout })))
const GuestExplore = lazy(() => import('./pages/mobile/guest/GuestExplore').then(m => ({ default: m.GuestExplore })))
const GuestStays = lazy(() => import('./pages/mobile/guest/GuestStays').then(m => ({ default: m.GuestStays })))
const GuestServices = lazy(() => import('./pages/mobile/guest/GuestServices').then(m => ({ default: m.GuestServices })))
const GuestMessages = lazy(() => import('./pages/mobile/guest/GuestMessages').then(m => ({ default: m.GuestMessages })))
const GuestProfile = lazy(() => import('./pages/mobile/guest/GuestProfile').then(m => ({ default: m.GuestProfile })))
const GuestGuides = lazy(() => import('./pages/mobile/guest/GuestGuides').then(m => ({ default: m.GuestGuides })))
const PartnerLayout = lazy(() => import('./pages/mobile/partner/PartnerLayout').then(m => ({ default: m.PartnerLayout })))
const PartnerDashboard = lazy(() => import('./pages/mobile/partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })))
const PartnerBookings = lazy(() => import('./pages/mobile/partner/PartnerBookings').then(m => ({ default: m.PartnerBookings })))
const PartnerEarnings = lazy(() => import('./pages/mobile/partner/PartnerEarnings').then(m => ({ default: m.PartnerEarnings })))
const PartnerServices = lazy(() => import('./pages/mobile/partner/PartnerServices').then(m => ({ default: m.PartnerServices })))
const PartnerProfile = lazy(() => import('./pages/mobile/partner/PartnerProfile').then(m => ({ default: m.PartnerProfile })))
const HmLayout = lazy(() => import('./pages/mobile/hm/HmLayout').then(m => ({ default: m.HmLayout })))
const HmToday = lazy(() => import('./pages/mobile/hm/HmToday').then(m => ({ default: m.HmToday })))
const HmTasks = lazy(() => import('./pages/mobile/hm/HmTasks').then(m => ({ default: m.HmTasks })))
const HmIncidents = lazy(() => import('./pages/mobile/hm/HmIncidents').then(m => ({ default: m.HmIncidents })))
const HmNotifications = lazy(() => import('./pages/mobile/hm/HmNotifications').then(m => ({ default: m.HmNotifications })))
const HmProfile = lazy(() => import('./pages/mobile/hm/HmProfile').then(m => ({ default: m.HmProfile })))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })))
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })))
const Onboarding = lazy(() => import('./pages/app/Onboarding').then(m => ({ default: m.Onboarding })))
const Guides = lazy(() => import('./pages/app/Guides').then(m => ({ default: m.Guides })))
const Budgets = lazy(() => import('./pages/app/Budgets').then(m => ({ default: m.Budgets })))
const TimeClock = lazy(() => import('./pages/app/TimeClock').then(m => ({ default: m.TimeClock })))
const ProviderRatings = lazy(() => import('./pages/app/ProviderRatings').then(m => ({ default: m.ProviderRatings })))
const Documents = lazy(() => import('./pages/app/Documents').then(m => ({ default: m.Documents })))
const Maintenance = lazy(() => import('./pages/app/Maintenance').then(m => ({ default: m.Maintenance })))
const Inspections = lazy(() => import('./pages/app/Inspections').then(m => ({ default: m.Inspections })))
const InspectionDetail = lazy(() => import('./pages/app/InspectionDetail').then(m => ({ default: m.InspectionDetail })))
const Activity = lazy(() => import('./pages/app/Activity').then(m => ({ default: m.Activity })))

const RouteFallback = () => (
  <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
  </div>
)

export default function App() {
  return (
    <ErrorBoundary>
    <LanguageProvider>
    <AuthProvider>
    <RoleProvider>
    <SearchProvider>
    <ToastProvider>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
        <Route path="/app/onboarding" element={<ProtectedRoute allow={STAFF_ROLES}><Onboarding /></ProtectedRoute>} />

        {/* Public signing page */}
        <Route path="/sign/:token" element={<ContractSigning />} />

        {/* Protected app pages */}
        <Route path="/app" element={<ProtectedRoute allow={STAFF_ROLES}><AppLayout /></ProtectedRoute>}>
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
          <Route path="team-planning" element={<TeamPlanning />} />
          <Route path="time-clock" element={<TimeClock />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="service-providers" element={<ServiceProviders />} />
          <Route path="provider-ratings" element={<ProviderRatings />} />
          <Route path="concierge-portal" element={<ConciergePortal />} />
          <Route path="payments" element={<Payments />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/generate" element={<ContractGenerator />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/generate" element={<InvoiceGenerator />} />
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

        {/* Guest Mobile App (Airbnb-style) */}
        <Route path="/guest" element={<ProtectedRoute allow={['guest', 'owner']}><GuestLayout /></ProtectedRoute>}>
          <Route index element={<GuestExplore />} />
          <Route path="stays" element={<GuestStays />} />
          <Route path="services" element={<GuestServices />} />
          <Route path="guides" element={<GuestGuides />} />
          <Route path="messages" element={<GuestMessages />} />
          <Route path="profile" element={<GuestProfile />} />
        </Route>

        {/* Partner Mobile App (Airbnb-style) */}
        <Route path="/partner" element={<ProtectedRoute allow={['partner', 'owner']}><PartnerLayout /></ProtectedRoute>}>
          <Route index element={<PartnerDashboard />} />
          <Route path="bookings" element={<PartnerBookings />} />
          <Route path="earnings" element={<PartnerEarnings />} />
          <Route path="services" element={<PartnerServices />} />
          <Route path="profile" element={<PartnerProfile />} />
        </Route>

        {/* House Manager Mobile App */}
        <Route path="/hm" element={<ProtectedRoute><HmLayout /></ProtectedRoute>}>
          <Route index element={<HmToday />} />
          <Route path="tasks" element={<HmTasks />} />
          <Route path="incidents" element={<HmIncidents />} />
          <Route path="notifications" element={<HmNotifications />} />
          <Route path="profile" element={<HmProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
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
