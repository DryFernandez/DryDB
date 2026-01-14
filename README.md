# DryDB 🔧

**DryDB** es una aplicación de escritorio (Electron + Vite + TypeScript + React) para explorar y ejecutar consultas en bases de datos relacionales. Soporta MySQL/MariaDB, PostgreSQL, SQL Server y SQLite, incluye un generador de consultas, historial de queries y exportación de resultados a Excel.

---

## ✅ Características

- Conexión a múltiples gestores: **MySQL / MariaDB / PostgreSQL / SQL Server / SQLite**
- Guardado de conexiones y historial de queries (localStorage)
- Constructor de consultas (Query Builder) y ejecución de SQL
- Exportación de resultados a archivo Excel (.xlsx)
- Interfaz basada en HTML/CSS/TS (renderer) con API segura a través de `preload.ts`

---

## 🔧 Requisitos

- Node.js (v16+ recomendado)
- npm
- Acceso de red a las bases de datos a las que quieres conectarte

Dependencias de drivers incluidas en `package.json`:
- `mysql2` (MySQL/MariaDB)
- `pg` (PostgreSQL)
- `mssql` (SQL Server)
- `sqlite` / `sqlite3` (SQLite)
- `xlsx` (exportar a Excel)

---

## 🏁 Instalación y ejecución (desarrollo)

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Iniciar la aplicación en modo desarrollo:

   ```bash
   npm start
   ```

Este proyecto usa **Electron Forge + plugin Vite**; en desarrollo el renderer se sirve desde Vite (variable `MAIN_WINDOW_VITE_DEV_SERVER_URL`).

---

## 📦 Empaquetado

- Crear paquete: `npm run package`
- Generar instaladores: `npm run make`
- Publicar (según configuración de Forge): `npm run publish`

---

## ⚙️ Uso

1. Abrir la app y crear una nueva conexión:
   - Seleccionar el tipo de gestor
   - Completar host, puerto, usuario, contraseña y nombre de la base de datos
   - Para SQLite, en `database` proporciona la ruta del archivo `.db`

2. Conectar y (opcional) guardar la conexión.
3. Usar el Query Builder o escribir consultas SQL y ejecutar.
4. Exportar resultados con el botón "Exportar a Excel".

> Puertos por defecto que establece la UI: MySQL/MariaDB 3306, PostgreSQL 5432, SQL Server 1433.

---

## 💾 Almacenamiento local

Las conexiones y el historial de queries se guardan en `localStorage` bajo la clave `drydb_data`. Ten en cuenta que las credenciales se almacenan localmente en el equipo del usuario.

---

## 📁 Estructura principal del proyecto

- `src/main.ts` — Proceso principal (Electron). Registra handlers IPC para DB.
- `src/preload.ts` — Puente seguro entre main y renderer (`contextBridge`).
- `src/renderer.ts` — Lógica de la UI (conexiones, query builder, exportación).
- `src/database/connection.ts` — Lógica de conexión y consultas para distintos DBs.
- `src/utils/storage.ts` — Gestión de conexiones e historial en `localStorage`.
- `package.json` — Scripts y dependencias.

---

## 🛡️ Notas y limitaciones

- Las conexiones se hacen desde la máquina local (requiere acceso a la red donde estén las bases de datos).
- Las credenciales se almacenan en `localStorage` sin cifrado; valora esto para entornos sensibles.
- Los drivers se importan dinámicamente en `connection.ts`.

---

## Contribuir

Si deseas contribuir, abre un issue o PR. Sigue las normas de estilo en el código y agrega tests cuando sea necesario.

---

## Licencia

Este proyecto está bajo la licencia **MIT** (ver `package.json`).

---

Si quieres, puedo añadir más secciones al README (ejemplos de credenciales, screenshots, pasos de debugging o instrucciones para CI).