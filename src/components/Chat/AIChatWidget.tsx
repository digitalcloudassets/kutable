// Ensure the widget NEVER reads OPENAI keys in the client. It must call an Edge Function.
// If you already call supabase.functions.invoke('ai-chat'), keep that pattern.
// Below is a safe, minimal client-only snippet (no secrets used).
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AIChatWidget() {
  const [q, setQ] = useState('');
  const [a, setA] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setA(null);
    const { data, error } = await supabase.functions.invoke('ai-chat', { body: { prompt: q } });
    setLoading(false);
    if (error) {
      setA('Sorry, something went wrong.');
      return;
    }
    setA(data?.answer ?? 'No answer');
  };

  return (
    <div className="p-3 rounded-xl border">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask scheduling or pricing questions…"
          className="flex-1 border rounded px-3 py-2"
        />
        <button disabled={loading} onClick={ask} className="px-3 py-2 rounded bg-black text-white">
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </div>
      {a && <div className="mt-2 text-sm">{a}</div>}
    </div>
  );
}