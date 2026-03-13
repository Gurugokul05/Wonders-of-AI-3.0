import { Link, Route, Routes } from "react-router-dom";

import CandidateExamPage from "./pages/CandidateExamPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>TRUST METER</h1>
        <nav>
          <Link to="/">Candidate</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main className="page-wrap">
        <Routes>
          <Route path="/" element={<CandidateExamPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
