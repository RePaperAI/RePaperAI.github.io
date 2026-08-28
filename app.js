const $ = id => document.getElementById(id);
let hasScan = false;

async function analyzeWithPython(file, demand = {}) {
  const body = new FormData(); body.append('image', file, file.name || 'scan.jpg'); body.append('demand', JSON.stringify(demand));
  const response = await fetch('/api/analyze', { method: 'POST', body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Scanner returned ${response.status}`);
  return result;
}

function recommend(blank) {
  const sizes = { scratch: '8.5 x 11 in (Letter) or A4', memo: '3 x 3 or 4 x 6 in', flashcards: '3 x 5 or 4 x 6 in' };
  const demand = [...document.querySelectorAll('[data-demand]')].map(input => ({ name: input.dataset.demand, value: Number(input.value), size: sizes[input.dataset.demand] })).sort((a, b) => b.value - a.value)[0];
  const enough = blank >= 20;
  $('decision').textContent = enough ? 'Reuse recommended' : 'Recycle recommended';
  $('recommendation').textContent = enough ? `Cut into ${demand.name}${demand.name === 'scratch' ? ' sheets' : ''}` : 'Send to recycling';
  $('recommendationCopy').textContent = enough ? `Best match for today's highest demand: ${demand.name} · typical size ${demand.size}.` : 'There is not enough usable area to justify cutting waste.';
  $('reasoning').innerHTML = enough ? `<span>Why this choice?</span><br />${blank}% usable area × ${demand.value}% demand · low offcut risk · estimated ${Math.max(1, Math.floor(blank / 28))} usable pieces.` : '<span>Why this choice?</span><br />The usable area is below the school reuse threshold.';
  $('pieceCount').textContent = enough ? Math.max(1, Math.floor(blank / 28)) : 0; $('recovered').textContent = enough ? `${blank}%` : '0%'; $('waste').textContent = enough ? `${Math.max(4, 100 - blank - 20)}%` : '0%';
  $('processed').textContent = '129'; $('reused').textContent = enough ? '87' : '86'; $('diverted').textContent = enough ? '68%' : '67%';
}

function showResult(result) {
  hasScan = true; $('blankStat').textContent = `${result.blank}%`; $('printedStat').textContent = `${result.printed}%`; $('damageStat').textContent = `${result.damage}%`;
  $('confidence').textContent = `${result.confidence}% confidence · ${result.type}`; $('meterFill').style.width = `${result.blank}%`; recommend(result.blank);
}

function analyze(source, revokeSource = false) {
  $('preview').src = source; $('preview').hidden = false; $('dropContent').hidden = true; $('analysis').classList.remove('hidden'); $('confidence').textContent = 'Analyzing image...';
  const image = new Image();
  image.onload = () => { try { showResult(window.RePaperScanner.analyzeImage(image)); } catch (error) { $('confidence').textContent = `Unable to analyze image: ${error.message}`; } finally { if (revokeSource) URL.revokeObjectURL(source); } };
  image.onerror = () => { $('confidence').textContent = 'Unable to read image'; if (revokeSource) URL.revokeObjectURL(source); };
  image.src = source;
}

function acceptFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return $('confidence').textContent = 'Please choose an image file';
  if (file.size > 10 * 1024 * 1024) return $('confidence').textContent = 'Please choose an image under 10 MB';
  if (location.port === '5000') {
    const source = URL.createObjectURL(file); $('preview').src = source; $('preview').hidden = false; $('dropContent').hidden = true; $('analysis').classList.remove('hidden'); $('confidence').textContent = 'Analyzing with Python...';
    const demand = Object.fromEntries([...document.querySelectorAll('[data-demand]')].map(input => [input.dataset.demand, Number(input.value)]));
    analyzeWithPython(file, demand).then(showResult).catch(error => { $('confidence').textContent = error.message; }).finally(() => URL.revokeObjectURL(source)); return;
  }
  analyze(URL.createObjectURL(file), true);
}

$('fileInput').addEventListener('change', event => acceptFile(event.target.files[0]));
$('sampleBtn').addEventListener('click', () => analyze('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#fff"/><text x="55" y="90" font-family="Arial" font-size="22" fill="#555">SCIENCE WORKSHEET</text><path d="M55 135h460M55 175h360M55 215h410M55 255h300" stroke="#aab6b0" stroke-width="5"/></svg>`)));
document.querySelectorAll('input[type=range]').forEach(input => input.addEventListener('input', event => { event.target.nextElementSibling.value = event.target.value; const blank = Number.parseInt($('blankStat').textContent, 10); if (hasScan && Number.isFinite(blank)) recommend(blank); }));
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-tab]').forEach(tab => { const selected = tab === button; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', selected); }); document.querySelectorAll('.tab-panel').forEach(panel => { const selected = panel.id === `tab-${button.dataset.tab}`; panel.hidden = !selected; panel.classList.toggle('active', selected); }); }));
$('printBtn').addEventListener('click', () => window.print());
$('dropzone').addEventListener('dragover', event => { event.preventDefault(); $('dropzone').style.background = '#f0fbf3'; }); $('dropzone').addEventListener('dragleave', () => $('dropzone').style.background = ''); $('dropzone').addEventListener('drop', event => { event.preventDefault(); $('dropzone').style.background = ''; acceptFile(event.dataTransfer.files[0]); });
