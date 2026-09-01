# Pocket50 — PWA de Finanzas 50/30/20

PWA para registrar gastos en VES, convertir a USD, y aplicar la regla 50/30/20.

## Stack

- **Frontend:** React + Tailwind CSS 4
- **Runtime:** Bun
- **Backend:** Google Apps Script → Google Sheets
- **Deploy:** Firebase Hosting

## Setup

### 1. Google Apps Script

1. Crear un Google Sheet nuevo
2. Seguir instrucciones en `gas/README.md`
3. Copiar el URL del Web App desplegado
4. Pegar en `src/config.ts` → `GAS_ENDPOINT`

### 2. Firebase

1. Instalar Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Crear proyecto: `firebase projects:create pocket50`
4. Actualizar `.firebaserc` con el ID del proyecto
5. Inicializar: `firebase init hosting` (servir `dist/`)

### 3. Desarrollo

```bash
bun install
bun dev
```

### 4. Build y Deploy

```bash
bun run build
firebase deploy --only hosting
```

## Comandos

| Task | Command |
|------|---------|
| Dev | `bun dev` |
| Build | `bun run build` |
| Deploy | `firebase deploy --only hosting` |
