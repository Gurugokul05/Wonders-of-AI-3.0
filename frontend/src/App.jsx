import { Link, Route, Routes } from "react-router-dom";

import CandidateExamPage from "./pages/CandidateExamPage";
import CandidateLoginPage from "./pages/CandidateLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>TRUST METER</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/candidate/login">Candidate</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main className="page-wrap">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/candidate/login" element={<CandidateLoginPage />} />
          <Route path="/candidate/test" element={<CandidateExamPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
