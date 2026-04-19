export type Screen = 'LANDING' | 'QUIZ' | 'INTERVIEW' | 'DASHBOARD';

export interface UserData {
  careerStage?: string;
  interviewAnswer?: string;
  isQualified?: boolean;
}
