# Fitness Tracker

## Getting Started

To run the application using Docker, follow these steps:

1. Clone the repository
2. Copy `.env.example` to a new file named `.env` and fill in your API keys
3. Run `docker-compose up --build`
4. The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8000`

# Fitness Tracker App

A 3-month health goals tracker for a small group of friends.

## Tech Stack
- Frontend: React + Vite
- Backend: FastAPI (Python)
- Database: Supabase
- AI: Google Gemini
- Container: Docker

## Getting Started

### Prerequisites
- Docker Desktop installed
- Git installed

### Setup
1. Clone the repo
   git clone https://github.com/CarlosJordan-AI/fitness-tracker.git
   cd fitness-tracker

2. Copy environment variables
   cp .env.example .env
   Fill in your values in .env

3. Run the app
   docker-compose up --build

4. Open your browser
   Frontend: http://localhost:3000
   Backend:  http://localhost:8000