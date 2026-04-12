#!/bin/bash

# Configuration
BE_DIR="sav-backend"
FE_DIR="sav-frontend"
BE_PORT=8000
FE_PORT=4200
BE_URL="http://127.0.0.1:$BE_PORT"
FE_URL="http://localhost:$FE_PORT"

# Clean up existing processes on these ports
echo "🧹 Cleaning up existing processes on ports $BE_PORT and $FE_PORT..."
lsof -ti :$BE_PORT | xargs kill -9 2>/dev/null
lsof -ti :$FE_PORT | xargs kill -9 2>/dev/null

# Stats / Info

echo "===================================================="
echo "🌟 STARTING SAV DEVELOPMENT PLATFORM"
echo "===================================================="
echo "📍 Backend:  $BE_URL  (Dir: $BE_DIR)"
echo "📍 Frontend: $FE_URL (Dir: $FE_DIR)"
echo "----------------------------------------------------"
echo "💡 Press Cmd+C to terminate both servers."
echo "===================================================="
echo ""

# Check for virtual environment
if [ -f "$BE_DIR/venv/bin/python3" ]; then
    PYTHON_CMD="./venv/bin/python3"
else
    PYTHON_CMD="python3"
fi

# Run concurrently
# -y ensures npx doesn't prompt for installation
npx -y concurrently -k -p "[{name}]" -n "BACKEND,FRONTEND" -c "cyan.bold,green.bold" \
    "cd $BE_DIR && $PYTHON_CMD manage.py runserver" \
    "cd $FE_DIR && npm start"

