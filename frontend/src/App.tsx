import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
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
import CadastrosPage from './pages/Cadastros'
import InstrumentadoresPage from './pages/Instrumentadores'

function TVPage() {
  const navigate = useNavigate()
  return <TVDashboard onExit={() => navigate('/')} />
}

function ProtectedRoute({ children, navKey }: { children: React.ReactNode; navKey?: keyof import('./utils/permissions').Permissions['nav'] }) {
  const { user, loading, permissions } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (navKey && !permissions?.nav[navKey]) return <Navigate to={permissions?.landingPath ?? '/'} replace />
  return <>{children}</>
}

function RoleIndex() {
  const { permissions } = useAuth()
  const landing = permissions?.landingPath
  if (landing && landing !== '/') return <Navigate to={landing} replace />
  return <Dashboard />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/tv" element={<ProtectedRoute><TVPage /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RoleIndex />} />
        <Route path="requisicoes" element={<ProtectedRoute navKey="agendamento"><AgendaList /></ProtectedRoute>} />
        <Route path="requisicoes/nova" element={<ProtectedRoute navKey="agendamento"><RequisitionForm /></ProtectedRoute>} />
        <Route path="requisicoes/:id" element={<ProtectedRoute navKey="agendamento"><RequisitionDetail /></ProtectedRoute>} />
        <Route path="requisicoes/:id/editar" element={<ProtectedRoute navKey="agendamento"><RequisitionForm /></ProtectedRoute>} />
        <Route path="separacao" element={<ProtectedRoute navKey="separacao"><MaterialSeparation /></ProtectedRoute>} />
        <Route path="usuarios" element={<ProtectedRoute navKey="usuarios"><UserList /></ProtectedRoute>} />
        <Route path="usuarios/novo" element={<ProtectedRoute navKey="usuarios"><UserForm /></ProtectedRoute>} />
        <Route path="usuarios/:id/editar" element={<ProtectedRoute navKey="usuarios"><UserForm /></ProtectedRoute>} />
        <Route path="relatorios" element={<ProtectedRoute navKey="relatorios"><Reports /></ProtectedRoute>} />
        <Route path="controle" element={<ProtectedRoute navKey="controle"><ControleCirurgias /></ProtectedRoute>} />
        <Route path="importar" element={<ProtectedRoute navKey="importar"><ImportPage /></ProtectedRoute>} />
        <Route path="configuracoes" element={<ProtectedRoute navKey="configuracoes"><SettingsPage /></ProtectedRoute>} />
        <Route path="cadastros" element={<ProtectedRoute navKey="cadastros"><CadastrosPage /></ProtectedRoute>} />
        <Route path="instrumentadores" element={<ProtectedRoute navKey="instrumentadores"><InstrumentadoresPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
      </ThemeProvider>
    </BrowserRouter>
  )
}
