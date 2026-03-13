function TrustMeter({ score }) {
  const levelClass =
    score < 60 ? "trust-high" : score < 80 ? "trust-medium" : "trust-low";
  const label = score < 60 ? "HIGH RISK" : score < 80 ? "MEDIUM" : "LOW";

  return (
    <div>
      <div className={`trust-pill ${levelClass}`}>
        Score: {Math.round(score)} ({label})
      </div>
    </div>
  );
}

export default TrustMeter;
