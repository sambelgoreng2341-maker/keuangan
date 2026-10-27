// Realistic Indonesian store receipt SVGs converted into Data URLs

export const SAMPLE_RECEIPT_SUPERINDO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 620" width="400" height="620" style="background:#fcfbf7;font-family:'Courier New',Courier,monospace;color:#222;">
  <rect width="100%" height="100%" fill="#faf8f2" rx="8"/>
  <rect x="15" y="15" width="370" height="590" fill="#fff" stroke="#e5e5e0" stroke-width="1" rx="4"/>
  
  <!-- Header -->
  <text x="200" y="55" font-size="20" font-weight="bold" text-anchor="middle" fill="#15803d">SUPERINDO</text>
  <text x="200" y="75" font-size="11" text-anchor="middle" fill="#666">SUPER INDO DUREN TIGA</text>
  <text x="200" y="90" font-size="10" text-anchor="middle" fill="#888">Jl. Duren Tiga Raya No. 12, Jakarta Selatan</text>
  <text x="200" y="105" font-size="10" text-anchor="middle" fill="#888">NPWP: 01.345.678.9-012.000</text>
  
  <line x1="30" y1="120" x2="370" y2="120" stroke="#ccc" stroke-dasharray="4 4" stroke-width="1"/>
  
  <!-- Meta -->
  <text x="35" y="140" font-size="11">TGL : 03-10-2026 16:40</text>
  <text x="260" y="140" font-size="11">KASIR : RINA</text>
  <text x="35" y="158" font-size="11">STRUK: SI-884920194</text>
  <text x="260" y="158" font-size="11">POS   : 02</text>
  
  <line x1="30" y1="172" x2="370" y2="172" stroke="#ccc" stroke-dasharray="4 4" stroke-width="1"/>
  
  <!-- Items -->
  <text x="35" y="200" font-size="11" font-weight="bold">BERAS PANDAN WANGI 5KG</text>
  <text x="35" y="215" font-size="11" fill="#666">1 x 94.500</text>
  <text x="365" y="215" font-size="11" text-anchor="end">94.500</text>
  
  <text x="35" y="240" font-size="11" font-weight="bold">MINYAK GORENG TROPICAL 2L</text>
  <text x="35" y="255" font-size="11" fill="#666">2 x 38.500</text>
  <text x="365" y="255" font-size="11" text-anchor="end">77.000</text>
  
  <text x="35" y="280" font-size="11" font-weight="bold">DAGING SAPI RENDANG 1KG</text>
  <text x="35" y="295" font-size="11" fill="#666">1 x 135.000</text>
  <text x="365" y="295" font-size="11" text-anchor="end">135.000</text>

  <text x="35" y="320" font-size="11" font-weight="bold">TELUR AYAM NEGERI 1KG</text>
  <text x="35" y="335" font-size="11" fill="#666">2 x 31.000</text>
  <text x="365" y="335" font-size="11" text-anchor="end">62.000</text>

  <text x="35" y="360" font-size="11" font-weight="bold">SUSU ULTRA MILK PLAIN 1L</text>
  <text x="35" y="375" font-size="11" fill="#666">4 x 20.250</text>
  <text x="365" y="375" font-size="11" text-anchor="end">81.000</text>

  <text x="35" y="400" font-size="11" font-weight="bold">KEBUTUHAN LAIN &amp; BUAH FRESH</text>
  <text x="35" y="415" font-size="11" fill="#666">1 x 695.500</text>
  <text x="365" y="415" font-size="11" text-anchor="end">695.500</text>
  
  <line x1="30" y1="435" x2="370" y2="435" stroke="#ccc" stroke-dasharray="4 4" stroke-width="1"/>
  
  <!-- Totals -->
  <text x="35" y="460" font-size="12">TOTAL BELANJA :</text>
  <text x="365" y="460" font-size="14" font-weight="bold" text-anchor="end">Rp 1.145.000</text>
  
  <text x="35" y="485" font-size="11">METODE PEMBAYARAN :</text>
  <text x="365" y="485" font-size="11" font-weight="bold" text-anchor="end">QRIS (SUKSES)</text>
  
  <text x="35" y="505" font-size="11">REF NO: QRIS-99238471029</text>
  
  <line x1="30" y1="525" x2="370" y2="525" stroke="#ccc" stroke-dasharray="4 4" stroke-width="1"/>
  
  <!-- Footer -->
  <text x="200" y="555" font-size="11" text-anchor="middle" font-weight="bold">TERIMA KASIH ATAS KUNJUNGAN ANDA</text>
  <text x="200" y="572" font-size="10" text-anchor="middle" fill="#777">Barang yang sudah dibeli dapat ditukar 1x24 jam</text>
</svg>
`)}`;

export const SAMPLE_RECEIPT_KOPI_KENANGAN = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 500" width="380" height="500" style="background:#faf8f5;font-family:'Courier New',Courier,monospace;color:#222;">
  <rect width="100%" height="100%" fill="#f5f3ee" rx="8"/>
  <rect x="15" y="15" width="350" height="470" fill="#fff" stroke="#e0ded6" stroke-width="1" rx="4"/>
  
  <!-- Header -->
  <text x="190" y="55" font-size="18" font-weight="bold" text-anchor="middle" fill="#854d0e">KOPI KENANGAN</text>
  <text x="190" y="75" font-size="11" text-anchor="middle" fill="#555">OUTLET CHILLAX SUDIRMAN</text>
  <text x="190" y="92" font-size="10" text-anchor="middle" fill="#888">Order ID: #KK-20261008-042</text>
  
  <line x1="30" y1="110" x2="350" y2="110" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="35" y="132" font-size="11">Waktu: 08-10-2026 09:45</text>
  <text x="35" y="150" font-size="11">Kasir: Dika (Kasir 1)</text>
  
  <line x1="30" y1="165" x2="350" y2="165" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="35" y="195" font-size="11" font-weight="bold">1x Kopi Kenangan Mantan (L)</text>
  <text x="45" y="212" font-size="10" fill="#666">- Less Sugar, Normal Ice</text>
  <text x="345" y="212" font-size="11" text-anchor="end">24.000</text>
  
  <text x="35" y="240" font-size="11" font-weight="bold">1x Toast Cokelat Klasik</text>
  <text x="345" y="240" font-size="11" text-anchor="end">18.000</text>
  
  <line x1="30" y1="270" x2="350" y2="270" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="35" y="298" font-size="11">Subtotal:</text>
  <text x="345" y="298" font-size="11" text-anchor="end">42.000</text>
  
  <text x="35" y="320" font-size="11">PB1 (10%):</text>
  <text x="345" y="320" font-size="11" text-anchor="end">Termasuk</text>
  
  <text x="35" y="348" font-size="13" font-weight="bold">TOTAL PEMBAYARAN:</text>
  <text x="345" y="348" font-size="15" font-weight="bold" text-anchor="end" fill="#15803d">Rp 42.000</text>
  
  <text x="35" y="375" font-size="11">Metode: GoPay E-Wallet</text>
  <text x="35" y="392" font-size="10" fill="#777">ID Trx: GP-884920194829</text>
  
  <line x1="30" y1="415" x2="350" y2="415" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="190" y="445" font-size="11" text-anchor="middle" font-weight="bold">KENANGAN MANIS BERSAMA KAMI</text>
  <text x="190" y="462" font-size="9" text-anchor="middle" fill="#888">Follow Instagram @kopikenangan.id</text>
</svg>
`)}`;

export const SAMPLE_RECEIPT_BAKMI_GM = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 480" width="380" height="480" style="background:#faf8f5;font-family:'Courier New',Courier,monospace;color:#222;">
  <rect width="100%" height="100%" fill="#f4f1ea" rx="8"/>
  <rect x="15" y="15" width="350" height="450" fill="#fff" stroke="#dedbd2" stroke-width="1" rx="4"/>
  
  <text x="190" y="55" font-size="18" font-weight="bold" text-anchor="middle" fill="#b91c1c">BAKMI GM</text>
  <text x="190" y="75" font-size="11" text-anchor="middle" fill="#555">OUTLET SENAYAN CITY</text>
  <text x="190" y="92" font-size="10" text-anchor="middle" fill="#888">Table: 14 | Kasir: Cindy</text>
  
  <line x1="30" y1="108" x2="350" y2="108" stroke="#bbb" stroke-dasharray="3 3"/>
  <text x="35" y="128" font-size="11">Tanggal: 06-10-2026 12:30</text>
  <line x1="30" y1="140" x2="350" y2="140" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="35" y="170" font-size="11" font-weight="bold">1x Bakmi Spesial GM</text>
  <text x="345" y="170" font-size="11" text-anchor="end">42.000</text>
  
  <text x="35" y="200" font-size="11" font-weight="bold">1x Pangsit Goreng (isi 5)</text>
  <text x="345" y="200" font-size="11" text-anchor="end">23.000</text>
  
  <text x="35" y="230" font-size="11" font-weight="bold">1x Teh Botol Sosro Dingin</text>
  <text x="345" y="230" font-size="11" text-anchor="end">13.000</text>
  
  <line x1="30" y1="260" x2="350" y2="260" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="35" y="290" font-size="13" font-weight="bold">TOTAL BILL:</text>
  <text x="345" y="290" font-size="15" font-weight="bold" text-anchor="end">Rp 78.000</text>
  
  <text x="35" y="320" font-size="11">Bayar: QRIS Dinamis (LUNAS)</text>
  <text x="35" y="338" font-size="10" fill="#777">NMID: ID1020039281928</text>
  
  <line x1="30" y1="365" x2="350" y2="365" stroke="#bbb" stroke-dasharray="3 3"/>
  
  <text x="190" y="398" font-size="11" text-anchor="middle" font-weight="bold">TERIMA KASIH</text>
  <text x="190" y="415" font-size="10" text-anchor="middle" fill="#777">Semoga Hari Anda Menyenangkan!</text>
</svg>
`)}`;
