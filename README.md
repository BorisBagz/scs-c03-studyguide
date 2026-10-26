# SCS-C03 Study Guide

Plataforma personal de preparación para el examen **AWS Certified Security - Specialty (SCS-C03)**.

## Funcionalidades

1. **Motor de quizzes** — preguntas de práctica (opción única, opción múltiple, escenario) con score por intento, por dominio y acumulado histórico.
2. **Módulos de estudio** organizados por los 6 dominios oficiales del examen.
3. **Registro de avance** — progreso por módulo, preguntas falladas para repaso espaciado, tendencia de score en el tiempo, sincronizado entre dispositivos (laptop/teléfono).

## Stack

- **Frontend**: HTML/CSS/JS estático, sin frameworks, hosteado en GitHub Pages. Sin sistema de usuarios (proyecto de un solo usuario).
- **Datos de quiz**: archivos JSON por dominio en `frontend/data/questions/`.
- **Backend**: API Gateway + Lambda + DynamoDB (AWS SAM), dentro del free tier. Sincroniza progreso entre dispositivos. Protegido con API key simple (header fijo, sin auth de usuarios).

## Estructura del repo

```
frontend/
  index.html
  css/
  js/
  data/questions/        # un JSON por dominio
backend/
  lambda/
    get-progress/
    put-progress/
  infra/
    template.yaml         # SAM template
docs/                      # notas de diseño, mapeo de dominios/pesos
```

## Dominios del examen (SCS-C03)

Verificado contra el exam guide oficial de AWS (2026-10-26): https://docs.aws.amazon.com/aws-certification/latest/examguides/security-specialty-03.html

| # | Dominio | Peso |
|---|---------|------|
| 1 | Detection | 16% |
| 2 | Incident Response | 14% |
| 3 | Infrastructure Security | 18% |
| 4 | Identity and Access Management | 20% |
| 5 | Data Protection | 18% |
| 6 | Security Foundations and Governance | 14% |

> Nota: estos dominios y pesos reemplazan una agrupación informal usada al inicio del proyecto (que combinaba "Threat Detection and Incident Response" como un solo dominio y listaba "Security Logging and Monitoring" como dominio independiente). Esa agrupación no corresponde al exam guide actual del SCS-C03 y fue corregida aquí.

## Desarrollo local

Frontend: servir `frontend/` con cualquier servidor estático (`python3 -m http.server` dentro de la carpeta).

Backend: ver `backend/infra/README.md` (pendiente) para build/deploy con SAM CLI.

## Deploy

- Frontend → GitHub Pages (rama `main`, carpeta `/frontend` o GitHub Action de build, a definir).
- Backend → `sam build && sam deploy` manual (fuera del alcance de CI por ahora, proyecto personal).
