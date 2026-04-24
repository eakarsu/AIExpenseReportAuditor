#!/bin/bash

echo "============================================"
echo "  AI Expense Report Auditor - Starting..."
echo "============================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo -e "${YELLOW}Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
sleep 1

# Check PostgreSQL
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}PostgreSQL not found. Please install it.${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo -e "${RED}Could not start PostgreSQL. Please start it manually.${NC}"
    exit 1
  }
  sleep 2
fi

# Create database and user if not exists
echo -e "${YELLOW}Setting up database...${NC}"
psql postgres -c "CREATE USER expense_user WITH PASSWORD 'expense_pass';" 2>/dev/null
psql postgres -c "ALTER USER expense_user CREATEDB;" 2>/dev/null
psql postgres -c "CREATE DATABASE expense_auditor OWNER expense_user;" 2>/dev/null
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE expense_auditor TO expense_user;" 2>/dev/null

# Install dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
npm install --silent

echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd client && npm install --silent && cd ..

# Seed database
echo -e "${YELLOW}Seeding database...${NC}"
node server/seeds/seed.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Database seeded successfully!${NC}"
else
  echo -e "${RED}Database seed failed. Check your PostgreSQL connection.${NC}"
  exit 1
fi

# Start application with hot reload
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Starting AI Expense Report Auditor${NC}"
echo -e "${GREEN}  Backend:  http://localhost:$BACKEND_PORT${NC}"
echo -e "${GREEN}  Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Demo Login: admin@company.com / password123${NC}"
echo ""

# Start with hot reload using concurrently
npx concurrently \
  --names "API,WEB" \
  --prefix-colors "blue,green" \
  "npx nodemon --watch server server/index.js" \
  "cd client && npx vite --port $FRONTEND_PORT --host"
