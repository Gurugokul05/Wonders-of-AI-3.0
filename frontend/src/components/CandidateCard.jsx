function CandidateCard({ session, onSelect, onDownloadReport }) {
  const score = Math.round(session.currentScore || 100);
  const candidateName =
    typeof session.candidateId === "object"
      ? session.candidateId?.name || "Unknown Candidate"
      : `Candidate ${String(session.candidateId).slice(-6)}`;

  return (
    <article className="panel">
      <h3>Session {String(session._id).slice(-6)}</h3>
      <p>Candidate: {candidateName}</p>
      <p>Status: {String(session.status || "active").toUpperCase()}</p>
      <p>Score: {score}</p>
      <p>Risk: {session.riskLevel}</p>
      <div className="card-actions">
        <button onClick={() => onSelect(session)}>Open Timeline</button>
        <button className="secondary" onClick={() => onDownloadReport(session)}>
          Download PDF Report
        </button>
      </div>
    </article>
  );
}

export default CandidateCard;
