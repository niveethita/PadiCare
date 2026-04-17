async function generatePlan() {
  const crop = document.getElementById('crop').value;
  const landSize = document.getElementById('landSize').value;
  const water = document.getElementById('water').value;
  const budget = document.getElementById('budget').value;
  const experience = document.getElementById('experience').value;
  const loader = document.getElementById('loader');
  const resultBox = document.getElementById('resultBox');

  if (!landSize || !budget) {
    alert('Sila isi semua maklumat! / Please fill in all fields!');
    return;
  }

  loader.classList.add('show');
  resultBox.classList.remove('show');

  const prompt = `
You are an expert agricultural planner for Malaysian smallholder farmers.

Farm details:
- Crop: ${crop}
- Land size: ${landSize} acres
- Water access: ${water}
- Fertilizer budget: RM ${budget}
- Farmer experience: ${experience}

Respond ONLY in Bahasa Malaysia using this exact format:

🌱 PELAN PENANAMAN: ${crop.toUpperCase()} (${landSize} ekar)

📅 JADUAL MINGGUAN:
Minggu 1: [activity]
Minggu 2: [activity]
Minggu 3: [activity]
Minggu 4: [activity]
Minggu 5-8: [activity]
Minggu 9-12: [activity]

💧 PENGURUSAN AIR:
[2 specific tips based on their water access]

🧪 CADANGAN BAJA (Bajet: RM${budget}):
[3 specific fertilizer recommendations with approximate costs]

📈 ANGGARAN HASIL:
- Jangkaan Hasil: [X tan/ekar]
- Anggaran Pendapatan: RM [range]

⚠️ RISIKO & AMARAN:
[2 main risks for this crop in Malaysia]
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ralat: Tiada respons.';

    resultBox.innerHTML = text.replace(/\n/g, '<br/>');
    resultBox.classList.add('show');

  } catch (error) {
    resultBox.innerHTML = '❌ Ralat berlaku. Sila cuba lagi.';
    resultBox.classList.add('show');
  } finally {
    loader.classList.remove('show');
  }
}