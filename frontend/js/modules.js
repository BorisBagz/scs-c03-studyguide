// Dominios oficiales del examen SCS-C03 (verificado: exam guide AWS, 2026-10-26)
// https://docs.aws.amazon.com/aws-certification/latest/examguides/security-specialty-03.html
// color = trazo del dominio; tint = relleno suave (mantiene legible el texto encima).
const DOMAINS = [
  { id: "detection", name: "Detection", short: "Detection", weight: 16, file: "detection.json", color: "#0E8A9B", tint: "#C9E9ED" },
  { id: "incident-response", name: "Incident Response", short: "Response", weight: 14, file: "incident-response.json", color: "#D1432B", tint: "#F8D5CD" },
  { id: "infrastructure-security", name: "Infrastructure Security", short: "Infrastructure", weight: 18, file: "infrastructure-security.json", color: "#3F4FD1", tint: "#D5D9F8" },
  { id: "iam", name: "Identity and Access Management", short: "IAM", weight: 20, file: "iam.json", color: "#C98A00", tint: "#F6E3B0" },
  { id: "data-protection", name: "Data Protection", short: "Data protection", weight: 18, file: "data-protection.json", color: "#7C3FB8", tint: "#E5D5F3" },
  { id: "governance", name: "Security Foundations and Governance", short: "Governance", weight: 14, file: "governance.json", color: "#2E8B57", tint: "#CFEADB" },
];
