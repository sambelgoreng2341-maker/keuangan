// Cloudflare Pages Function for /api/financial-insights
export const onRequestPost = async (context: { request: Request; env: Record<string, string> }) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as any;
    const { monthName, totalIncome, totalExpense, balance, budgets, topCategories } = body;

    const apiKey = env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `
Anda adalah penasihat keuangan pribadi berpengalaman untuk masyarakat Indonesia.
Berikan ringkasan analisis keuangan singkat, tajam, dan saran praktis untuk bulan ${monthName} dalam Bahasa Indonesia.

Data Keuangan Bulan Ini:
- Total Pemasukan: Rp ${Number(totalIncome || 0).toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${Number(totalExpense || 0).toLocaleString('id-ID')}
- Saldo Kas Bersih: Rp ${Number(balance || 0).toLocaleString('id-ID')}
- Pengeluaran Terbesar per Kategori: ${JSON.stringify(topCategories || [])}
- Status Anggaran Kategori: ${JSON.stringify(budgets || [])}

Keluarkan HANYA format JSON valid tanpa blok markdown:
{
  "financialScore": number (1 - 100),
  "healthStatus": "Sangat Sehat" | "Cukup Sehat" | "Waspada Pengeluaran" | "Defisit Berbahaya",
  "headline": "Kalimat ringkas tentang kondisi keuangan bulan ini",
  "insights": [
    "Poin analisis 1 (maksimal 25 kata)",
    "Poin analisis 2 (maksimal 25 kata)",
    "Poin analisis 3 (maksimal 25 kata)"
  ],
  "savingsRecommendation": "Saran konkrit alokasi tabungan",
  "riskAlert": "Peringatan pos pengeluaran rawan jika ada, atau 'Tidak ada risiko mendesak'"
}
`;
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = (await geminiRes.json()) as any;
          const textReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const match = textReply.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            return new Response(JSON.stringify({ success: true, data: parsed }), {
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (aiErr) {
        // Fallback to calculation below
      }
    }

    // Edge calculation fallback
    const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const score = Math.max(20, Math.min(95, Math.round(50 + savingRate * 0.5)));
    let status = 'Cukup Sehat';
    if (savingRate >= 30) status = 'Sangat Sehat';
    else if (savingRate < 0) status = 'Defisit Berbahaya';
    else if (savingRate < 15) status = 'Waspada Pengeluaran';

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          financialScore: score,
          healthStatus: status,
          headline:
            totalIncome === 0 && totalExpense === 0
              ? 'Belum ada transaksi di bulan ini. Catat pemasukan atau pengeluaran pertama Anda!'
              : savingRate >= 20
              ? `Arus kas surplus ${savingRate.toFixed(1)}%! Alokasi keuangan bulan ini terkendali.`
              : 'Pengeluaran mendekati pemasukan. Waspadai pengeluaran konsumtif.',
          insights: [
            `Pengeluaran bulanan Anda mencapai Rp ${Number(totalExpense || 0).toLocaleString('id-ID')}.`,
            totalIncome > 0
              ? `Rasio tabungan saat ini berada di kisaran ${Math.max(0, savingRate).toFixed(0)}% dari total pemasukan.`
              : 'Belum ada catatan pemasukan bulan ini.',
            topCategories && topCategories.length > 0
              ? `Pengeluaran terbesar tercatat pada kategori ${topCategories[0].name}.`
              : 'Pos pengeluaran terkonsentrasi pada kebutuhan harian.',
          ],
          savingsRecommendation: `Sisihkan minimal 10-20% (Rp ${((totalIncome || 0) * 0.15).toLocaleString('id-ID')}) di awal bulan ke pos tabungan.`,
          riskAlert:
            totalExpense > totalIncome
              ? 'Perhatian: Total pengeluaran melebihi pemasukan bulan ini!'
              : 'Tidak ada risiko darurat.',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
