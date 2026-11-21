// Миниатюра файла: лист с загнутым уголком и меткой типа; у фото — сама картинка в той же рамке.
const TONE = { PDF: '#e5484d', DOCX: '#4A90E2', DOC: '#4A90E2', TXT: '#2C3E50', RTF: '#2C3E50' };

export const extOf = (n) => ((n || '').split('.').pop() || '').slice(0, 4).toUpperCase();

export default function FileThumb({ name = '', src, size = 40 }) {
  const ext = extOf(name);
  if (src) return <img className="fthumb img" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  const tone = TONE[ext] || '#8b7cf6';
  return (
    <svg className="fthumb" width={size * 0.82} height={size} viewBox="0 0 33 40" aria-hidden>
      <path d="M3 1h19l10 10v26a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="var(--bg2)" stroke="var(--line2)" strokeWidth="1.5" />
      <path d="M22 1v8a2 2 0 0 0 2 2h8" fill="var(--hover)" stroke="var(--line2)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 16h14M7 20h18M7 24h11" stroke="var(--line2)" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="4" y="28" width={Math.max(18, ext.length * 6 + 6)} height="9" rx="2.5" fill={tone} />
      <text x={4 + Math.max(18, ext.length * 6 + 6) / 2} y="35" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fontWeight="700" fill="#fff">{ext || 'ФАЙЛ'}</text>
    </svg>
  );
}
