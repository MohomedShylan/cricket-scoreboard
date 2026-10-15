
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import PublicScoreboard from './page/PublicScoreboard';
import AdminPage from './page/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<PublicScoreboard />}
        />

        <Route
          path="/admin"
          element={<AdminPage />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
