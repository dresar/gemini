async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

export function getStats() {
  return request('/stats')
}

export function getKeys() {
  return request('/keys')
}

export function importKeys(keys) {
  return request('/keys/import', {
    method: 'POST',
    body: JSON.stringify({ keys }),
  })
}

export function deleteKey(id) {
  return request(`/keys/${id}`, { method: 'DELETE' })
}

export function toggleKey(id) {
  return request(`/keys/${id}/toggle`, { method: 'PATCH' })
}

export function generate(prompt, model = 'gemini-pro') {
  return request('/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, model }),
  })
}
