import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../services/api";
import { setAuthSession } from "../services/auth";

const DEFAULT_NAME = "";
const DEFAULT_EMAIL =
  import.meta.env.VITE_CANDIDATE_EMAIL || "candidate@trustmeter.ai";
const DEFAULT_PASSWORD =
  import.meta.env.VITE_CANDIDATE_PASSWORD || "Candidate@123";

function CandidateLoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(DEFAULT_NAME);
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Candidate name is required");
      }

      const auth = await login(email, password);
      if (auth.user?.role !== "candidate") {
        throw new Error("This account is not a candidate account");
      }

      setAuthSession(auth.token, {
        ...auth.user,
        name: trimmedName,
      });
      navigate("/candidate/test");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-shell">
      <article className="panel form-panel">
        <h2>Candidate Login</h2>
        <p>Sign in to enter your assigned exam session.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Candidate Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Login and Continue"}
          </button>
        </form>

        {error && <p style={{ color: "#ae2012" }}>{error}</p>}
      </article>
    </section>
  );
}

export default CandidateLoginPage;
