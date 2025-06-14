@echo off
echo 🌿 Starting HerbHeal Backend Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy "env.example" ".env"
    echo ⚠️  Please edit .env file with your configuration before running the server again.
    echo.
    echo Required configuration:
    echo - PERPLEXITY_API_KEY=your-perplexity-api-key
    echo - JWT_SECRET=your-secret-key
    echo - MONGODB_URI=your-mongodb-connection-string
    echo.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the server
echo 🚀 Starting server on http://localhost:5000
echo 📊 Health check: http://localhost:5000/api/health
echo 📖 API Documentation: See README.md
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev 