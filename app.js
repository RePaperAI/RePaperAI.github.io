// Thin browser UI layer. Image analysis runs in scanner.py through Flask.
const $ = id => document.getElementById(id);
let hasScan = false;

function recommend(blank) {
  const sizes = { scratch: '8.5 x 11 in (Letter) or A4', memo: '3 x 3 or 4 x 6 in', flashcards: '3 x 5 or 4 x 6 in', sticky: '3 in x 3 in' };
  const labels = { scratch: 'scratch sheets', memo: 'memo sheets', flashcards: 'flashcards', sticky: 'sticky notes' };
  const demand = [...document.querySelectorAll('[data-demand]')].map(input => ({ name: input.dataset.demand, value: Number(input.value), size: sizes[input.dataset.demand] })).sort((a, b) => b.value - a.value)[0];
  const enough = blank >= 20;
  $('decision').textContent = enough ? 'Reuse recommended' : 'Recycle recommended';
  $('recommendation').textContent = enough ? `Cut into ${labels[demand.name]}` : 'Send to recycling';
  $('recommendationCopy').textContent = enough ? `Best match for today's highest demand: ${demand.name} · typical size ${demand.size}.` : 'There is not enough usable area to justify cutting waste.';
  $('pieceCount').textContent = enough ? Math.max(1, Math.floor(blank / 28)) : 0; $('recovered').textContent = enough ? `${blank}%` : '0%'; $('waste').textContent = enough ? `${Math.max(4, 100 - blank - 20)}%` : '0%';
  $('processed').textContent = '129'; $('reused').textContent = enough ? '87' : '86'; $('diverted').textContent = enough ? '68%' : '67%';
}

function showResult(result) {
  hasScan = true; $('blankStat').textContent = `${result.blank}%`; $('printedStat').textContent = `${result.printed}%`; $('damageStat').textContent = `${result.damage}%`;
  $('confidence').textContent = `${result.confidence}% confidence · ${result.type}`; $('meterFill').style.width = `${result.blank}%`; recommend(result.blank);
}

async function acceptFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return $('confidence').textContent = 'Please choose an image file';
  if (file.size > 10 * 1024 * 1024) return $('confidence').textContent = 'Please choose an image under 10 MB';
  const source = URL.createObjectURL(file);
  $('preview').src = source; $('preview').hidden = false; $('dropContent').hidden = true; $('analysis').classList.remove('hidden'); $('confidence').textContent = 'Analyzing with Python...';
  const body = new FormData(); body.append('image', file, file.name || 'scan.jpg');
  body.append('demand', JSON.stringify(Object.fromEntries([...document.querySelectorAll('[data-demand]')].map(input => [input.dataset.demand, Number(input.value)]))));
  try {
    const apiUrl = location.port === '5000' ? '/api/analyze' : 'http://127.0.0.1:5000/api/analyze';
    const response = await fetch(apiUrl, { method: 'POST', body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Scanner returned ${response.status}`);
    showResult(result);
  } catch (error) {
    $('confidence').textContent = `Python scanner unavailable: ${error.message}`;
  } finally { URL.revokeObjectURL(source); }
}

$('fileInput').addEventListener('change', event => acceptFile(event.target.files[0]));
$('sampleBtn').addEventListener('click', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="white"/><text x="55" y="90" font-family="Arial" font-size="22" fill="#555">SCIENCE WORKSHEET</text><path d="M55 135h460M55 175h360M55 215h410M55 255h300" stroke="#aab6b0" stroke-width="5"/></svg>`;
  acceptFile(new File([svg], 'sample.svg', { type: 'image/svg+xml' }));
});
document.querySelectorAll('input[type=range]').forEach(input => input.addEventListener('input', event => { event.target.nextElementSibling.value = event.target.value; const blank = Number.parseInt($('blankStat').textContent, 10); if (hasScan && Number.isFinite(blank)) recommend(blank); }));
$('printBtn').addEventListener('click', () => window.print());
