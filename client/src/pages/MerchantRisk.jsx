import React, { useState } from 'react';

export default function MerchantRisk() {
  const [form, setForm] = useState({ newMerchant: true, policyViolations: 2, duplicateReceipts: 1, weekendSpendPct: 45, cashLikeSpend: 850 });
  const [result, setResult] = useState(null);
  const submit = async () => {
    const response = await fetch('/api/merchant-risk/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify(form),
    });
    setResult(await response.json());
  };
  return (
    <div className="page">
      <h1>Merchant Risk</h1>
      {Object.entries(form).map(([key, value]) => (
        <label key={key}>{key.replace(/([A-Z])/g, ' $1')}
          {typeof value === 'boolean' ? <input type="checkbox" checked={value} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /> : <input type="number" value={value} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />}
        </label>
      ))}
      <button onClick={submit}>Score merchant</button>
      {result && <section><h2>{result.level.toUpperCase()} · {result.score}/100</h2><ul>{result.actions.map((action) => <li key={action}>{action}</li>)}</ul></section>}
    </div>
  );
}
