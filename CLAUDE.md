# CLAUDE.md - Beyond CX Analytics

## Project Overview

Beyond CX Analytics is a Contact Center Analytics Platform that analyzes operational data and provides AI-assisted insights. The application processes CSV data from contact centers to generate volumetry analysis, performance metrics, CSAT scores, economic models, and automation readiness scoring.

## Tech Stack

**Frontend:** React 19 + TypeScript + Vite
**Backend:** Python 3.11 + FastAPI
**Infrastructure:** Docker Compose + Nginx
**Charts:** Recharts
**UI Components:** Radix UI + Lucide React
**Data Processing:** Pandas, NumPy
**AI Integration:** OpenAI API

## Project Structure

```
BeyondCXAnalytics_AE/
├── backend/
│   ├── beyond_api/        # FastAPI REST API
│   ├── beyond_metrics/    # Core metrics calculation library
│   ├── beyond_flows/      # AI agents and scoring engines
│   └── tests/             # pytest test suite
├── frontend/
│   ├── components/        # React components
│   ├── utils/             # Utility functions and API client
│   └── styles/            # CSS and color definitions
├── nginx/                 # Reverse proxy configuration
└── docker-compose.yml     # Service orchestration
```

## Common Commands

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run preview          # Preview production build
```

### Backend
```bash
cd backend
pip install .            # Install from pyproject.toml
python -m pytest tests/  # Run tests
uvicorn beyond_api.main:app --reload  # Start dev server
```

### Docker
```bash
docker compose build     # Build all services
docker compose up -d     # Start all services
docker compose down      # Stop all services
docker compose logs -f   # Stream logs
```

### Deployment
```bash
./deploy.sh              # Redeploy containers
sudo ./install_beyond.sh # Full server installation
```

## Key Entry Points

| Component | File |
|-----------|------|
| Frontend App | `frontend/App.tsx` |
| Backend API | `backend/beyond_api/main.py` |
| Main Endpoint | `POST /analysis` |
| Metrics Engine | `backend/beyond_metrics/agent.py` |
| AI Agents | `backend/beyond_flows/agents/` |

## Architecture

- **4 Analytics Dimensions:** Volumetry, Operational Performance, Satisfaction/Experience, Economy/Cost
- **Data Flow:** CSV Upload → FastAPI → Metrics Pipeline → AI Agents → JSON Response → React Dashboard
- **Authentication:** Basic Auth middleware

## Code Style Notes

- Documentation and comments are in **Spanish**
- Follow existing patterns when adding new components
- Frontend uses functional components with hooks
- Backend follows FastAPI conventions with Pydantic models

## Git Workflow

- **Main branch:** `main`
- **Development branch:** `desarrollo`
- Create feature branches from `desarrollo`

## Environment Variables

Backend expects:
- `OPENAI_API_KEY` - For AI-powered analysis
- `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` - API authentication

Frontend expects:
- `VITE_API_BASE_URL` - API endpoint (default: `/api`)
