import { jsPDF } from "jspdf";

function resolveCandidateName(session) {
  if (session?.candidateId && typeof session.candidateId === "object") {
    return session.candidateId.name || "Not provided";
  }
  return session?.candidateName || "Not provided";
}

function resolveCandidateEmail(session) {
  if (session?.candidateId && typeof session.candidateId === "object") {
    return session.candidateId.email || "Not provided";
  }
  return session?.candidateEmail || "Not provided";
}

function resolveCandidateId(session) {
  if (session?.candidateId && typeof session.candidateId === "object") {
    return session.candidateId._id || "Not provided";
  }
  return session?.candidateId || "Not provided";
}

function buildSafeFilePart(value) {
  return String(value || "candidate")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "candidate";
}

export function generateCandidateReportPdf({ session, report, timeline }) {
  const doc = new jsPDF();
  let y = 0;
  
  const candidateName = resolveCandidateName(session);
  const candidateEmail = resolveCandidateEmail(session);
  const candidateId = resolveCandidateId(session);

  // --- 1. Banner Header ---
  doc.setFillColor(79, 70, 229); // var(--accent) #4f46e5
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("TRUST METER", 14, 18);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Candidate Integrity Report", 14, 28);
  
  doc.setFontSize(10);
  doc.text(`Exam ID: ${session.examId}`, 150, 20);
  doc.text(new Date(report.generatedAt).toLocaleDateString(), 150, 28);
  
  // --- 2. Candidate Details ---
  y = 50;
  doc.setTextColor(15, 23, 42); // slate 900
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Candidate Details", 14, y);
  doc.line(14, y + 2, 196, y + 2); // Separator line
  
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Name:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(candidateName, 40, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Email:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(candidateEmail, 40, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("User ID:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(candidateId), 40, y);
  
  // Quick Report stats Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, 55, 76, 25, 3, 3, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Session Score:", 125, 63);
  doc.text("Risk Level:", 125, 73);
  
  doc.setFontSize(16);
  if (report.finalScore < 40) doc.setTextColor(239, 68, 68); // red
  else if (report.finalScore < 70) doc.setTextColor(234, 179, 8); // yellow
  else doc.setTextColor(16, 185, 129); // green
  
  doc.text(`${Math.round(report.finalScore)}%`, 170, 64);
  
  doc.setFontSize(12);
  doc.text(report.riskLevel.toUpperCase(), 170, 74);
  
  doc.setTextColor(15, 23, 42); // reset color

  // --- 3. Event Summary ---
  y = 95;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Event Summary", 14, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, 196, y + 2); // Separator line

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const summaryRows = Object.entries(report.eventSummary || {});
  if (summaryRows.length === 0) {
    doc.text("No suspicious events logged. Excellent integrity.", 14, y);
    y += 8;
  } else {
    // Draw small tags for each event type
    summaryRows.forEach(([eventType, count], idx) => {
      const xOffset = 14 + (idx % 2 === 0 ? 0 : 90);
      if (idx > 0 && idx % 2 === 0) y += 8;
      
      doc.setFont("helvetica", "bold");
      doc.text(`${count}x`, xOffset, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${eventType}`, xOffset + 10, y);
    });
    // Adjust y to pass the last row
    y += Math.ceil(summaryRows.length / 2) * 8 + 4;
  }

  // --- 4. Timeline Table ---
  y += 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Audit Timeline (Top 20 Issues)", 14, y);
  doc.line(14, y + 2, 196, y + 2);
  
  y += 10;
  
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.setFontSize(9);
  doc.text("Time", 16, y);
  doc.text("Event Type", 45, y);
  doc.text("Severity", 125, y);
  doc.text("Conf.", 155, y);
  doc.text("Penalty", 180, y);
  
  y += 6;

  const topEvents = [...(timeline || [])].reverse().slice(0, 20);
  
  if (topEvents.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.text("No timeline records available.", 14, y);
  } else {
    doc.setFont("helvetica", "normal");
    topEvents.forEach((ev, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        // Reprint Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y - 5, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Time", 16, y);
        doc.text("Event Type", 45, y);
        doc.text("Severity", 125, y);
        doc.text("Conf.", 155, y);
        doc.text("Penalty", 180, y);
        y += 6;
      }

      // Stripe background
      if (idx % 2 !== 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 7, "F");
      }

      doc.setFont("helvetica", "normal");
      const timeStr = new Date(ev.timestamp).toLocaleTimeString();
      let sevCol = [15, 23, 42];
      if (ev.severity === "high" || ev.severity === "critical") sevCol = [239, 68, 68];
      else if (ev.severity === "medium") sevCol = [234, 179, 8];

      doc.setTextColor(15, 23, 42);
      doc.text(timeStr, 16, y + 1);
      doc.text(ev.eventType, 45, y + 1);
      
      doc.setTextColor(sevCol[0], sevCol[1], sevCol[2]);
      doc.text(ev.severity.toUpperCase(), 125, y + 1);
      
      doc.setTextColor(100, 116, 139);
      doc.text(Number(ev.confidence || 0).toFixed(2), 155, y + 1);
      doc.text(Number(ev.penaltyApplied || 0).toFixed(2), 180, y + 1);

      y += 7;
    });
  }

  const candidateSlug = buildSafeFilePart(candidateName);
  doc.save(`trust-meter-report-${candidateSlug}-${String(session._id).slice(-6)}.pdf`);
}
