import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import BaseLayout from './components/base/BaseLayout'
import useFadeOnScroll from './hooks/useFadeOnScroll'
const ContactPage = lazy(() => import('./pages/contact/ContactPage'))
const HistoriaPage = lazy(() => import('./pages/about/HistoriaPage'))
const HomePage = lazy(() => import('./pages/home/HomePage'))
const PerfilPage = lazy(() => import('./pages/about/PerfilPage'))
const PlanuPage = lazy(() => import('./pages/about/PlanuPage'))
const WorkPage = lazy(() => import('./pages/work/WorkPage'))
const NewsDetailPage = lazy(() => import('./pages/work/NewsDetailPage'))

// ── Admin Panel ──
import { AdminAuthProvider } from './context/AdminAuthContext'
import AdminRequireAuth from './components/admin/AdminRequireAuth'
import AdminLayout from './components/admin/AdminLayout'
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const NoticiasPage = lazy(() => import('./pages/admin/noticias/NoticiasPage'))
const NoticiaEditPage = lazy(() => import('./pages/admin/noticias/NoticiaEditPage'))
const PerfilAdminPage = lazy(() => import('./pages/admin/PerfilAdminPage'))
const HistoriaAdminPage = lazy(() => import('./pages/admin/HistoriaAdminPage'))
const StakeholdersAdminPage = lazy(() => import('./pages/admin/StakeholdersAdminPage'))
const EstrategiaAdminPage = lazy(() => import('./pages/admin/EstrategiaAdminPage'))
const PublicationsAdminPage = lazy(() => import('./pages/admin/publications/PublicationsAdminPage'))
const PublicationEditPage = lazy(() => import('./pages/admin/publications/PublicationEditPage'))
const KeixasPage = lazy(() => import('./pages/admin/keixas/KeixasPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/users/AdminUsersPage'))
const PublicationsPage = lazy(() => import('./pages/publications/PublicationsPage'))

function RouteLoader() {
  return <div className="container" style={{ padding: '28px 0' }}>Loading...</div>
}

function App() {
  useFadeOnScroll()

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
      {/* ── Public site ── */}
      <Route element={<BaseLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />

        {/* Kona-ba TANE sub-pages */}
        <Route path="/about" element={<Navigate to="/about/perfil" replace />} />
        <Route path="/about/perfil" element={<PerfilPage />} />
        <Route path="/about/historia" element={<HistoriaPage />} />
        <Route path="/about/planu" element={<PlanuPage />} />

        {/* Legacy aliases */}
        <Route path="/strategic-plan" element={<Navigate to="/about/planu" replace />} />
        <Route path="/team" element={<Navigate to="/about/perfil" replace />} />

        <Route path="/work" element={<WorkPage />} />
        <Route path="/news" element={<WorkPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/publications" element={<PublicationsPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* ── Admin Panel (shared auth context) ── */}
      <Route
        path="/admin-panel"
        element={
          <AdminAuthProvider>
            <Outlet />
          </AdminAuthProvider>
        }
      >
        {/* Public: login */}
        <Route path="login" element={<AdminLogin />} />

        {/* Protected: dashboard + CRUD */}
        <Route
          element={
            <AdminRequireAuth>
              <AdminLayout />
            </AdminRequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="noticias" element={<NoticiasPage />} />
          <Route path="noticias/new" element={<NoticiaEditPage />} />
          <Route path="noticias/:id/edit" element={<NoticiaEditPage />} />
          <Route path="perfil" element={<PerfilAdminPage />} />
          <Route path="historia" element={<HistoriaAdminPage />} />
          <Route path="stakeholders" element={<StakeholdersAdminPage />} />
          <Route path="estrategia" element={<EstrategiaAdminPage />} />
          <Route path="publications" element={<PublicationsAdminPage />} />
          <Route path="publications/new" element={<PublicationEditPage />} />
          <Route path="publications/:id/edit" element={<PublicationEditPage />} />
          <Route path="keixas" element={<KeixasPage />} />
          <Route path="admin-users" element={<AdminUsersPage />} />
        </Route>
      </Route>
      </Routes>
    </Suspense>
  )
}

export default App
