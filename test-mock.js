import AIService from './services/aiService.js';
import fs from 'fs';
import path from 'path';

async function testMockData() {
  console.log('🧪 Testing mock data system...');
  
  // Create test files
  const testFiles = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'];
  const expectedHerbs = ['Honey', 'Ginger', 'Turmeric', 'Ashwagandha', 'Liquorice'];
  
  for (let i = 0; i < testFiles.length; i++) {
    const filename = testFiles[i];
    const expected = expectedHerbs[i];
    
    try {
      // Create temporary test file
      fs.writeFileSync(filename, 'test-image-data');
      
      // Test identification
      const result = await AIService.identifyHerb(filename);
      console.log(`📁 ${filename} -> ${result.name.common} (Expected: ${expected})`);
      
      if (result.name.common === expected) {
        console.log('✅ PASS');
      } else {
        console.log('❌ FAIL');
      }
      
      // Cleanup
      fs.unlinkSync(filename);
      
    } catch (error) {
      console.error(`❌ Error testing ${filename}:`, error.message);
      // Cleanup on error
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
      }
    }
  }
  
  console.log('🏁 Mock data test complete!');
}

testMockData().catch(console.error); 