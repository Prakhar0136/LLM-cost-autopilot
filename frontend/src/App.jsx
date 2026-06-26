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
      totalCost: actual.toFixed(6),
      baselineCost: baseline.toFixed(6),
      savings: savingsPct.toFixed(1),
      avgLatency: Math.round(latencySum / data.length),
      totalRequests: data.length
    });

    const lastLogs = [...data].slice(-10);
    setChartData(lastLogs.map((log, i) => ({
      name: `Req ${i + 1}`,
      "Actual Cost": log.cost_actual * 1000000,
      "Baseline Cost": log.cost_baseline * 1000000
    })));

    // Solid chart colors matching the new UI palette
    setPieData([
      { name: 'Simple Tiers', value: simpleCount, color: '#10B981' }, // Emerald 500
      { name: 'Moderate Tiers', value: moderateCount, color: '#F59E0B' }, // Amber 500
      { name: 'Complex Tiers', value: complexCount, color: '#EF4444' } // Red 500
    ]);
  };

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
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 font-sans selection:bg-emerald-500 selection:text-white">
      {/* HEADER BAR */}
      <header className="flex justify-between items-center pb-6 border-b border-neutral-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-500 tracking-tight">
            LLM Cost Autopilot
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Production Intelligent LLM Gateway & Optimization Layer</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-4 py-2 rounded-lg text-sm transition-colors text-neutral-200">
          <RefreshCw size={16} /> Refresh Dashboard
        </button>
      </header>

      {/* METRIC ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Realized Savings</p>
            <h3 className="text-3xl font-bold text-emerald-500 mt-1">{metrics.savings}%</h3>
          </div>
          <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-emerald-500"><DollarSign size={24} /></div>
        </div>

        <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Total Requests</p>
            <h3 className="text-3xl font-bold text-neutral-100 mt-1">{metrics.totalRequests}</h3>
          </div>
          <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-blue-500"><Cpu size={24} /></div>
        </div>

        <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Accumulated Spend</p>
            <h3 className="text-3xl font-bold text-neutral-100 mt-1">${metrics.totalCost}</h3>
            <span className="text-xs text-neutral-500 mt-1 block">Baseline: ${metrics.baselineCost}</span>
          </div>
          <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-purple-500"><Layers size={24} /></div>
        </div>

        <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Average Latency</p>
            <h3 className="text-3xl font-bold text-neutral-100 mt-1">{metrics.avgLatency}ms</h3>
          </div>
          <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-amber-500"><Zap size={24} /></div>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Cost Comparison Bar Graph */}
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 lg:col-span-2 shadow-sm">
          <h3 className="text-sm font-semibold mb-6 text-neutral-200">Cost Profile (Scaled to $x1000 Tokens)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis stroke="#737373" dataKey="name" axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#737373" axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  cursor={{ fill: '#171717' }}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5', borderRadius: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Actual Cost" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Baseline Cost" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Routing Distribution Chart */}
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-neutral-200">Routing Distribution</h3>
          <div className="flex-grow flex justify-center items-center relative min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5', borderRadius: '8px' }}
                  itemStyle={{ color: '#f5f5f5' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-neutral-400 uppercase tracking-widest">Gateway</span>
              <span className="text-lg font-bold text-neutral-100">Autopilot</span>
            </div>
          </div>
          <div className="flex justify-around text-xs mt-6">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }}></span>
                <span className="text-neutral-300">{d.name} <span className="text-neutral-500">({d.value})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CORE INTERACTIVE PLAYGROUND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-neutral-200 flex items-center gap-2">
            <Play className="text-emerald-500 fill-emerald-500" size={16} /> Routing Playground
          </h3>
          <form onSubmit={handleTestRoute} className="space-y-4">
            <textarea
              className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-neutral-100 placeholder-neutral-600 transition-all resize-none"
              placeholder="Paste a prompt here to watch the classifier process and route it in real time..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Routing through proxy backend..." : "Dispatch Automated Request"}
            </button>
          </form>
        </div>

        {/* Live Router Decisions Display */}
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-4 text-neutral-200">Live Router Logs</h3>
            {playgroundResult ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${playgroundResult.routing.tier_assigned === 'complex' ? 'bg-red-900 text-red-200 border border-red-800' :
                      playgroundResult.routing.tier_assigned === 'moderate' ? 'bg-amber-900 text-amber-200 border border-amber-800' :
                        'bg-emerald-900 text-emerald-200 border border-emerald-800'
                    }`}>
                    Complexity: {playgroundResult.routing.tier_assigned.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs bg-neutral-800 text-neutral-300 border border-neutral-700">
                    Model: {playgroundResult.routing.model_executed}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs bg-emerald-900 text-emerald-200 border border-emerald-800">
                    Saved: {playgroundResult.routing.savings_percentage}
                  </span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 h-28 overflow-y-auto text-xs font-mono text-neutral-300 leading-relaxed">
                  {playgroundResult.response}
                </div>
              </div>
            ) : (
              <div className="h-[172px] flex items-center justify-center border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 bg-neutral-950/50">
                Trigger a request from the playground to see live structural classification.
              </div>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-4">
            The router assigns target endpoints by trading execution fidelity directly against financial overhead limits.
          </div>
        </div>
      </div>

      {/* REQUEST LOGS AUDIT TRAIL TABLE */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-800 bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-200">Audited Transaction Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
                <th className="p-4 font-medium">Prompt Excerpt</th>
                <th className="p-4 font-medium">Assigned Tier</th>
                <th className="p-4 font-medium">Routed Destination</th>
                <th className="p-4 font-medium">Fidelity State</th>
                <th className="p-4 font-medium text-right">Actual Cost</th>
                <th className="p-4 font-medium text-right">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-neutral-500">No telemetry log lines stored in current session ledger.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800 transition-colors">
                    <td className="p-4 font-mono text-xs text-neutral-400 max-w-xs truncate">{log.prompt_snippet}</td>
                    <td className="p-4 capitalize">
                      <span className={`px-2 py-1 rounded text-[11px] font-medium border ${log.tier === 'complex' ? 'text-red-400 bg-red-950 border-red-900' :
                          log.tier === 'moderate' ? 'text-amber-400 bg-amber-950 border-amber-900' :
                            'text-emerald-400 bg-emerald-950 border-emerald-900'
                        }`}>
                        {log.tier}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-neutral-300">{log.model_used}</td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 text-xs ${log.status === 'verified' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {log.status === 'verified' ? 'Verified' : 'Evaluating'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-xs text-neutral-300">${log.cost_actual.toFixed(5)}</td>
                    <td className="p-4 text-right font-mono text-xs text-emerald-500">+{log.saved_pct.toFixed(1)}%</td>
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