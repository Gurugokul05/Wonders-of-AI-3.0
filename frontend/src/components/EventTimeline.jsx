function EventTimeline({ events }) {
  return (
    <ul className="event-list">
      {events.map((event, idx) => (
        <li key={`${event.timestamp || Date.now()}-${idx}`}>
          <strong>{event.eventType}</strong>
          <div>
            source: {event.source || "-"} | confidence:{" "}
            {event.confidence ?? "-"}
          </div>
          <small>
            {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
          </small>
        </li>
      ))}
      {events.length === 0 && <li>No suspicious events yet.</li>}
    </ul>
  );
}

export default EventTimeline;
