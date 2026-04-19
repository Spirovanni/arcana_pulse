/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Screen, UserData } from './types';
import LandingScreen from './screens/LandingScreen';
import QuizScreen from './screens/QuizScreen';
import InterviewScreen from './screens/InterviewScreen';
import DashboardScreen from './screens/DashboardScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LANDING');
  const [userData, setUserData] = useState<UserData>({});

  const handleStart = () => {
    setCurrentScreen('QUIZ');
  };

  const handleQuizNext = (stage: string) => {
    setUserData(prev => ({ ...prev, careerStage: stage }));
    setCurrentScreen('INTERVIEW');
  };

  const handleInterviewComplete = (answer: string) => {
    setUserData(prev => ({ ...prev, interviewAnswer: answer, isQualified: true }));
    setCurrentScreen('DASHBOARD');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {currentScreen === 'LANDING' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <LandingScreen 
              onStart={handleStart} 
              onSeeIfYouQualify={handleStart} 
            />
          </motion.div>
        )}

        {currentScreen === 'QUIZ' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <QuizScreen 
              onBack={() => setCurrentScreen('LANDING')} 
              onNext={handleQuizNext} 
            />
          </motion.div>
        )}

        {currentScreen === 'INTERVIEW' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <InterviewScreen onComplete={handleInterviewComplete} />
          </motion.div>
        )}

        {currentScreen === 'DASHBOARD' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full h-full"
          >
            <DashboardScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
