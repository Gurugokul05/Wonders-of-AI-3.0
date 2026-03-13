import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="landing-wrapper">
      <section className="hero-shell">
        <div className="hero-card text-center">
          <span className="eyebrow">AI Based Online Exam Integrity Monitoring</span>
          <h2>TRUST METER</h2>
          <p className="hero-subtitle">
            Secure your online exams with real-time behavior intelligence,
            integrity scoring, and auditable incident evidence.
          </p>

          <div className="hero-actions justify-center">
            <Link to="/candidate/login" className="button-link">
              Candidate Login
            </Link>
            <Link to="/admin" className="button-link secondary-link">
              Admin Portal
            </Link>
          </div>
        </div>
      </section>

      <section className="features-shell">
        <div className="features-header text-center">
          <h2>How Trust Meter Works</h2>
          <p>Advanced monitoring infrastructure for remote assessments.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">👁️</div>
            <h3>Real-time Monitoring</h3>
            <p>Continuous AI analysis of candidate behavior, detecting multiple faces or unauthorized objects in the frame.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Integrity Scoring</h3>
            <p>Dynamic trust calculation based on behavioral events, providing a clear overall integrity assessment.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📹</div>
            <h3>Incident Audit Trails</h3>
            <p>Automatic video and snapshot recording of suspicious events securely stored for post-exam review.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>TRUST METER</h3>
            <p>Ensuring fairness in remote assessments.</p>
          </div>
          <div className="footer-links">
            <Link to="/candidate/login">Candidate</Link>
            <Link to="/admin">Admin Dashboard</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Trust Meter. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
