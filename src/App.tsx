import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RoleProvider } from './lib/roleContext'
import { AuthProvider } from './lib/authContext'
import { ProtectedRoute, OnboardingRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { EarlyAccess } from './pages/EarlyAccess'
import { Login } from './pages/Login'
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
import { Services } from './pages/app/Services'
import { Tasks } from './pages/app/Tasks'
import { CalendarPage } from './pages/app/CalendarPage'
import { Partners } from './pages/app/Partners'
import { Payments } from './pages/app/Payments'
import { Contracts } from './pages/app/Contracts'
import { ContractGenerate } from './pages/app/ContractGenerate'
import { ContractDetail } from './pages/app/ContractDetail'
import { InvoiceGenerate } from './pages/app/InvoiceGenerate'
import { Reports } from './pages/app/Reports'
import { Settings } from './pages/app/Settings'
import { StayReservesPage } from './pages/app/StayReservesPage'
import { BoutiqueOrdersPage } from './pages/app/BoutiqueOrdersPage'
import { BoutiqueCatalogPage } from './pages/app/BoutiqueCatalogPage'
import { BoutiqueProductFormPage } from './pages/app/BoutiqueProductFormPage'
import { BoutiqueLayout } from './components/boutique/BoutiqueLayout'
import { StayMessagesPage } from './pages/app/StayMessagesPage'
import { SignContract } from './pages/SignContract'
import { GuestPortalPreviewPage } from './pages/GuestPortalPreviewPage'
import { GuestStayPortalPage } from './pages/GuestStayPortalPage'

export default function App() {
  return (
    <AuthProvider>
    <RoleProvider>
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/early-access" element={<EarlyAccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/sign/:token" element={<SignContract />} />
        <Route path="/guest/preview" element={<GuestPortalPreviewPage />} />
        <Route path="/guest/stay/:token" element={<GuestStayPortalPage />} />
        <Route path="/onboarding" element={<OnboardingRoute><OwnerOnboarding /></OnboardingRoute>} />

        {/* Protected app pages */}
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
          <Route path="guest-portal" element={<GuestPortal />} />
          <Route path="services" element={<Services />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="payments" element={<Payments />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/generate" element={<ContractGenerate />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="invoices/generate" element={<InvoiceGenerate />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </RoleProvider>
    </AuthProvider>
  )
}
