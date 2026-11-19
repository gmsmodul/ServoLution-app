import React from 'react';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/ui/ToastContainer';
import { ModalsContainer } from './components/modals/ModalsContainer';

import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ElasticPullToRefresh } from './components/ui/ElasticPullToRefresh';
import { PageTransition, getOrderedDirection } from './components/ui/PageTransition';
import { apiService } from './services/api';
import { WORKSPACE_ORDER } from './constants/workspaces';

// Modular Page Components
import { OverviewPage } from './components/pages/OverviewPage';
import { MaterialsPage } from './components/pages/MaterialsPage';
import { ClassPrepPage } from './components/pages/ClassPrepPage';
import { AttendancePage } from './components/pages/AttendancePage';
import { ExamsPage } from './components/pages/ExamsPage';
import { AssignmentsPage } from './components/pages/AssignmentsPage';
import { LiveQuizPage } from './components/pages/LiveQuizPage';
import { SchedulePage } from './components/pages/SchedulePage';
import { StudentsPage } from './components/pages/StudentsPage';
import { TrainersPage } from './components/pages/TrainersPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { UiKitPage } from './components/pages/UiKitPage';
import { HomePage } from './components/pages/HomePage';
import { LibraryPage } from './components/pages/LibraryPage';
import { FileManagerPage } from './components/pages/FileManagerPage';
import { EmptyWorkspacePage } from './components/pages/EmptyWorkspacePage';
import { QrDisplayPage } from './components/schedule/QrDisplayPage';
import { LiveQuizHostTabPage } from './components/livequiz/LiveQuizHostTabPage';
import { LiveQuizParticipantTabPage } from './components/livequiz/LiveQuizParticipantTabPage';

function MainLayout() {
  const {
    activeWorkspace,
    prevWorkspace,
    activeModulePage,
    activePage,
    prevPage,
    triggerToast,
  } = useApp();

  const handleWorkspaceRefresh = async () => {
    await Promise.all([
      apiService.getExams(),
      apiService.getAssignments(),
      apiService.getNotifications(),
    ]).catch(() => null);
    triggerToast('Data Diperbarui', 'Tampilan & ringkasan terbaru telah disinkronkan.', 'success');
  };

  const renderServolutionPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'materials':
        return <MaterialsPage />;
      case 'prep':
        return <ClassPrepPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'exams':
        return <ExamsPage />;
      case 'assignments':
        return <AssignmentsPage />;
      case 'livequiz':
        return <LiveQuizPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'students':
        return <StudentsPage />;
      case 'trainers':
        return <TrainersPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'uikit':
        return <UiKitPage />;
      default:
        return <OverviewPage />;
    }
  };

  const transitionKey =
    activeWorkspace === 'servolution'
      ? `servolution:${activePage}`
      : `${activeWorkspace}:${activeModulePage}`;

  const workspaceDirection =
    activeWorkspace === 'servolution' && prevWorkspace === 'servolution'
      ? undefined
      : getOrderedDirection(prevWorkspace, activeWorkspace, WORKSPACE_ORDER);

  return (
    <div
      className="min-h-screen md:h-screen md:overflow-hidden bg-[#E8E9F0] p-2.5 sm:p-3.5 md:p-4 lg:p-5 font-sans text-[#1C1D21] flex items-stretch selection:bg-[#D6D4FF] selection:text-[#1C1D21]"
    >
      {/* Main Container Shell (Full Width with Outer Browser Edge Gap) */}
      <div className="app-shell-container w-full md:h-full bg-gradient-to-br from-[#F1EFFE] via-[#F8F9FC] to-[#ECF8F2] rounded-[22px] sm:rounded-[26px] md:rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-white/80 flex overflow-hidden relative min-w-0 min-h-0">
        <Sidebar />

        <main className="flex-1 bg-white m-1.5 sm:m-2.5 rounded-[18px] sm:rounded-[24px] shadow-[0_2px_20px_rgba(0,0,0,0.02)] border border-black/[0.12] flex flex-col min-w-0 min-h-0 overflow-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <Header />

          <ElasticPullToRefresh onRefresh={handleWorkspaceRefresh}>
            <PageTransition
              activePage={activePage}
              prevPage={prevPage}
              transitionKey={transitionKey}
              directionOverride={workspaceDirection}
            >
              {activeWorkspace === 'servolution' ? (
                renderServolutionPage()
              ) : activeWorkspace === 'home' && activeModulePage === 'main' ? (
                <HomePage />
              ) : activeWorkspace === 'library' && activeModulePage !== 'settings' ? (
                <LibraryPage />
              ) : activeWorkspace === 'file-manager' && activeModulePage !== 'settings' ? (
                <FileManagerPage />
              ) : (
                <EmptyWorkspacePage />
              )}
            </PageTransition>
          </ElasticPullToRefresh>
        </main>
      </div>

      <MobileBottomNav />
      <ModalsContainer />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isQrDisplayTab = params?.get('qrDisplay') === '1';
  const isLiveQuizHostTab = params?.get('liveQuizHost') === '1';
  const isLiveQuizJoinTab = params?.get('liveQuizJoin') === '1';

  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        {isLiveQuizHostTab ? (
          <>
            <LiveQuizHostTabPage />
            <ToastContainer />
          </>
        ) : isLiveQuizJoinTab ? (
          <>
            <LiveQuizParticipantTabPage />
            <ToastContainer />
          </>
        ) : isQrDisplayTab ? (
          <>
            <QrDisplayPage />
            <ToastContainer />
          </>
        ) : (
          <MainLayout />
        )}
      </AppProvider>
    </MotionConfig>
  );
}
