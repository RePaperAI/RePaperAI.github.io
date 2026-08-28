/** Browser wrapper for the Python /api/analyze endpoint. */
export async function analyzeWithPython(file, demand = {}, baseUrl = '') {
  if (!(file instanceof Blob)) throw new TypeError('Expected an image File or Blob');
  const body = new FormData();
  body.append('image', file, file.name || 'scan.jpg');
  body.append('demand', JSON.stringify(demand));
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, { method: 'POST', body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Python server returned ${response.status}`);
  return result;
}
