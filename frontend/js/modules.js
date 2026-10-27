// Dominios oficiales del examen SCS-C03 (verificado: exam guide AWS, 2026-10-26)
// https://docs.aws.amazon.com/aws-certification/latest/examguides/security-specialty-03.html
const DOMAINS = [
  { id: "detection", name: "Detection", weight: 16, file: "detection.json" },
  { id: "incident-response", name: "Incident Response", weight: 14, file: "incident-response.json" },
  { id: "infrastructure-security", name: "Infrastructure Security", weight: 18, file: "infrastructure-security.json" },
  { id: "iam", name: "Identity and Access Management", weight: 20, file: "iam.json" },
  { id: "data-protection", name: "Data Protection", weight: 18, file: "data-protection.json" },
  { id: "governance", name: "Security Foundations and Governance", weight: 14, file: "governance.json" },
];
