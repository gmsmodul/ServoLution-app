import React from 'react';
import { AddExamModal } from './AddExamModal';
import { NewLessonPlanModal } from './NewLessonPlanModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { TakeAssignmentModal } from './TakeAssignmentModal';
import { SubmissionReviewModal } from './SubmissionReviewModal';
import { AddScheduleModal } from './AddScheduleModal';
import { AddStudentModal } from './AddStudentModal';
import { AddTrainerModal } from './AddTrainerModal';
import { TrainerFeedbackModal } from './TrainerFeedbackModal';
import { GenerateReportModal } from './GenerateReportModal';
import { UploadMaterialModal } from './UploadMaterialModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { StudentDetailSheet } from './StudentDetailSheet';
import { TrainerDetailSheet } from './TrainerDetailSheet';
import { InteractiveUiModals } from './InteractiveUiModals';
import { CrewQrCheckInModal } from '../attendance/CrewQrCheckInModal';

export const ModalsContainer: React.FC = () => {
  return (
    <>
      <AddExamModal />
      <NewLessonPlanModal />
      <CreateAssignmentModal />
      <TakeAssignmentModal />
      <SubmissionReviewModal />
      <AddScheduleModal />
      <AddStudentModal />
      <AddTrainerModal />
      <TrainerFeedbackModal />
      <GenerateReportModal />
      <UploadMaterialModal />
      <VideoPlayerModal />
      <StudentDetailSheet />
      <TrainerDetailSheet />
      <InteractiveUiModals />
      <CrewQrCheckInModal />
    </>
  );
};
