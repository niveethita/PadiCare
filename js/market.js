// FAMA-based realistic price data (update these manually each day of hackathon)
const marketData = [
  { name: "Padi (GKP)",     price: 1.20, change: +0.05, trend: "up" },
  { name: "Jagung Manis",   price: 2.80, change: -0.10, trend: "down" },
  { name: "Cili Merah",     price: 8.50, change: +0.30, trend: "up" },
  { name: "Bayam Hijau",    price: 2.10, change:  0.00, trend: "stable" },
  { name: "Kangkung",       price: 1.80, change: -0.05, trend: "down" },
  { name: "Timun",          price: 2.40, change: +0.10, trend: "up" },
  { name: "Tomato",         price: 4.20, change: -0.20, trend: "down" },
  { name: "Bendi",          price: 3.10, change:  0.00, trend: "stable" },
];

// Set update date
document.getElementById('updateDate').textContent = new Date().toLocaleDateString('ms-MY', {
  day: 'numeric', month: 'long', year: 'numeric'
});

// Render table
const tbody = document.getElementById('priceTableBody');
const cropSelect = document.getElementById('selectedCrop');

marketData.forEach(item => {
  // Table row
  const trendSymbol = item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●';
  const trendClass = `trend-${item.trend}`;
  const changeStr = item.change > 0 ? `+${item.change.toFixed(2)}` : item.change.toFixed(2);

  tbody.innerHTML += `
    <tr>
      <td>${item.name}</td>
      <td><strong>RM ${item.price.toFixed(2)}</strong></td>
      <td>${changeStr}</td>
      <td class="${trendClass}">${trendSymbol} ${item.trend === 'up' ? 'Naik' : item.trend === 'down' ? 'Turun' : 'Stabil'}</td>
    </tr>
  `;

  // Dropdown option
  cropSelect.innerHTML += `<option value="${item.name}">${item.name} — RM ${item.price.toFixed(2)}/kg</option>`;
});

async function getRecommendation() {
  const crop = document.getElementById('selectedCrop').value;
  const loader = document.getElementById('loader');
  const resultBox = document.getElementById('resultBox');

  if (!crop) { alert('Sila pilih tanaman!'); return; }

  const cropInfo = marketData.find(d => d.name === crop);
  loader.classList.add('show');
  resultBox.classList.remove('show');

  const prompt = `
You are a market advisor for Malaysian smallholder farmers.

Current data for ${crop}:
- Price: RM ${cropInfo.price}/kg
- Recent change: ${cropInfo.change > 0 ? '+' : ''}${cropInfo.change} (${cropInfo.trend})

Respond in Bahasa Malaysia using this format:

📊 ANALISIS PASARAN: ${crop}

💰 STATUS HARGA: [Good time to sell / Wait / Sell urgently — with brief reason]

📅 CADANGAN MASA JUAL: [Specific advice: sell now, wait X weeks, etc.]

🎯 STRATEGI PEMASARAN:
[2-3 practical tips on where and how to sell in Malaysia — mention Pasar Tani, FAMA, online platforms]

⚡ AMARAN: [Any risk or thing to watch out for]
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ralat.';
    resultBox.innerHTML = text.replace(/\n/g, '<br/>');
    resultBox.classList.add('show');
  } catch {
    resultBox.innerHTML = '❌ Ralat berlaku. Cuba lagi.';
    resultBox.classList.add('show');
  } finally {
    loader.classList.remove('show');
  }
}