const { VertexAI } = require('@google-cloud/vertexai');

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

async function generateContent(prompt) {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 800 },
  });
  return result.response.candidates[0].content.parts[0].text;
}

async function generateContentWithImage(prompt, imageBase64, mimeType = 'image/jpeg') {
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: { maxOutputTokens: 800 },
  });
  return result.response.candidates[0].content.parts[0].text;
}

module.exports = { generateContent, generateContentWithImage };