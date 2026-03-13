function CandidateCard({ session, onSelect }) {
  const score = Math.round(session.currentScore || 100);

  return (
    <article className="panel">
      <h3>Session {String(session._id).slice(-6)}</h3>
      <p>Candidate: {String(session.candidateId).slice(-6)}</p>
      <p>Score: {score}</p>
      <p>Risk: {session.riskLevel}</p>
      <button onClick={() => onSelect(session)}>Open Timeline</button>
    </article>
  );
}

export default CandidateCard;
