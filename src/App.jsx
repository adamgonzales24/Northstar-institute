import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StudentProvider, useStudent } from './context/StudentContext.jsx'
import Layout from './components/Layout.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CourseList from './pages/CourseList.jsx'
import CourseHome from './pages/CourseHome.jsx'
import ModuleViewer from './pages/ModuleViewer.jsx'
import AssignmentDetail from './pages/AssignmentDetail.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import GradesPage from './pages/GradesPage.jsx'
import AuditPage from './pages/AuditPage.jsx'
import TranscriptPage from './pages/TranscriptPage.jsx'
import PortfolioPage from './pages/PortfolioPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProfessorPage from './pages/ProfessorPage.jsx'
import { SyllabusTab, ModulesTab, AssignmentsTab, CourseGradesTab, ResourcesTab, CourseProfessorTab } from './pages/courseTabs.jsx'
import NotebookTab from './pages/NotebookTab.jsx'
import ReadingsTab from './pages/ReadingsTab.jsx'
import { IS_BOOTCAMP } from './lib/config.js'

function Gate({ children }) {
  const { state, usbSync } = useStudent()
  if (usbSync?.checking) {
    return (
      <div className="onboard">
        <h1>{IS_BOOTCAMP ? 'Northstar Bootcamp' : 'Northstar Institute'}</h1>
        <p className="page-sub">Loading your USB record…</p>
      </div>
    )
  }
  if (!state.onboarded) return <Onboarding />
  return children
}

function ResumeRoute() {
  const { state, byId, continuePath } = useStudent()
  const raw = state.lastRoute || continuePath() || '/dashboard'
  const match = typeof raw === 'string' ? raw.match(/^\/courses\/([^/]+)/) : null
  let dest = match && !byId[match[1]] ? '/dashboard' : raw.startsWith('/') ? raw : '/dashboard'
  if (dest === '/') dest = '/dashboard'
  return <Navigate to={dest} replace />
}

export default function App() {
  return (
    <StudentProvider>
      <BrowserRouter>
        <Gate>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ResumeRoute />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses" element={<CourseList />} />
              <Route path="/courses/:courseId" element={<CourseHome />}>
                <Route index element={<SyllabusTab />} />
                <Route path="modules" element={<ModulesTab />} />
                <Route path="assignments" element={<AssignmentsTab />} />
                <Route path="grades" element={<CourseGradesTab />} />
                <Route path="notebook" element={<NotebookTab />} />
                <Route path="notebook/:pageId" element={<NotebookTab />} />
                <Route path="readings" element={<ReadingsTab />} />
                <Route path="readings/:readingId" element={<ReadingsTab />} />
                <Route path="resources" element={<ResourcesTab />} />
                <Route path="professor" element={<CourseProfessorTab />} />
              </Route>
              <Route path="/courses/:courseId/modules/:week" element={<ModuleViewer />} />
              <Route path="/courses/:courseId/work/:itemId" element={<AssignmentDetail />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/grades" element={<GradesPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/transcript" element={<TranscriptPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/professor" element={<ProfessorPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Gate>
      </BrowserRouter>
    </StudentProvider>
  )
}
