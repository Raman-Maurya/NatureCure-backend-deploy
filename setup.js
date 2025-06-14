import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌿 HerbHeal Backend Setup');
console.log('========================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const templatePath = path.join(__dirname, 'config.template.env');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('\n⚠️  IMPORTANT: Please edit the .env file and configure:');
    console.log('   - PERPLEXITY_API_KEY (get from https://perplexity.ai)');
    console.log('   - JWT_SECRET (use a strong random string)');
    console.log('   - MONGODB_URI (if using a different database)\n');
  } else {
    console.log('❌ Template file not found. Creating basic .env file...');
    
    const basicEnv = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/herbheal

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_replace_with_actual_secret
JWT_EXPIRE=7d

# Perplexity AI Configuration
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/herbs

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
    
    fs.writeFileSync(envPath, basicEnv);
    console.log('✅ Basic .env file created!');
    console.log('\n⚠️  IMPORTANT: Please edit the .env file and configure your API keys!\n');
  }
} else {
  console.log('✅ .env file already exists!');
}

// Check if uploads directory exists
const uploadsPath = path.join(__dirname, 'uploads', 'herbs');
if (!fs.existsSync(uploadsPath)) {
  console.log('📁 Creating uploads directory...');
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Uploads directory created!');
} else {
  console.log('✅ Uploads directory already exists!');
}

console.log('\n🚀 Setup complete! Next steps:');
console.log('1. Edit the .env file with your API keys');
console.log('2. Make sure MongoDB is running');
console.log('3. Run: npm run seed (to populate herb database)');
console.log('4. Run: npm run dev (to start the server)');
console.log('\n💡 The backend will work in fallback mode without Perplexity API key!');
console.log('   You can test it immediately with the seeded herb database.\n'); 