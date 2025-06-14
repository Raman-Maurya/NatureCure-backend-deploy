# HerbHeal Backend

Simple and reliable AI-powered Ayurvedic herb identification using Llama Vision.

## 🚀 Zero Configuration Setup

**Llama API Key Hardcoded ✅** - No environment variables, no API keys to configure. Just install and run!

## ✅ Ready to Use

**The Llama Vision API key is already hardcoded in the system.** Simple, fast, and accurate herb identification!

## How It Works

1. **🌿 Direct Herb Identification**: Upload an image → Llama Vision 11B identifies the herb immediately
2. **💊 Targeted Remedy Search**: Uses the identified herb name to generate specific Ayurvedic remedies

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **AI**: Llama 3.2 11B Vision Instruct (via OpenRouter) - Lightweight and fast
- **Security**: Helmet, CORS, Rate limiting
- **File Processing**: Multer + Sharp
- **Authentication**: JWT

## Features

- ✅ **Fast Vision Processing**: Llama 11B Vision model for quick herb identification
- ✅ **Direct Image Analysis**: Converts images to base64 for immediate processing
- ✅ **Simple Text Extraction**: Extracts herb names from natural language responses
- ✅ **Auto File Cleanup**: Automatically removes uploaded files after processing
- ✅ **Reliable Error Handling**: Always provides a response, even with partial results
- ✅ **Two-Step Process**: Identify herb → Generate remedy (clean and simple)

## Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd herbheal-backend
   npm install
   ```

2. **Set up MongoDB:**
   ```bash
   # Make sure MongoDB is running
   # Default connection: mongodb://localhost:27017/herbheal
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

4. **Verify it's working:**
   ```bash
   curl http://localhost:5000/api/health
   ```

That's it! The system is ready to identify herbs and generate remedies.

## API Endpoints

### Generate Remedy
- **POST** `/api/remedies/generate`
- **Body**: FormData with image file, condition, and user profile
- **Response**: Identified herb and personalized remedy

### Health Check
- **GET** `/api/health`
- **Response**: Server status

## Environment Variables

All required environment variables are listed in `config.template.env`. The most critical one is:

- `PERPLEXITY_API_KEY`: Your Perplexity AI API key (REQUIRED)

## No Mock Data

This system contains **NO mock or fallback data**. All herb identification and remedy generation is performed by AI. If the API key is not configured, the system will not work.

## Support

For issues or questions, please check:
1. Ensure your Perplexity API key is correctly configured
2. Verify MongoDB connection
3. Check the server logs for any error messages 