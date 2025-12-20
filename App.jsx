import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage.jsx';
import RikoLogApp from './RikoLogApp.jsx';
import TermsOfService from './TermsOfService.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';
import CommercialTransaction from './CommercialTransaction.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<RikoLogApp />} />
        <Route path="/app/*" element={<RikoLogApp />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/commercial" element={<CommercialTransaction />} />
        {/* デフォルトはLPにリダイレクト */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
