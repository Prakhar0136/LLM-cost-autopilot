import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Cpu, DollarSign, Zap, AlertTriangle, Play, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  // Data States
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ totalCost: 0, baselineCost: 0, savings: 0, avgLatency: 0, totalRequests: 0 });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);

  // Playground States
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState(null);

  // Fetch metrics from backend database logs
  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/stats');
      const data = await res.json();
      setLogs(data.reverse()); // Show newest first
      calculateMetrics(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateMetrics = (data) => {
    if (!data.length) return;

    let actual = 0;
    let baseline = 0;
    let latencySum = 0;
    let simpleCount = 0;
    let moderateCount = 0;
    let complexCount = 0;

    data.forEach(log => {
      actual += log.cost_actual;
      baseline += log.cost_baseline;
      latencySum += log.latency_ms;
      if (log.tier === 'simple') simpleCount++;
      if (log.tier === 'moderate') moderateCount++;
      if (log.tier === 'complex') complexCount++;
    });

    const savingsPct = baseline > 0 ? ((baseline - actual) / baseline) * 100 : 0;

    setMetrics({
      totalCost: actual.toFixed(4),
      baselineCost: baseline.toFixed(4),
      savings: savingsPct.toFixed(1),
      avgLatency: Math.round(latencySum / data.length),
      totalRequests: data.length
    });

    // Format for Bar Chart (Last 7 requests or summarized blocks)
    const lastLogs = [...data].slice(-10);
    setChartData(lastLogs.map((log, i) => ({
      name: `Req ${i + 1}`,
      "Actual Cost": log.cost_actual * 1000, // scaled for readability
      "Baseline Cost": log.cost_baseline * 1000
    })));

    // Format for Donut Pie Chart
    setPieData([
      { name: 'Simple Tiers', value: simpleCount, color: '#10B981' },
      { name: 'Moderate Tiers', value: moderateCount, color: '#F59E0B' },
      { name: 'Complex Tiers', value: complexCount, color: '#EF4444' }
    ]);
  };

  // Handle live form submission inside the Playground
  const handleTestRoute = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setPlaygroundResult(data);
      fetchData(); // Refresh historical dashboard metrics
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1114] text-slate-100 p-6 font-sans">
      {/* HEADER BAR */}
      <header className="flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            LLM Cost Autopilot
          </h1>
          <p className="text-slate-400 text-sm">Production Intelligent LLM Gateway & Optimization Layer</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm transition">
          <RefreshCw size={16} /> Refresh Dashboard
        </button>
      </header>

      {/* METRIC ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#11191d] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Realized Savings</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">{metrics.savings}%</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><DollarSign size={24} /></div>
        </div>

        <div className="bg-[#11191d] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Requests Processed</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.totalRequests}</h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><Cpu size={24} /></div>
        </div>

        <div className="bg-[#11191d] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Accumulated Budget Spend</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">${metrics.totalCost}</h3>
            <span className="text-xs text-slate-500">Baseline: ${metrics.baselineCost}</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Layers size={24} /></div>
        </div>

        <div className="bg-[#11191d] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average System Latency</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{metrics.avgLatency}ms</h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><Zap size={24} /></div>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Cost Comparison Bar Graph */}
        <div className="bg-[#11191d] p-5 rounded-xl border border-slate-800 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Cost Profile (Scaled to $x1000 Tokens)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis stroke="#64748b" dataKey="name" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#11191d', borderColor: '#334155' }} />
                <Legend />
                <Bar dataKey="Actual Cost" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Baseline Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Routing Distribution Chart */}
        <div className="bg-[#11191d] p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold mb-4 text-slate-300">Intelligent Routing Distribution</h3>
          <div className="h-64 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-slate-400 uppercase">Gateway</span>
              <span className="text-lg font-bold">Autopilot</span>
            </div>
          </div>
          <div className="flex justify-around text-xs mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CORE INTERACTIVE PLAYGROUND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#11191d] p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold mb-3 text-slate-300 flex items-center gap-2">
            <Play className="text-emerald-400" size={16} /> Routing Playground
          </h3>
          <form onSubmit={handleTestRoute} className="space-y-4">
            <textarea
              className="w-full h-32 bg-[#0b1114] border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500"
              placeholder="Paste a prompt here to watch the classifier process and route it in real time..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 font-medium py-2 rounded-lg text-sm transition flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? "Routing through proxy backend..." : "Dispatch Automated Request"}
            </button>
          </form>
        </div>

        {/* Live Router Decisions Display */}
        <div className="bg-[#11191d] p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-300">Live Router Decision Logs</h3>
            {playgroundResult ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${playgroundResult.routing.tier_assigned === 'complex' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      playgroundResult.routing.tier_assigned === 'moderate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                    Complexity: {playgroundResult.routing.tier_assigned.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                    Model: {playgroundResult.routing.model_executed}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300">
                    Saved: {playgroundResult.routing.savings_percentage}
                  </span>
                </div>
                <div className="bg-[#0b1114] border border-slate-800 rounded-lg p-3 h-28 overflow-y-auto text-xs font-mono text-slate-300">
                  {playgroundResult.response}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                Trigger a request from the playground to see live structural classification.
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-500 italic mt-2">
            The router assigns target endpoints by trading execution fidelity directly against financial overhead limits.
          </div>
        </div>
      </div>

      {/* REQUEST LOGS AUDIT TRAIL TABLE */}
      <div className="bg-[#11191d] rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Audited Transaction Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0f1619] border-b border-slate-800 text-slate-400">
                <th className="p-3">Prompt Excerpt</th>
                <th className="p-3">Assigned Tier</th>
                <th className="p-3">Routed Destination</th>
                <th className="p-3">Fidelity State</th>
                <th className="p-3 text-right">Actual Cost</th>
                <th className="p-3 text-right">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No telemetry log lines stored in current SQLite session ledger.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-3 font-mono text-slate-400">{log.prompt_snippet}</td>
                    <td className="p-3 capitalize">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${log.tier === 'complex' ? 'text-red-400 bg-red-400/10' :
                          log.tier === 'moderate' ? 'text-amber-400 bg-amber-400/10' :
                            'text-emerald-400 bg-emerald-400/10'
                        }`}>
                        {log.tier}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-300">{log.model_used}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 ${log.status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {log.status === 'verified' ? '● Verified' : '○ Evaluating'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">${log.cost_actual.toFixed(5)}</td>
                    <td className="p-3 text-right font-mono text-emerald-400">+{log.saved_pct.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}