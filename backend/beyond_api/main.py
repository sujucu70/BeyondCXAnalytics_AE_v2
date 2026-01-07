import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# importa tus routers
from beyond_api.api.analysis import router as analysis_router
from beyond_api.api.auth import router as auth_router   # 👈 nuevo

def setup_basic_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

setup_basic_logging()

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(auth_router)  # 👈 registrar el router de auth
