# DataLens AI – Automated EDA & Dataset Sanitizer

DataLens AI is a full-stack, AI-powered web application built using the MERN stack and a Python FastAPI analytics microservice. It enables users to upload datasets (CSV, Excel, JSON), automatically run Exploratory Data Analysis (EDA), detect anomalies (missing values, duplicates, outliers), view visual data distributions, generate natural-language report summaries using LangChain and the Gemini API, and sanitize the data with one-click operations.

---

## Technical Architecture

The application is structured as a decoupled microservices architecture:
1. **Frontend (React.js)**: A Vite-powered Single Page Application styled with a premium dark cybernetic theme and interactive charts built with Recharts.
2. **Backend (Node.js/Express)**: Manages JWT user authentication, file uploads via Multer, metadata storage in MongoDB, and coordinates tasks with the Python microservice.
3. **Python Service (FastAPI)**: Performs heavy computational data analysis using Pandas, NumPy, and OpenPyXL, and invokes LangChain/Gemini API for report generation.

---

## Setup & Running Instructions

### Prerequisites
- **Node.js** (v18 or higher; tested on v24)
- **Python** (v3.10 or higher; tested on v3.12)
- **MongoDB** (Local instance or MongoDB Atlas cluster connection string)
- **Groq API Key** (Required for the AI Insights tab)

---

### Step 1: Run the Python Analytics Service

1. Navigate to the `python-service/` directory:
   ```bash
   cd python-service
   ```
2. The virtual environment (`venv/`) is already created. Install the required dependencies:
   ```bash
   venv\Scripts\pip.exe install -r requirements.txt
   ```
3. Run the FastAPI ASGI server:
   ```bash
   venv\Scripts\python.exe run.py
   ```
   *The Python microservice will start running locally at `http://127.0.0.1:8000`.*

---

### Step 2: Configure and Start the Node.js Express Backend

1. Navigate to the `backend/` directory:
   ```bash
   cd ../backend
   ```
2. Dependencies are already installed. Configure your environment variables in `.env`:
   - Open `backend/.env`.
   - Paste your Groq API Key in `GROQ_API_KEY=your_groq_key_here`.
   - Update `MONGO_URI` if you are using an Atlas cluster instead of a local MongoDB.
3. Start the backend developer hot-reload server:
   ```bash
   npm run dev
   ```
   *The Express backend server will start running locally at `http://localhost:5000`.*

---

### Step 3: Start the React Frontend

1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be available at `http://localhost:5173`.*

---

## Core Features Walkthrough

1. **Authentication Gate**: Create a new account on the Register page, and sign in. JWT tokens are automatically stored in localStorage.
2. **Drag & Drop Upload**: Upload any dataset (like a CSV or Excel spreadsheet). The backend registers the upload and invokes the Python service.
3. **Interactive Preview Table**: Browse tabular rows in a scrollable preview table. Search for matching cells or review detected datatypes.
4. **Data Quality Audit**: View flagged warnings detailing duplicates count, missing percentage boundaries, and outliers computed via the IQR method.
5. **Interactive Analytics Charts**: Toggle between Pearson correlation grids and category densities.
6. **Groq AI Reports**: Click "AI Insights" to prompt Groq to compile a Markdown data audit containing actionable cleaning roadmaps.
7. **Dataset Sanitizer**: Choose which operations to execute (imputation with mean/median/mode, dropping duplicates, removing empty columns, standardizing timelines).
8. **Export Results**: Download the sanitized output directly as a CSV or Excel file.
