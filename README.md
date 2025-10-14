# 🗄️🤖 DataChat

**DataChat** es un chatbot que permite consultar datos desde **MySQL** o **Excel** usando lenguaje natural (**ES/EN**).  
Convierte tus preguntas en **consultas SQL o comandos Pandas**, ejecuta los resultados y muestra:
- 🧠 La **respuesta generada**
- 💾 La **query SQL/Pandas**
- 📊 La **tabla resultante**

---

## 📁 Estructura del Proyecto

```bash
modeloIADataChat/
├─ backend/        # API en FastAPI (app_min.py)
├─ frontend/       # UI en React + Vite
└─ mysql_demo/     # Base de datos de prueba (Docker)
```

---

## ⚙️ Requisitos

| Componente | Versión recomendada |
|-------------|---------------------|
| 🐳 Docker Desktop | con WSL2 (Windows) |
| 🐍 Python | 3.10+ (ideal: 3.11) |
| 🟢 Node.js | 18+ |
| 📦 npm | incluido con Node |

---

## 🔑 Variables de Entorno

### 🔹 Backend → `backend/.env`

Copia el archivo de ejemplo:

```bash
cp backend/.env.example backend/.env
```

Ejemplo de contenido:

```ini
OPENAI_API_KEY=sk-xxxxxx
JWT_SECRET=dev
```

---

### 🔹 Frontend → `frontend/.env`

Copia también el archivo de ejemplo:

```bash
cp frontend/.env.example frontend/.env
```

Ejemplo:

```ini
VITE_API_URL=http://127.0.0.1:8000
```

---

## 🐬 Base de Datos de Ejemplo (MySQL Demo)

La carpeta `mysql_demo/` incluye un entorno Docker con una base llamada **empresa_demo**.

### 🔧 Levantar la DB

```bash
cd mysql_demo
docker compose up -d
# espera ~20-40s hasta que esté healthy
docker ps
```

**Credenciales:**

| Parámetro | Valor |
|------------|--------|
| Host | `localhost` |
| Port | `3306` |
| DB | `empresa_demo` |
| User | `app` |
| Pass | `app` |

**URL para SQLAlchemy:**

```bash
mysql+pymysql://app:app@localhost:3306/empresa_demo
```

---

## 🖥️ Backend (FastAPI)

### Crear entorno virtual

```bash
cd backend
python -m venv venv

# Activar entorno
# Windows
venv\Scripts\activate
# Linux / Mac
source venv/bin/activate
```

### Instalar dependencias

```bash
pip install -r requirements.txt
```

### Ejecutar la API

```bash
uvicorn app_min:app --reload
# http://127.0.0.1:8000/docs
```

### Probar en Swagger

1. Ir a `/docs`
2. Hacer clic en **Authorize** → ingresar tu **Bearer <JWT>**
3. Probar el endpoint **POST /chat**

**Ejemplo de body:**

```json
{
  "question": "¿Cuántos empleados hay en la sede 2?",
  "datasource": {
    "type": "mysql",
    "sqlalchemy_url": "mysql+pymysql://app:app@localhost:3306/empresa_demo"
  },
  "options": {
    "language": "es",
    "max_rows": 200
  }
}
```

---

## 🌐 Frontend (React + Vite)

### Instalar dependencias

```bash
cd frontend
npm install
```

### Ejecutar en modo desarrollo

```bash
npm run dev
# http://localhost:5173
```

---

## 💬 Uso de la Interfaz

Ruta principal: `/main`

1. En el panel **Connection**:
   - Pega tu **JWT**
   - Selecciona la fuente: **MySQL** o **Excel**
   - Si es MySQL, usa:  
     `mysql+pymysql://app:app@localhost:3306/empresa_demo`
   - Elige idioma: `es` o `en`

2. En el chat:
   - Escribe una pregunta natural (por ejemplo: _“¿Cuántos empleados hay en IT?”_)

3. Verás en pantalla:
   - La **respuesta textual**
   - El **código SQL/Pandas** generado
   - La **tabla** con los resultados

---

## 🧪 Ejemplos de Preguntas

| Español | Inglés |
|----------|---------|
| ¿Cuántos empleados hay en la sede 2? | How many employees are in branch 2? |
| ¿Cuántos empleados hay en IT? | How many employees are in IT? |
| Empleados por sede | Employees by branch |
| Salario promedio por departamento | Average salary by department |
| — | How many employees joined this year? |

---

## 🧯 Problemas Comunes

| Error | Causa / Solución |
|-------|------------------|
| ❌ 404 `/query` | El cliente debe llamar al endpoint correcto `/chat`. |
| 🔒 401 Unauthorized | Verifica tu **JWT** vs `JWT_SECRET`. |
| ⚙️ 500 PyMySQL (caching_sha2_password) | Instala cryptography: `pip install -U pymysql cryptography`. |
| 🐳 Docker no arranca | Asegúrate de que **Docker Desktop + WSL2** estén corriendo. Prueba `docker run hello-world`. |

---

## 🚀 Próximas Extensiones

- 🎙️ **Voice Commands**: consulta por voz con reconocimiento automático (Whisper / Web Speech API).  
- 🧩 **Soporte multifuente**: conexión a múltiples datasets guardados.  
- 📈 **Visualizaciones dinámicas**: gráficos automáticos según tipo de dato.

---

## 🧠 Autores

Desarrollado por **Nicolás Saldarriaga** y equipo.  
Proyecto académico / experimental orientado a **IA aplicada al análisis de datos**.

---

## 📜 Licencia

MIT © 2025 — _DataChat Project_
