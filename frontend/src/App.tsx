import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AgendaList from './pages/Requisitions/AgendaList'
import RequisitionForm from './pages/Requisitions/RequisitionForm'
import RequisitionDetail from './pages/Requisitions/RequisitionDetail'
import UserList from './pages/Users/UserList'
import UserForm from './pages/Users/UserForm'
import Reports from './pages/Reports'
import ImportPage from './pages/Import'
import MaterialSeparation from './pages/MaterialSeparation'
import SettingsPage from './pages/Settings'
import TVDashboard from './pages/Dashboard/TVDashboard'
import ControleCirurgias from './pages/ControleCirurgias'

function TVPage() {
  const navigate = useNavigate()
  return <TVDashboard onExit={() => navigate('/')} />
}

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function VendorIndex() {
  const { user } = useAuth()
  if (user?.perfil === 'vendedor') return <Navigate to="/requisicoes/nova" replace />
  return <Dashboard />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/tv" element={<ProtectedRoute><TVPage /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<VendorIndex />} />
        <Route path="requisicoes" element={<AgendaList />} />
        <Route path="requisicoes/nova" element={<RequisitionForm />} />
        <Route path="requisicoes/:id" element={<RequisitionDetail />} />
        <Route path="requisicoes/:id/editar" element={<RequisitionForm />} />
        <Route path="separacao" element={<MaterialSeparation />} />
        <Route path="usuarios" element={<ProtectedRoute adminOnly><UserList /></ProtectedRoute>} />
        <Route path="usuarios/novo" element={<ProtectedRoute adminOnly><UserForm /></ProtectedRoute>} />
        <Route path="usuarios/:id/editar" element={<ProtectedRoute adminOnly><UserForm /></ProtectedRoute>} />
        <Route path="relatorios" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        <Route path="controle" element={<ProtectedRoute adminOnly><ControleCirurgias /></ProtectedRoute>} />
        <Route path="importar" element={<ProtectedRoute adminOnly><ImportPage /></ProtectedRoute>} />
        <Route path="configuracoes" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1e3a5f', color: '#fff', borderRadius: '10px', fontSize: '14px' },
            success: { style: { background: '#0d9488' } },
            error: { style: { background: '#dc2626' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
