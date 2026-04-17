// Show image preview when file selected
document.getElementById('imageInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const preview = document.getElementById('imagePreview');
    preview.src = event.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

async function analyzeImage() {
  const fileInput = document.getElementById('imageInput');
  const cropType = document.getElementById('cropType').value;
  const loader = document.getElementById('loader');
  const resultBox = document.getElementById('resultBox');

  if (!fileInput.files[0]) {
    alert('Sila muat naik gambar dahulu! / Please upload an image first!');
    return;
  }

  // Show loader, hide result
  loader.classList.add('show');
  resultBox.classList.remove('show');
  resultBox.innerHTML = '';

  // Convert image to base64
  const base64Image = await toBase64(fileInput.files[0]);
  const mimeType = fileInput.files[0].type;

  const prompt = `
You are an expert agricultural AI assistant for Malaysian smallholder farmers.
Analyze this image of a ${cropType} crop.

Respond ONLY in this format (in Bahasa Malaysia):

🌿 NAMA PENYAKIT: [disease name or "Tiada penyakit dikesan"]
⚠️ TAHAP KEPARAHAN: [Ringan / Sederhana / Teruk]
📋 SIMPTOM: [2-3 bullet points describing what you see]
💊 RAWATAN: [2-3 practical treatment steps]
🛡️ PENCEGAHAN: [1-2 prevention tips]

If the image is not a crop or leaf, say: "Gambar tidak jelas. Sila muat naik gambar daun atau tanaman yang lebih jelas."
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              },
              { text: prompt }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ralat: Tiada respons.';

    // Determine badge color from severity keyword
    let badge = '';
    if (text.includes('Ringan')) badge = '<span class="badge badge-green">🟢 Ringan</span>';
    else if (text.includes('Sederhana')) badge = '<span class="badge badge-yellow">🟡 Sederhana</span>';
    else if (text.includes('Teruk')) badge = '<span class="badge badge-red">🔴 Teruk</span>';

    resultBox.innerHTML = badge + '<br/><br/>' + text.replace(/\n/g, '<br/>');
    resultBox.classList.add('show');

  } catch (error) {
    resultBox.innerHTML = '❌ Ralat berlaku. Sila cuba lagi. / Error occurred. Please try again.';
    resultBox.classList.add('show');
  } finally {
    loader.classList.remove('show');
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}