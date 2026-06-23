import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RoleProvider } from './lib/roleContext'
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
import { Services } from './pages/app/Services'
import { Tasks } from './pages/app/Tasks'
import { CalendarPage } from './pages/app/CalendarPage'
import { Partners } from './pages/app/Partners'
import { Payments } from './pages/app/Payments'
import { Contracts } from './pages/app/Contracts'
import { Reports } from './pages/app/Reports'
import { Settings } from './pages/app/Settings'

export default function App() {
  return (
    <RoleProvider>
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/early-access" element={<EarlyAccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* App pages */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="guest-portal" element={<GuestPortal />} />
          <Route path="services" element={<Services />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="payments" element={<Payments />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </RoleProvider>
  )
}
