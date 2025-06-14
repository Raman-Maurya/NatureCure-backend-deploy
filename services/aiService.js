import axios from 'axios';
import fs from 'fs';
import path from 'path';

class AIService {
  constructor() {
    // Gemini configuration for herb identification
    this.geminiApiKey = "AIzaSyC60wbbc32g7OcuA0mgusySiOQhNa4nPf8" ;
    this.geminiBaseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    // Perplexity configuration for remedy generation
    this.perplexityApiKey = "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";
    this.perplexityBaseURL = 'https://api.perplexity.ai/chat/completions';
    this.perplexityModel = 'llama-3.1-sonar-large-128k-online'; // Premium Perplexity model
    
    console.log('✅ Gemini Vision API configured');
    console.log('✅ Perplexity API configured (Premium model)');
  }

  // Extract herb name from image using Gemini Vision
  async identifyHerb(imagePath, condition = null, userProfile = {}) {
    try {
      console.log('🌿 Identifying herb from image using Gemini...');
      
      // Convert image to base64 and create Data URL
      console.log('📁 Image path:', imagePath);
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      const base64 = await fs.promises.readFile(imagePath, { encoding: "base64" });
      const ext = path.extname(imagePath).slice(1).toLowerCase();
      
      // Normalize extension
      let mimeType = `image/${ext}`;
      if (ext === 'jpg') mimeType = 'image/jpeg';
      
      console.log('📷 Image info:', {
        extension: ext,
        mimeType: mimeType,
        base64Length: base64.length
      });

      // Enhanced prompt for herb identification
      const prompt = `Analyze this image and identify the herb, plant, or botanical item shown.

Please provide the response in this exact format:

HERB NAME: [Common name of the herb/plant]
SCIENTIFIC NAME: [Scientific/botanical name if recognizable]
CONFIDENCE: [Your confidence level from 1-100]
DESCRIPTION: [Brief description of what you see - color, form, parts visible]
AYURVEDIC PROPERTIES: [If known - rasa, virya, vipaka, prabhava]

Examples:
HERB NAME: Turmeric
SCIENTIFIC NAME: Curcuma longa
CONFIDENCE: 95
DESCRIPTION: Yellow-orange rhizome powder
AYURVEDIC PROPERTIES: Rasa: Tikta, Katu; Virya: Ushna; Vipaka: Katu

Focus on identifying medicinal herbs, spices, or plant materials commonly used in traditional medicine.`;

      // API call to Gemini Vision model
      console.log('🔗 Making API call to Gemini:', this.geminiBaseURL);
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      };
      
      console.log('📤 Request structure:', {
        model: 'gemini-1.5-flash',
        hasImage: true,
        promptLength: prompt.length
      });
      
      const response = await this.makeAPICallWithRetry(
        `${this.geminiBaseURL}?key=${this.geminiApiKey}`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      console.log('📨 API Response status:', response.status);
      
      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('No response text received from Gemini model');
      }
      
      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('🤖 AI Response:', aiResponse);
      console.log('📏 Response length:', aiResponse.length);

      // Extract herb information from response
      const herbInfo = this.extractHerbInfo(aiResponse);
      
      console.log(`✅ Identified herb: ${herbInfo.name.common}`);

      return {
        generatedId: herbInfo.generatedId,
        name: herbInfo.name,
        confidence: herbInfo.confidence,
        description: aiResponse,
        properties: herbInfo.properties,
        alternativeMatches: herbInfo.alternativeMatches || [],
        aiMetadata: {
          model: 'gemini-1.5-flash',
          service: 'gemini',
          tokens: {
            input: response.data.usage?.prompt_tokens || 0,
            output: response.data.usage?.completion_tokens || 0
          }
        }
      };

    } catch (error) {
      console.error('❌ Herb identification error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to identify herb: ${error.message}`);
    }
  }

  // Generate remedy using Perplexity Premium
  async generateRemedy(identifiedHerb, userProfile, condition) {
    try {
      console.log(`💊 Generating remedy using Perplexity for: ${identifiedHerb.name.common} to treat ${condition}`);

      const prompt = `As an expert in Ayurvedic medicine, create a comprehensive herbal remedy using ${identifiedHerb.name.common} ${identifiedHerb.name.scientific ? `(${identifiedHerb.name.scientific})` : ''} to treat ${condition}.

Patient Profile:
- Age: ${userProfile.age || 'Adult'}
- Gender: ${userProfile.gender || 'Not specified'}
- Constitution: ${userProfile.constitution || 'Not specified'}

Please provide a detailed remedy including:

1. **Primary Preparation Method:**
   - How to prepare the herb (decoction, powder, paste, etc.)
   - Exact quantities and measurements
   - Preparation steps

2. **Dosage & Administration:**
   - Recommended dosage
   - Frequency (how many times per day)
   - Best time to take (before/after meals, morning/evening)
   - Duration of treatment

3. **Adjuvants & Enhancers:**
   - Other herbs or substances to combine with
   - Carrier substances (honey, ghee, warm water, etc.)

4. **Dietary Recommendations:**
   - Foods to include that support the treatment
   - Foods to avoid during treatment

5. **Precautions & Contraindications:**
   - Who should avoid this remedy
   - Potential side effects
   - Drug interactions if any

6. **Expected Results:**
   - Timeline for improvement
   - Signs of effectiveness

Ensure the remedy follows traditional Ayurvedic principles and is safe for the specified age and gender. Include relevant Sanskrit terms where appropriate.`;

      const response = await this.makeAPICallWithRetry(this.perplexityBaseURL, {
        model: this.perplexityModel,
        messages: [
          {
            role: "system",
            content: "You are an experienced Ayurvedic practitioner with deep knowledge of traditional herbal medicine, herb preparation methods, and safe dosing practices. Provide accurate, safe, and traditional Ayurvedic guidance."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.2
      }, {
        headers: {
          Authorization: `Bearer ${this.perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000
      });

      const remedyText = response.data.choices[0].message.content;
      
      console.log('✅ Remedy generated successfully using Perplexity');

      // Parse the structured remedy response
      const parsedRemedy = this.parseRemedyResponse(remedyText, identifiedHerb);

      return {
        primary: parsedRemedy.primary,
        supportive: parsedRemedy.supportive,
        followUp: parsedRemedy.followUp,
        ayushCompliance: true,
        confidence: identifiedHerb.confidence,
        aiMetadata: {
          model: this.perplexityModel,
          service: 'perplexity',
          tokens: {
            input: response.data.usage?.prompt_tokens || 0,
            output: response.data.usage?.completion_tokens || 0
          }
        }
      };

    } catch (error) {
      console.error('❌ Remedy generation error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to generate remedy: ${error.message}`);
    }
  }

  // Extract herb information from AI response
  extractHerbInfo(response) {
    console.log('🔍 Extracting herb name from response...');
    
    let commonName = 'Unknown Herb';
    let scientificName = '';
    let confidence = 70;

    // Method 1: Look for "ITEM NAME:" or "HERB NAME:" pattern (from our structured prompt)
    const itemNameMatch = response.match(/(?:ITEM NAME|HERB NAME):\s*([^\n\r]+)/i);
    if (itemNameMatch) {
      commonName = itemNameMatch[1].trim();
      confidence = 85;
      console.log('✅ Found item name using structured pattern:', commonName);
    }

    // Method 2: Look for "SCIENTIFIC NAME:" pattern
    const scientificNameMatch = response.match(/SCIENTIFIC NAME:\s*([^\n\r]+)/i);
    if (scientificNameMatch) {
      scientificName = scientificNameMatch[1].trim();
    }

    // Method 3: Fallback - look for items mentioned in natural language
    if (commonName === 'Unknown Herb') {
      // Look for direct mentions like "jar of honey", "ginger root", "turmeric powder"
      const directMatches = [
        /(?:jar of |bottle of |container of )?([a-z]+)/i,
        /(?:this is |appears to be |looks like |identified as )([a-z\s]+)/i,
        /(?:see |seeing |image shows )([a-z\s]+)/i
      ];
      
      for (const pattern of directMatches) {
        const match = response.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          const candidate = match[1].trim();
          // Filter out common non-item words
          const excludeWords = ['the', 'an', 'a', 'this', 'that', 'image', 'picture', 'photo', 'not', 'rather', 'but', 'however'];
          if (!excludeWords.includes(candidate.toLowerCase())) {
            commonName = candidate;
            confidence = 75;
            console.log('✅ Found item name using natural language pattern:', commonName);
            break;
          }
        }
      }
    }
    
    // Method 4: Look for capitalized words that might be item names
    if (commonName === 'Unknown Herb') {
      const capitalizedWords = response.match(/\b[A-Z][a-z]+(?:\s+[a-z]+)?\b/g);
      if (capitalizedWords) {
        for (const word of capitalizedWords) {
          const excludeWords = ['Image', 'Please', 'However', 'Unfortunately', 'Description', 'Scientific', 'Name', 'Based', 'Looking'];
          if (!excludeWords.includes(word) && word.length > 3) {
            commonName = word;
            confidence = 65;
            console.log('✅ Found item name using capitalized word:', commonName);
            break;
          }
        }
      }
    }

    // Method 5: Look for scientific name patterns if not found
    if (!scientificName) {
      const scientificMatch = response.match(/scientific[^:]*:?\s*([A-Z][a-z]+\s+[a-z]+)/i) || 
                             response.match(/\(([A-Z][a-z]+\s+[a-z]+)\)/);
      if (scientificMatch) {
        scientificName = scientificMatch[1];
      }
    }

    // Clean up the extracted names - remove markdown, brackets, asterisks
    commonName = commonName.replace(/[\[\]]/g, '').replace(/\*+/g, '').replace(/^[:\-\s]+/, '').trim();
    scientificName = scientificName.replace(/[\[\]]/g, '').replace(/\*+/g, '').replace(/^[:\-\s]+/, '').trim();

    // Extract confidence from response if available
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1]);
    }

    // Extract Ayurvedic properties if available
    const propertiesMatch = response.match(/AYURVEDIC PROPERTIES:\s*([^\n\r]+)/i);
    const properties = propertiesMatch ? propertiesMatch[1].trim() : '';

    console.log(`📋 Extraction result: "${commonName}" (${scientificName}) - Confidence: ${confidence}%`);

    return {
      generatedId: commonName.toLowerCase().replace(/\s+/g, '-'),
      name: {
        common: commonName,
        scientific: scientificName,
        sanskrit: ''
      },
      confidence: confidence,
      properties: properties,
      alternativeMatches: []
    };
  }

  // Helper method to make API calls with retry logic
  async makeAPICallWithRetry(url, data, config, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 API Call attempt ${attempt}/${maxRetries}`);
        const response = await axios.post(url, data, config);
        console.log(`✅ API Call successful on attempt ${attempt}`);
        return response;
      } catch (error) {
        console.log(`❌ API Call failed on attempt ${attempt}:`, error.response?.status, error.message);
        
        // If it's a rate limit error (429) or server error (5xx), retry
        if (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status < 600)) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If it's the last attempt or a non-retryable error, throw
        throw error;
      }
    }
  }

  // Parse structured remedy response from Perplexity
  parseRemedyResponse(remedyText, identifiedHerb) {
    try {
      // For now, return the full remedy text as primary instructions
      // You can enhance this to parse different sections later
      return {
        primary: {
          instructions: remedyText,
          herbs: [{
            name: identifiedHerb.name.common,
            description: identifiedHerb.description || '',
            properties: identifiedHerb.properties || ''
          }]
        },
        supportive: {
          lifestyle: '',
          diet: '',
          yoga: ''
        },
        followUp: {
          duration: '2-4 weeks',
          monitoring: 'Monitor symptoms and adjust as needed',
          nextSteps: 'Consult an Ayurvedic practitioner if symptoms persist'
        }
      };
    } catch (error) {
      console.error('Error parsing remedy response:', error);
      return {
        primary: {
          instructions: remedyText,
          herbs: [{
            name: identifiedHerb.name.common,
            description: ''
          }]
        },
        supportive: {},
        followUp: {}
      };
    }
  }

  // Cleanup method for uploaded files
  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log('🗑️ Cleaned up uploaded file');
      }
    } catch (error) {
      console.error('Failed to cleanup file:', error.message);
    }
  }

  // Translate remedy text to different languages
  async translateRemedy(remedyText, targetLanguage) {
    try {
      console.log(`🌐 Translating remedy to ${targetLanguage}...`);

      const languageNames = {
        'hi': 'Hindi (हिंदी)',
        'ta': 'Tamil (தமிழ்)',
        'te': 'Telugu (తెలుగు)',
        'bn': 'Bengali (বাংলা)',
        'mr': 'Marathi (मराठी)',
        'en': 'English'
      };

      // If it's already English, return as is
      if (targetLanguage === 'en') {
        return remedyText;
      }

      const targetLangName = languageNames[targetLanguage] || targetLanguage;
      
      const prompt = `Translate the following Ayurvedic remedy text into ${targetLangName}. 
Keep all the medical terms accurate and maintain the cultural context of Ayurveda. 
Make sure the translation is clear and easy to understand for native speakers.

Original text:
${remedyText}

Translated text in ${targetLangName}:`;

      const response = await this.makeAPICallWithRetry(this.perplexityBaseURL, {
        model: this.perplexityModel,
        messages: [
          {
            role: "system",
            content: "You are an expert translator specializing in medical and Ayurvedic texts. Provide accurate translations that maintain the technical and cultural nuances of the original text."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.1
      }, {
        headers: {
          Authorization: `Bearer ${this.perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000
      });

      const translatedText = response.data.choices[0].message.content;
      console.log(`✅ Translation completed for ${targetLanguage}`);
      
      return translatedText;

    } catch (error) {
      console.error(`❌ Translation error for ${targetLanguage}:`, error.message);
      throw new Error(`Failed to translate to ${targetLanguage}: ${error.message}`);
    }
  }
}

export default new AIService(); 