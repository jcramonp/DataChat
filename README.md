# DataChat 🗄️🤖

Chatbot que permite consultar datos de **MySQL** o **Excel** con lenguaje natural (ES/EN).  
Convierte preguntas en SQL o comandos Pandas, ejecuta y devuelve **respuesta + tabla + query generado**.

---

## 📦 Estructura del proyecto

modeloIADataChat/
├─ backend/ # API en FastAPI (app_min.py)
├─ frontend/ # UI en React + Vite
└─ mysql_demo/ # DB de prueba con Docker

---

## ⚙️ Requisitos

- **Docker Desktop** (con WSL2 en Windows)  
- **Python 3.10+** (recomendado 3.11)  
- **Node.js 18+** y **npm**  

---

## 🔑 Variables de entorno

### Backend → `backend/.env`
Copia desde `backend/.env.example`:
ini
OPENAI_API_KEY=sk-xxxxxx
JWT_SECRET=dev
Frontend → frontend/.env
Copia desde frontend/.env.example:

ini
VITE_API_URL=http://127.0.0.1:8000

##🐬 MySQL Demo
La carpeta mysql_demo/ incluye un docker-compose.yml y mysql-init/01_init.sql que crea la base empresa_demo con datos de ejemplo.

Levantar la DB
bash
cd mysql_demo
docker compose up -d
# espera ~20-40s hasta healthy
docker ps
Credenciales:

Host: localhost

Port: 3306

DB: empresa_demo

User: app

Pass: app

URL SQLAlchemy (para backend/frontend):

bash
mysql+pymysql://app:app@localhost:3306/empresa_demo
🖥️ Backend (FastAPI)
Crear venv e instalar dependencias:

bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
Levantar API:

bash
uvicorn app_min:app --reload
# http://127.0.0.1:8000/docs
Probar en Swagger:

Ir a /docs

Authorize → Bearer <JWT>

Probar POST /chat

Ejemplo body:

json
{
  "question": "¿Cuántos empleados hay en la sede 2?",
  "datasource": {
    "type": "mysql",
    "sqlalchemy_url": "mysql+pymysql://app:app@localhost:3306/empresa_demo"
  },
  "options": { "language": "es", "max_rows": 200 }
}
🌐 Frontend (React + Vite)
Instalar dependencias:

bash
cd frontend
npm install
Levantar en dev:

bash
npm run dev
# http://localhost:5173
Uso de la UI (ruta /main)
En panel Connection:

Pega tu JWT

Selecciona MySQL o Excel

Si MySQL → mysql+pymysql://app:app@localhost:3306/empresa_demo

Idioma: es o en

Escribe una pregunta natural (ej: ¿Cuántos empleados hay en IT?)

Verás:

Texto de respuesta

Query SQL/Pandas generado

Tabla con resultados

🧪 Ejemplos de preguntas
¿Cuántos empleados hay en la sede 2?

¿Cuántos empleados hay en IT?

Empleados por sede

Salario promedio por departamento

How many employees joined this year?

🧯 Problemas comunes
404 /query → el cliente debe llamar a /chat.

401 Unauthorized → revisa tu JWT vs JWT_SECRET.

500 PyMySQL (caching_sha2_password) → instala cryptography:

bash
pip install -U pymysql cryptography
Docker no arranca → revisa Docker Desktop + WSL2, prueba docker run hello-world.
