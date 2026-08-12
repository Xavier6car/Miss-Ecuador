# Polla Miss Ecuador

App web de predicciones por eliminación de fases para el certamen Miss Ecuador.
Cada participante predice quiénes avanzan en cada corte (Top 15 → Top 10 → Top 5
→ Podio) y va sumando puntos a medida que el administrador publica los
resultados oficiales.

Stack: **React + Vite** (frontend) y **Firebase** (Auth + Firestore).

## 1. Funcionalidad

- 26 candidatas con nombre, provincia, foto, número y bio.
- Login por email/password o Google (Firebase Auth).
- 4 fases con deadline configurable, estado (`abierta` / `cerrada` /
  `resultados_publicados`) y universo de candidatas que se va reduciendo según
  los resultados oficiales de la fase anterior.
- Sistema de puntos acumulativo (ver tabla en la sección "Reglas" dentro de la
  app), con recálculo automático para todos los usuarios cuando el admin
  publica o corrige resultados.
- Roles: `usuario`, `colaborador` (puede cargar/editar candidatas) y `admin`
  (control total: fases, resultados oficiales, roles).
- Ranking en tiempo real (listener de Firestore) con desglose por fase.

## 2. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. **Authentication** → habilita los proveedores "Email/Password" y "Google".
3. **Firestore Database** → créala en modo producción (las reglas de este repo
   ya cubren la seguridad).
4. En "Configuración del proyecto → Tus apps", crea una app web y copia las
   credenciales.
5. Copia `.env.example` a `.env` y pega ahí esas credenciales:

   ```bash
   cp .env.example .env
   ```

6. Despliega las reglas de seguridad y (opcionalmente) el hosting con la
   [Firebase CLI](https://firebase.google.com/docs/cli):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # selecciona tu proyecto
   firebase deploy --only firestore:rules
   ```

## 3. Correr localmente

```bash
npm install
npm run dev
```

## 4. Crear el primer administrador

Por seguridad, cualquier usuario que se registra empieza con rol `usuario`
(las reglas de Firestore no dejan que alguien se auto-asigne `admin`). Para
crear el primer admin:

1. Regístrate normalmente desde la app (con tu email real).
2. Ve a Firebase Console → Firestore → colección `users` → busca tu documento
   (por tu UID, visible en Authentication).
3. Edita el campo `role` y cámbialo a `admin`.

Desde ahí, ese admin ya puede entrar a "Administración → Roles" y asignar el
rol `colaborador` a las 2 personas adicionales que van a cargar candidatas,
o ascender a otro admin, todo desde la UI.

## 5. Flujo de uso típico

1. Admin/colaboradores cargan las 26 candidatas en **Administración →
   Candidatas**.
2. Admin abre la Fase 1 y le pone deadline en **Administración → Fases y
   resultados**.
3. Los usuarios eligen sus 15 candidatas en **Mis predicciones**.
4. Cuando cierra el deadline (o el admin cierra la fase manualmente), las
   predicciones quedan bloqueadas.
5. El admin marca oficialmente quiénes avanzaron y pulsa **"Publicar
   resultados y recalcular puntos"** → se recalculan los puntos de todos los
   usuarios y el universo de candidatas de la Fase 2 queda habilitado
   automáticamente.
6. Se repite para Fase 2, Fase 3 y el Podio final (Fase 4).
7. El **Ranking** se actualiza solo, en tiempo real, para todos los que
   tengan la app abierta.

## 6. Despliegue (Netlify o Firebase Hosting)

```bash
npm run build
```

- **Netlify**: conecta el repo, build command `npm run build`, publish
  directory `dist`. Ya incluye `public/_redirects` para que las rutas de
  React Router funcionen. Configura las variables `VITE_FIREBASE_*` en
  Netlify → Site settings → Environment variables.
- **Firebase Hosting**: `firebase deploy --only hosting` (usa `firebase.json`,
  ya configurado con rewrites a `index.html`).

## 7. Estructura de datos (Firestore)

```
candidates/{candidateId}
  { number, name, province, photoUrl, bio, status: 'active'|'eliminated',
    lastEditedBy, lastEditedByName, lastEditedAt }

users/{userId}
  { name, email, role: 'admin'|'colaborador'|'usuario',
    totalPoints, pointsByPhase: { phase1, phase2, phase3, phase4 } }

phases/{phaseKey}        // phaseKey: phase1 | phase2 | phase3 | phase4
  { status: 'abierta'|'cerrada'|'resultados_publicados', deadline }

phaseResults/{phaseKey}
  { officialPicks: [candidateId...] }              // fases 1-3
  { podium: { winner, first, second } }             // fase 4
  { publishedAt, status }

predictions/{userId}_{phaseKey}
  { userId, phase, picks: [candidateId...] }        // fases 1-3
  { userId, phase, podium: { winner, first, second } } // fase 4
```

Las reglas de seguridad (`firestore.rules`) validan roles y que cada quien
solo pueda escribir su propia predicción, y solo mientras la fase esté
`abierta`.

## 8. Puntos pendientes / ideas para después

- Subida de fotos a Firebase Storage (hoy se usa URL directa).
- Exportar ranking a CSV.
- Notificaciones push de deadlines próximos.
