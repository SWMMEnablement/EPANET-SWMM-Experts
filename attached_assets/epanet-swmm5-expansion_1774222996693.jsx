import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  epanet: "#3B82F6",   // blue
  swmm: "#F59E0B",     // amber
  accent: "#8B5CF6",   // purple
  green: "#10B981",
  red: "#EF4444",
  sky: "#0EA5E9",
  pink: "#EC4899",
  slate: "#64748B",
};

function Slider({ label, value, onChange, min, max, step = 1, unit = "", color = COLORS.epanet }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}{unit && ` ${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`
        }}
      />
    </div>
  );
}

function StatCard({ label, value, unit, color = "text-sky-300", sub }) {
  return (
    <div className="rounded-lg bg-slate-900/50 border border-slate-700/30 p-3 text-center">
      <div className="text-xs text-slate-500 mb-0.5" style={{ fontFamily: "var(--sans)" }}>{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {unit && <div className="text-xs text-slate-600">{unit}</div>}
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function CompTable({ headers, rows, epanetCol, swmmCol }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/40">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-800/80">
            {headers.map((h, i) => (
              <th key={i} className={`text-left px-3 py-2 font-semibold ${
                i === epanetCol ? "text-blue-400" : i === swmmCol ? "text-amber-400" : "text-slate-400"
              }`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-slate-800/60 hover:bg-slate-800/30">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 ${ci === 0 ? "font-medium text-slate-300" : "text-slate-400"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionNote({ children, type = "info" }) {
  const styles = {
    info: "bg-sky-950/30 border-sky-700/40 text-sky-300",
    warning: "bg-amber-950/30 border-amber-700/40 text-amber-300",
    tip: "bg-emerald-950/30 border-emerald-700/40 text-emerald-300",
  };
  const icons = { info: "💡", warning: "⚠️", tip: "✅" };
  return (
    <div className={`rounded-lg border p-3 text-xs leading-relaxed ${styles[type]}`}>
      <span className="mr-1.5">{icons[type]}</span>{children}
    </div>
  );
}

function Badge({ children, color = "blue" }) {
  const c = {
    blue: "bg-blue-900/40 text-blue-300 border-blue-700/40",
    amber: "bg-amber-900/40 text-amber-300 border-amber-700/40",
    green: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
    red: "bg-red-900/40 text-red-300 border-red-700/40",
    purple: "bg-purple-900/40 text-purple-300 border-purple-700/40",
    gray: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  };
  return <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${c[color]}`}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: VALVE TYPES DEEP DIVE
// ═══════════════════════════════════════════════════════════════

function ValveTab() {
  const [selectedValve, setSelectedValve] = useState("PRV");
  const [setting, setSetting] = useState(50);
  const [upstreamP, setUpstreamP] = useState(80);

  const valves = {
    PRV: {
      name: "Pressure Reducing Valve",
      desc: "Limits downstream pressure to a set value. If upstream pressure is below the setting, the valve is fully open. Common at pressure zone boundaries.",
      swmm: "No direct equivalent — conceptually like a weir that caps HGL at a fixed elevation.",
      color: COLORS.epanet,
      sim: (flow) => {
        const dp = upstreamP - setting;
        if (dp <= 0) return { ds: upstreamP, status: "OPEN (upstream below setting)" };
        return { ds: setting, status: "ACTIVE (reducing pressure)" };
      }
    },
    PSV: {
      name: "Pressure Sustaining Valve",
      desc: "Maintains minimum upstream pressure by throttling flow. Closes if upstream pressure drops below setting.",
      swmm: "No equivalent in SWMM5. Used to prevent draining upstream zones.",
      color: "#EC4899",
      sim: (flow) => {
        if (upstreamP >= setting) return { ds: upstreamP - 5, status: "OPEN (upstream above setting)" };
        return { ds: upstreamP * 0.3, status: "ACTIVE (sustaining upstream)" };
      }
    },
    PBV: {
      name: "Pressure Breaker Valve",
      desc: "Forces a fixed pressure drop ΔP across the valve, regardless of flow. Used for building connections.",
      swmm: "No equivalent. Could be approximated by a minor loss with K tuned to produce the desired ΔP.",
      color: "#8B5CF6",
      sim: () => ({ ds: Math.max(0, upstreamP - setting), status: `ΔP = ${setting} psi` })
    },
    FCV: {
      name: "Flow Control Valve",
      desc: "Limits flow to a maximum set point. If demand is below the setting, valve is fully open.",
      swmm: "Closest to a SWMM5 orifice with a fixed opening coefficient.",
      color: "#10B981",
      sim: () => ({ ds: upstreamP - 10, status: `Max Q = ${setting} GPM` })
    },
    TCV: {
      name: "Throttle Control Valve",
      desc: "Variable minor loss coefficient K. Setting is the K value. The higher K, the more headloss.",
      swmm: "Like a partially open SWMM5 orifice — both use a loss coefficient approach.",
      color: "#F59E0B",
      sim: () => {
        const hloss = setting * 0.5;
        return { ds: Math.max(0, upstreamP - hloss), status: `K = ${setting}, hL = ${hloss.toFixed(1)} psi` };
      }
    },
    GPV: {
      name: "General Purpose Valve",
      desc: "User-defined headloss vs. flow curve. Most flexible — can model anything from check valves to turbines.",
      swmm: "Like a custom SWMM5 rating curve at a link. Both use a lookup table approach.",
      color: "#EF4444",
      sim: () => ({ ds: Math.max(0, upstreamP - setting * 0.3), status: `Custom curve at setting ${setting}` })
    },
  };

  const v = valves[selectedValve];
  const result = v.sim();

  // HGL profile data
  const hglData = useMemo(() => {
    const pts = [];
    const usHGL = upstreamP * 2.31 + 100; // ft of head
    const dsHGL = result.ds * 2.31 + 100;
    for (let x = 0; x <= 100; x += 2) {
      const pipeHL = x * 0.03;
      if (x < 45) {
        pts.push({ x, hgl: usHGL - pipeHL, ground: 100 + Math.sin(x * 0.05) * 5 });
      } else if (x <= 55) {
        const frac = (x - 45) / 10;
        pts.push({ x, hgl: usHGL - 45 * 0.03 - frac * (usHGL - 45 * 0.03 - dsHGL), ground: 100 + Math.sin(x * 0.05) * 5 });
      } else {
        pts.push({ x, hgl: dsHGL - (x - 55) * 0.03, ground: 100 + Math.sin(x * 0.05) * 5 });
      }
    }
    return pts;
  }, [upstreamP, result.ds, selectedValve, setting]);

  return (
    <div className="space-y-4">
      <SectionNote type="info">
        EPANET has 6 valve types operating in the <strong>pressure domain</strong>. SWMM5 modelers think in weir/orifice equations (Q = C_d·A·√(2gH)) — here you'll see how valves control HGL and pressure instead.
      </SectionNote>

      {/* Valve selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(valves).map(([key, vv]) => (
          <button key={key} onClick={() => { setSelectedValve(key); setSetting(50); }}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
              selectedValve === key
                ? "text-white shadow-lg"
                : "bg-slate-800/40 text-slate-400 border-slate-700/40 hover:text-slate-200"
            }`}
            style={selectedValve === key ? { background: vv.color + "30", borderColor: vv.color + "80", color: vv.color } : {}}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Valve details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <h3 className="text-sm font-bold mb-1" style={{ color: v.color }}>{v.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">{v.desc}</p>
            <div className="rounded bg-amber-950/20 border border-amber-800/30 p-2">
              <span className="text-xs text-amber-400 font-semibold">SWMM5 Analog: </span>
              <span className="text-xs text-amber-300/80">{v.swmm}</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <Slider label="Upstream Pressure" value={upstreamP} onChange={setUpstreamP} min={20} max={120} unit="psi" color={COLORS.epanet} />
            <Slider label={`Valve Setting ${selectedValve === "TCV" ? "(K)" : selectedValve === "FCV" ? "(GPM)" : "(psi)"}`}
              value={setting} onChange={setSetting} min={5} max={100} unit={selectedValve === "TCV" ? "" : selectedValve === "FCV" ? "GPM" : "psi"} color={v.color} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Upstream" value={upstreamP} unit="psi" color="text-blue-300" />
            <StatCard label="Downstream" value={result.ds.toFixed(1)} unit="psi" color="text-emerald-300" />
            <StatCard label="ΔP" value={(upstreamP - result.ds).toFixed(1)} unit="psi" color="text-amber-300" />
          </div>
          <div className="text-xs text-slate-400 bg-slate-900/40 rounded-lg p-2 font-mono text-center">
            Status: <span style={{ color: v.color }}>{result.status}</span>
          </div>
        </div>

        {/* HGL Profile */}
        <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
          <div className="text-xs text-slate-500 mb-2 font-semibold">HGL Profile Through Valve</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hglData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="x" stroke="#475569" tick={{ fontSize: 9 }}
                label={{ value: "Distance (ft)", position: "bottom", offset: 5, fill: "#64748b", fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={['auto', 'auto']}
                label={{ value: "Elevation (ft)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="ground" fill="#3B2507" stroke="#92400E" fillOpacity={0.5} name="Ground" />
              <Line type="monotone" dataKey="hgl" stroke={v.color} strokeWidth={2.5} dot={false} name="HGL" />
              <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "VALVE", position: "top", fill: "#94a3b8", fontSize: 9 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: FIRE FLOW ANALYSIS
// ═══════════════════════════════════════════════════════════════

function FireFlowTab() {
  const [staticP, setStaticP] = useState(65);
  const [residualReq, setResidualReq] = useState(20);
  const [pipeC, setPipeC] = useState(100);
  const [pipeDia, setPipeDia] = useState(8);
  const [pipeLen, setPipeLen] = useState(1000);

  const fireFlowData = useMemo(() => {
    const pts = [];
    for (let Q = 0; Q <= 3000; Q += 50) {
      const Qcfs = Q / 449; // GPM to CFS
      // Hazen-Williams headloss
      const A = Math.PI * Math.pow(pipeDia / 12 / 2, 2);
      const V = A > 0 ? Qcfs / A : 0;
      const hL = pipeLen * 10.67 * Math.pow(Qcfs / pipeC, 1.852) / Math.pow(pipeDia / 12, 4.87);
      const residualP = Math.max(0, staticP - hL / 2.31);
      pts.push({
        flow: Q,
        pressure: parseFloat(residualP.toFixed(1)),
        velocity: parseFloat((V).toFixed(2)),
      });
    }
    return pts;
  }, [staticP, pipeC, pipeDia, pipeLen]);

  const availableFF = useMemo(() => {
    for (let i = fireFlowData.length - 1; i >= 0; i--) {
      if (fireFlowData[i].pressure >= residualReq) return fireFlowData[i].flow;
    }
    return 0;
  }, [fireFlowData, residualReq]);

  const isoRating = availableFF >= 3500 ? "Class 1-2" : availableFF >= 2500 ? "Class 3-4" : availableFF >= 1500 ? "Class 5-6" : availableFF >= 1000 ? "Class 7-8" : "Class 9-10";

  return (
    <div className="space-y-4">
      <SectionNote type="warning">
        Fire flow analysis is one of EPANET's most common practical applications and has <strong>zero SWMM5 equivalent</strong>. It determines the maximum flow available at a hydrant while maintaining minimum residual pressure (typically 20 psi).
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <div className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">System Parameters</div>
            <Slider label="Static Pressure" value={staticP} onChange={setStaticP} min={30} max={100} unit="psi" />
            <Slider label="Min Residual Pressure" value={residualReq} onChange={setResidualReq} min={10} max={40} unit="psi" color={COLORS.red} />
            <Slider label="Pipe C-Factor (H-W)" value={pipeC} onChange={setPipeC} min={60} max={150} unit="" color={COLORS.green} />
            <Slider label="Pipe Diameter" value={pipeDia} onChange={setPipeDia} min={4} max={24} step={2} unit="in" color={COLORS.accent} />
            <Slider label="Pipe Length" value={pipeLen} onChange={setPipeLen} min={100} max={5000} step={100} unit="ft" color={COLORS.slate} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Available Fire Flow" value={availableFF.toLocaleString()} unit="GPM" color={availableFF >= 1500 ? "text-emerald-300" : "text-red-300"} />
            <StatCard label="ISO Rating" value={isoRating} color="text-purple-300" sub={`@ ${residualReq} psi residual`} />
          </div>

          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
            <div className="text-xs text-slate-500 font-semibold mb-2">ISO Needed Fire Flow (Typical)</div>
            <div className="space-y-1 text-xs text-slate-400">
              {[
                ["Single-Family Residential", "1,000 GPM"],
                ["Multi-Family / Commercial", "1,500-3,500 GPM"],
                ["Industrial / High-Value", "3,500-8,000+ GPM"],
                ["Duration: 2-4 hours", ""],
              ].map(([l, v], i) => (
                <div key={i} className="flex justify-between">
                  <span>{l}</span><span className="text-sky-400 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
          <div className="text-xs text-slate-500 mb-2 font-semibold">Pressure vs. Flow at Hydrant</div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={fireFlowData} margin={{ top: 5, right: 15, bottom: 25, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="flow" stroke="#475569" tick={{ fontSize: 10 }}
                label={{ value: "Fire Flow (GPM)", position: "bottom", offset: 10, fill: "#64748b", fontSize: 10 }} />
              <YAxis yAxisId="p" stroke="#3B82F6" tick={{ fontSize: 10 }} domain={[0, 'auto']}
                label={{ value: "Pressure (psi)", angle: -90, position: "insideLeft", fill: "#3B82F6", fontSize: 10 }} />
              <YAxis yAxisId="v" orientation="right" stroke="#F59E0B" tick={{ fontSize: 10 }}
                label={{ value: "Velocity (ft/s)", angle: 90, position: "insideRight", fill: "#F59E0B", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine yAxisId="p" y={residualReq} stroke={COLORS.red} strokeDasharray="6 4" strokeWidth={1.5}
                label={{ value: `Min ${residualReq} psi`, position: "right", fill: COLORS.red, fontSize: 9 }} />
              <ReferenceLine x={availableFF} stroke={COLORS.green} strokeDasharray="4 4"
                label={{ value: `${availableFF} GPM`, position: "top", fill: COLORS.green, fontSize: 9 }} />
              <Line yAxisId="p" type="monotone" dataKey="pressure" stroke={COLORS.epanet} strokeWidth={2.5} dot={false} name="Pressure" />
              <Line yAxisId="v" type="monotone" dataKey="velocity" stroke={COLORS.swmm} strokeWidth={1.5} dot={false} name="Velocity" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: PUMP ENERGY & COST
// ═══════════════════════════════════════════════════════════════

function PumpEnergyTab() {
  const [flow, setFlow] = useState(500);
  const [tdh, setTdh] = useState(80);
  const [pumpEff, setPumpEff] = useState(75);
  const [motorEff, setMotorEff] = useState(92);
  const [vfdEff, setVfdEff] = useState(97);
  const [kwhPrice, setKwhPrice] = useState(0.12);
  const [hoursPerDay, setHoursPerDay] = useState(16);
  const [speedRatio, setSpeedRatio] = useState(1.0);

  const wireToWater = (pumpEff * motorEff * vfdEff) / 1000000;
  const bhp = (flow * tdh * 8.33) / (3960 * pumpEff / 100);
  const inputKw = bhp * 0.7457 / (motorEff / 100) / (vfdEff / 100);
  const dailyKwh = inputKw * hoursPerDay;
  const dailyCost = dailyKwh * kwhPrice;
  const annualCost = dailyCost * 365;

  // Affinity law curves
  const affinityData = useMemo(() => {
    const pts = [];
    const baseQ = flow;
    const baseH = tdh;
    const baseBHP = bhp;
    for (let n = 0.4; n <= 1.2; n += 0.05) {
      pts.push({
        speed: parseFloat((n * 100).toFixed(0)),
        flow: parseFloat((baseQ * n).toFixed(0)),
        head: parseFloat((baseH * n * n).toFixed(1)),
        power: parseFloat((baseBHP * n * n * n).toFixed(2)),
      });
    }
    return pts;
  }, [flow, tdh, bhp]);

  // SWMM5 pump type comparison
  const pumpCurveData = useMemo(() => {
    const pts = [];
    for (let q = 0; q <= flow * 1.5; q += flow * 0.05) {
      const ratio = q / flow;
      pts.push({
        q: parseFloat(q.toFixed(0)),
        head: parseFloat((tdh * (1 - 0.8 * ratio * ratio)).toFixed(1)),
        eff: parseFloat((pumpEff * (1 - Math.pow(ratio - 0.85, 2) * 3)).toFixed(1)),
      });
    }
    return pts;
  }, [flow, tdh, pumpEff]);

  return (
    <div className="space-y-4">
      <SectionNote type="info">
        EPANET tracks pump energy (kWh), efficiency, and operating cost — SWMM5 does not. Understanding pump energy is critical for water distribution design.
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <div className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Pump Parameters</div>
            <Slider label="Design Flow" value={flow} onChange={setFlow} min={50} max={2000} step={50} unit="GPM" />
            <Slider label="Total Dynamic Head" value={tdh} onChange={setTdh} min={20} max={200} unit="ft" />
            <Slider label="Pump Efficiency" value={pumpEff} onChange={setPumpEff} min={40} max={90} unit="%" color={COLORS.green} />
            <Slider label="Motor Efficiency" value={motorEff} onChange={setMotorEff} min={80} max={97} unit="%" color={COLORS.accent} />
            <Slider label="VFD Efficiency" value={vfdEff} onChange={setVfdEff} min={90} max={100} unit="%" color={COLORS.pink} />
            <Slider label="Energy Price" value={kwhPrice} onChange={setKwhPrice} min={0.05} max={0.35} step={0.01} unit="$/kWh" color={COLORS.swmm} />
            <Slider label="Hours/Day" value={hoursPerDay} onChange={setHoursPerDay} min={1} max={24} unit="hrs" color={COLORS.slate} />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {/* Results */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="Wire-to-Water" value={(wireToWater * 100).toFixed(1)} unit="%" color="text-emerald-300" />
            <StatCard label="Input Power" value={inputKw.toFixed(1)} unit="kW" color="text-sky-300" />
            <StatCard label="Daily Cost" value={`$${dailyCost.toFixed(2)}`} unit="" color="text-amber-300" />
            <StatCard label="Annual Cost" value={`$${annualCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`} unit="" color="text-red-300" />
          </div>

          {/* Efficiency Breakdown */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
            <div className="text-xs text-slate-500 font-semibold mb-2">Wire-to-Water Efficiency Chain</div>
            <div className="flex items-center gap-1 text-xs">
              {[
                { label: "Electrical", val: "100%", color: "#EF4444" },
                { label: "→ VFD", val: `${vfdEff}%`, color: "#EC4899" },
                { label: "→ Motor", val: `${(vfdEff * motorEff / 100).toFixed(1)}%`, color: "#8B5CF6" },
                { label: "→ Pump", val: `${(wireToWater * 100).toFixed(1)}%`, color: "#10B981" },
              ].map((s, i) => (
                <div key={i} className="flex-1 text-center py-2 rounded" style={{ background: s.color + "20", border: `1px solid ${s.color}40` }}>
                  <div className="font-bold" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pump Curve */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
            <div className="text-xs text-slate-500 mb-2 font-semibold">Pump H-Q Curve & Efficiency</div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={pumpCurveData} margin={{ top: 5, right: 15, bottom: 20, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="q" stroke="#475569" tick={{ fontSize: 9 }}
                  label={{ value: "Flow (GPM)", position: "bottom", offset: 5, fill: "#64748b", fontSize: 9 }} />
                <YAxis yAxisId="h" stroke="#3B82F6" tick={{ fontSize: 9 }}
                  label={{ value: "Head (ft)", angle: -90, position: "insideLeft", fill: "#3B82F6", fontSize: 9 }} />
                <YAxis yAxisId="e" orientation="right" stroke="#10B981" tick={{ fontSize: 9 }} domain={[0, 100]}
                  label={{ value: "Eff (%)", angle: 90, position: "insideRight", fill: "#10B981", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 10 }} />
                <Line yAxisId="h" type="monotone" dataKey="head" stroke={COLORS.epanet} strokeWidth={2.5} dot={false} name="Head" />
                <Line yAxisId="e" type="monotone" dataKey="eff" stroke={COLORS.green} strokeWidth={2} dot={false} strokeDasharray="4 4" name="Efficiency" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* SWMM5 pump type mapping */}
          <div className="rounded-lg bg-amber-950/20 border border-amber-800/30 p-3">
            <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 Pump Types → EPANET Mapping</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div><Badge color="amber">Type 1</Badge> Volume vs. Flow → No EPANET equiv (wet-well)</div>
              <div><Badge color="amber">Type 2</Badge> Head vs. Flow → <Badge color="blue">EPANET H-Q Curve</Badge></div>
              <div><Badge color="amber">Type 3</Badge> Depth vs. Flow → No direct equiv</div>
              <div><Badge color="amber">Type 4</Badge> Depth vs. Flow → No direct equiv</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: DEMAND ALLOCATION
// ═══════════════════════════════════════════════════════════════

function DemandTab() {
  const [totalDemand, setTotalDemand] = useState(2.0); // MGD
  const [numJunctions, setNumJunctions] = useState(150);
  const [method, setMethod] = useState("unitLength");
  const [minPressure, setMinPressure] = useState(20);
  const [normalPressure, setNormalPressure] = useState(40);

  // PDA curve
  const pdaData = useMemo(() => {
    const pts = [];
    for (let p = 0; p <= 80; p += 1) {
      const pda = p <= 0 ? 0 : p >= normalPressure ? 1.0 : Math.pow((p - 0) / (normalPressure - 0), 0.5);
      const dda = 1.0;
      pts.push({
        pressure: p,
        pda: parseFloat((pda * 100).toFixed(1)),
        dda: 100,
      });
    }
    return pts;
  }, [normalPressure]);

  return (
    <div className="space-y-4">
      <SectionNote type="info">
        EPANET requires distributing total demand to individual junctions — a workflow <strong>completely absent from SWMM5</strong> (where subcatchments generate inflows automatically). This is one of the biggest workflow differences.
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <div className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">Allocation Methods</div>
            {[
              { key: "unitLength", name: "Unit Length", desc: "Demand per linear foot of main pipe. Simple but rough." },
              { key: "serviceConn", name: "Service Connections", desc: "Count connections per junction. More accurate for residential." },
              { key: "landUse", name: "Land Use / GIS", desc: "Assign by parcel/zoning. Best for mixed-use systems." },
              { key: "meterData", name: "Meter/Billing Data", desc: "Nearest-junction assignment of actual consumption. Gold standard." },
            ].map((m) => (
              <button key={m.key} onClick={() => setMethod(m.key)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1.5 text-xs transition-all border ${
                  method === m.key
                    ? "bg-sky-900/30 border-sky-600/50 text-sky-200"
                    : "bg-slate-900/30 border-slate-700/30 text-slate-400 hover:border-slate-600/40"
                }`}>
                <div className="font-semibold mb-0.5">{m.name}</div>
                <div className="text-slate-500 text-xs">{m.desc}</div>
              </button>
            ))}
          </div>

          <CompTable
            headers={["Category", "SWMM5 Concept", "EPANET Concept"]}
            rows={[
              ["Flow source", "Subcatchment runoff", "Junction demand"],
              ["Spatial unit", "Subcatchment area", "Junction service area"],
              ["Time pattern", "DWF + time series", "Demand pattern (multiplier)"],
              ["Categories", "DWF components", "Demand categories"],
              ["Unaccounted", "RDII / GWI", "Non-revenue water / emitters"],
            ]}
            epanetCol={2} swmmCol={1}
          />
        </div>

        <div className="space-y-3">
          {/* PDA vs DDA */}
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
            <div className="text-xs text-slate-500 mb-1 font-semibold">Pressure-Dependent (PDA) vs. Demand-Driven (DDA)</div>
            <p className="text-xs text-slate-500 mb-2">PDA reduces demand at low pressures. DDA assumes full demand regardless — can produce negative pressures (unrealistic).</p>
            <Slider label="Service Pressure for Full Demand" value={normalPressure} onChange={setNormalPressure} min={20} max={60} unit="psi" color={COLORS.green} />
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pdaData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="pressure" stroke="#475569" tick={{ fontSize: 9 }}
                  label={{ value: "Junction Pressure (psi)", position: "bottom", offset: 5, fill: "#64748b", fontSize: 9 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={[0, 110]}
                  label={{ value: "% of Demand Met", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 10 }} />
                <ReferenceLine x={minPressure} stroke={COLORS.red} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="dda" stroke={COLORS.swmm} strokeWidth={2} dot={false} name="DDA (always 100%)" strokeDasharray="6 4" />
                <Line type="monotone" dataKey="pda" stroke={COLORS.epanet} strokeWidth={2.5} dot={false} name="PDA" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SectionNote type="tip">
            <strong>SWMM5 parallel:</strong> SWMM5 always computes flow based on hydraulic conditions (depth, slope), so it's inherently "pressure-dependent." EPANET's DDA is simpler but can produce unrealistic results during fire flow or pipe breaks.
          </SectionNote>

          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
            <div className="text-xs text-slate-500 font-semibold mb-2">Leakage Modeling: Emitters</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              EPANET represents background leakage using <strong>emitters</strong> at junctions: Q = C·P<sup>γ</sup> where γ ≈ 0.5 (orifice) or γ ≈ 1.18 (UK Ofwat). This is conceptually similar to SWMM5's groundwater inflow equation — both are pressure/head-driven flow relationships.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: NETWORK TOPOLOGY
// ═══════════════════════════════════════════════════════════════

function TopologyTab() {
  return (
    <div className="space-y-4">
      <SectionNote type="info">
        SWMM5 networks are typically <strong>dendritic</strong> (tree-shaped, flowing to outfalls). EPANET networks are typically <strong>heavily looped</strong> (multiple paths for redundancy). This fundamental difference affects solver choice and modeling approach.
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SWMM5 dendritic */}
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge color="amber">SWMM5</Badge>
            <span className="text-sm font-bold text-amber-300">Dendritic (Tree) Network</span>
          </div>
          <svg viewBox="0 0 300 200" className="w-full h-40 mb-3">
            {/* Tree structure */}
            <circle cx="50" cy="30" r="8" fill="#F59E0B" opacity="0.6" />
            <circle cx="100" cy="30" r="8" fill="#F59E0B" opacity="0.6" />
            <circle cx="200" cy="30" r="8" fill="#F59E0B" opacity="0.6" />
            <circle cx="250" cy="30" r="8" fill="#F59E0B" opacity="0.6" />
            <circle cx="75" cy="80" r="8" fill="#F59E0B" opacity="0.8" />
            <circle cx="225" cy="80" r="8" fill="#F59E0B" opacity="0.8" />
            <circle cx="150" cy="130" r="10" fill="#F59E0B" />
            <circle cx="150" cy="180" r="12" fill="#EF4444" stroke="#EF4444" strokeWidth="2" />
            <line x1="50" y1="38" x2="75" y2="72" stroke="#F59E0B" strokeWidth="2" />
            <line x1="100" y1="38" x2="75" y2="72" stroke="#F59E0B" strokeWidth="2" />
            <line x1="200" y1="38" x2="225" y2="72" stroke="#F59E0B" strokeWidth="2" />
            <line x1="250" y1="38" x2="225" y2="72" stroke="#F59E0B" strokeWidth="2" />
            <line x1="75" y1="88" x2="150" y2="122" stroke="#F59E0B" strokeWidth="2.5" />
            <line x1="225" y1="88" x2="150" y2="122" stroke="#F59E0B" strokeWidth="2.5" />
            <line x1="150" y1="140" x2="150" y2="168" stroke="#EF4444" strokeWidth="3" />
            <text x="50" y="18" textAnchor="middle" fill="#64748b" fontSize="8">SC-1</text>
            <text x="100" y="18" textAnchor="middle" fill="#64748b" fontSize="8">SC-2</text>
            <text x="200" y="18" textAnchor="middle" fill="#64748b" fontSize="8">SC-3</text>
            <text x="250" y="18" textAnchor="middle" fill="#64748b" fontSize="8">SC-4</text>
            <text x="150" y="198" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">OUTFALL</text>
          </svg>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>• Flow always moves <strong>downstream</strong> toward outfall(s)</p>
            <p>• Kinematic Wave solver works (uni-directional)</p>
            <p>• Dynamic Wave needed only if backwater effects exist</p>
            <p>• No redundancy — single path from source to outlet</p>
            <p>• Typical: sanitary sewers, storm drains, open channels</p>
          </div>
        </div>

        {/* EPANET looped */}
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge color="blue">EPANET</Badge>
            <span className="text-sm font-bold text-blue-300">Looped (Grid) Network</span>
          </div>
          <svg viewBox="0 0 300 200" className="w-full h-40 mb-3">
            {/* Grid structure */}
            {[
              [75, 40], [150, 40], [225, 40],
              [75, 100], [150, 100], [225, 100],
              [75, 160], [150, 160], [225, 160],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={8} fill="#3B82F6" opacity={0.7} />
            ))}
            {/* Horizontal pipes */}
            {[[75,40,150,40],[150,40,225,40],[75,100,150,100],[150,100,225,100],[75,160,150,160],[150,160,225,160]].map(([x1,y1,x2,y2],i) => (
              <line key={`h${i}`} x1={x1+8} y1={y1} x2={x2-8} y2={y2} stroke="#3B82F6" strokeWidth="2" />
            ))}
            {/* Vertical pipes */}
            {[[75,40,75,100],[150,40,150,100],[225,40,225,100],[75,100,75,160],[150,100,150,160],[225,100,225,160]].map(([x1,y1,x2,y2],i) => (
              <line key={`v${i}`} x1={x1} y1={y1+8} x2={x2} y2={y2-8} stroke="#3B82F6" strokeWidth="2" />
            ))}
            {/* Reservoir */}
            <rect x="10" y="90" width="30" height="20" fill="#0EA5E9" rx="3" />
            <line x1="40" y1="100" x2="67" y2="100" stroke="#0EA5E9" strokeWidth="3" />
            <text x="25" y="85" textAnchor="middle" fill="#0EA5E9" fontSize="8" fontWeight="bold">RES</text>
            {/* Tank */}
            <rect x="260" y="30" width="25" height="20" fill="#10B981" rx="3" />
            <line x1="233" y1="40" x2="260" y2="40" stroke="#10B981" strokeWidth="3" />
            <text x="273" y="24" textAnchor="middle" fill="#10B981" fontSize="8" fontWeight="bold">TANK</text>
          </svg>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>• Flow can travel <strong>multiple paths</strong> from source to customer</p>
            <p>• Gradient Algorithm solves simultaneous loop equations</p>
            <p>• Flow direction determined by pressure differences</p>
            <p>• Redundancy — if one pipe breaks, water reroutes</p>
            <p>• Typical: water distribution, industrial plant piping</p>
          </div>
        </div>
      </div>

      <CompTable
        headers={["Aspect", "SWMM5 (Collection)", "EPANET (Distribution)"]}
        rows={[
          ["Typical shape", "Dendritic / tree", "Looped / grid"],
          ["Flow direction", "Known a priori (downhill)", "Computed from pressures"],
          ["Solver", "KW (downstream only) or DW", "Gradient Algorithm (all loops)"],
          ["Loops allowed?", "DW only (backwater effects)", "Always (fundamental design)"],
          ["Pressure zones", "N/A (gravity flow)", "Separated by PRVs and pumps"],
          ["Redundancy", "None typical", "Critical design requirement"],
          ["Dead ends", "Rare (everything flows out)", "Common (cul-de-sacs → water age issues)"],
        ]}
        epanetCol={2} swmmCol={1}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 6: DESIGN CRITERIA
// ═══════════════════════════════════════════════════════════════

function DesignCriteriaTab() {
  return (
    <div className="space-y-4">
      <SectionNote type="info">
        Design criteria differ fundamentally because collection systems are gravity-driven while distribution systems are pressure-driven. Understanding both sets of criteria is essential for cross-domain work.
      </SectionNote>

      <CompTable
        headers={["Parameter", "SWMM5 (Collection)", "EPANET (Distribution)"]}
        rows={[
          ["Pipe sizing target", "d/D ≤ 0.8 at design flow", "Velocity 2-5 ft/s; pressure 40-80 psi"],
          ["Minimum velocity", "2.0 ft/s (self-cleansing)", "0.5 ft/s (avoid stagnation / water age)"],
          ["Maximum velocity", "10-15 ft/s", "5-8 ft/s (prevent erosion & water hammer)"],
          ["Minimum slope", "Per diameter (Ten States Stds)", "N/A (pressurized)"],
          ["Minimum cover", "3-5 ft typically", "3-5 ft (freeze protection)"],
          ["Design loading", "2-yr to 100-yr storm", "Max day demand + fire flow"],
          ["Failure mode", "Surcharge → flooding → CSO", "Low pressure → no service → contamination"],
          ["Critical check", "d/D ratio, Froude number", "Residual pressure, water age"],
          ["Material spec", "RCP, HDPE, VCP, PVC", "DI, PVC, HDPE, AC (legacy)"],
          ["Min pipe size", "8 in (sanitary), 15 in (storm)", "6 in (fire flow), 2 in (service)"],
        ]}
        epanetCol={2} swmmCol={1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-4">
          <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 Failure Cascade</div>
          <div className="space-y-1 text-xs text-slate-400">
            {["1. Storm exceeds design capacity", "2. Pipes surcharge (d/D > 1.0)", "3. HGL rises above ground → manhole flooding",
              "4. Street flooding / basement backup", "5. Combined sewer overflow (CSO) → receiving water"].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${i < 2 ? "bg-amber-500" : i < 4 ? "bg-orange-500" : "bg-red-500"}`} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-4">
          <div className="text-xs text-blue-400 font-semibold mb-2">EPANET Failure Cascade</div>
          <div className="space-y-1 text-xs text-slate-400">
            {["1. Demand exceeds supply capacity", "2. Pressure drops below 40 psi (low-pressure zone)",
              "3. Pressure drops below 20 psi (inadequate fire flow)", "4. Negative pressure → no service",
              "5. Contamination intrusion risk (backflow)"].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${i < 2 ? "bg-blue-500" : i < 4 ? "bg-orange-500" : "bg-red-500"}`} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 7: PATTERN EDITOR
// ═══════════════════════════════════════════════════════════════

function PatternTab() {
  const presets = {
    residential: [0.5, 0.4, 0.35, 0.35, 0.4, 0.6, 0.9, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0, 0.95, 0.9, 0.95, 1.1, 1.3, 1.4, 1.3, 1.1, 0.9, 0.7, 0.6],
    commercial: [0.2, 0.15, 0.15, 0.15, 0.2, 0.3, 0.5, 0.8, 1.2, 1.5, 1.6, 1.5, 1.4, 1.5, 1.6, 1.5, 1.3, 1.1, 0.8, 0.5, 0.3, 0.25, 0.2, 0.2],
    industrial: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.9, 1.1, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.1, 0.9, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
    combined_wet: [0.6, 0.5, 0.45, 0.45, 0.5, 0.7, 1.0, 1.4, 1.5, 1.4, 1.3, 2.5, 3.0, 2.8, 2.0, 1.5, 1.3, 1.4, 1.5, 1.4, 1.2, 1.0, 0.8, 0.7],
  };

  const [pattern, setPattern] = useState([...presets.residential]);
  const [preset, setPreset] = useState("residential");
  const [editHour, setEditHour] = useState(null);

  const loadPreset = (key) => {
    setPreset(key);
    setPattern([...presets[key]]);
  };

  const avgMultiplier = (pattern.reduce((a, b) => a + b, 0) / 24).toFixed(3);
  const peakFactor = (Math.max(...pattern) / parseFloat(avgMultiplier)).toFixed(2);

  const chartData = pattern.map((v, i) => ({
    hour: i,
    label: `${i}:00`,
    multiplier: v,
  }));

  // SWMM5 DWF format
  const swmmDWF = `[PATTERNS]\n;;Name           Type       Multipliers\n;;-------------- ---------- -----------\nDiurnal          HOURLY     ${pattern.slice(0, 6).map(v => v.toFixed(2)).join("  ")}\nDiurnal                     ${pattern.slice(6, 12).map(v => v.toFixed(2)).join("  ")}\nDiurnal                     ${pattern.slice(12, 18).map(v => v.toFixed(2)).join("  ")}\nDiurnal                     ${pattern.slice(18, 24).map(v => v.toFixed(2)).join("  ")}`;

  const epanetPat = `[PATTERNS]\n;ID              Multipliers\nDiurnal          ${pattern.slice(0, 6).map(v => v.toFixed(2)).join("  ")}\nDiurnal          ${pattern.slice(6, 12).map(v => v.toFixed(2)).join("  ")}\nDiurnal          ${pattern.slice(12, 18).map(v => v.toFixed(2)).join("  ")}\nDiurnal          ${pattern.slice(18, 24).map(v => v.toFixed(2)).join("  ")}`;

  return (
    <div className="space-y-4">
      <SectionNote type="info">
        Both SWMM5 and EPANET use hourly multiplier patterns, but SWMM5 calls them <strong>DWF patterns</strong> (dry weather flow) while EPANET calls them <strong>demand patterns</strong>. The format is nearly identical.
      </SectionNote>

      <div className="flex flex-wrap gap-2 mb-2">
        {Object.keys(presets).map((k) => (
          <button key={k} onClick={() => loadPreset(k)}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all border ${
              preset === k ? "bg-sky-900/40 border-sky-600/50 text-sky-300" : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:text-slate-200"
            }`}>{k.replace("_", " ")}</button>
        ))}
      </div>

      <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
        <div className="text-xs text-slate-500 mb-2 font-semibold">Click bars to edit multiplier values</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}
            onClick={(e) => {
              if (e && e.activeTooltipIndex !== undefined) setEditHour(e.activeTooltipIndex);
            }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" stroke="#475569" tick={{ fontSize: 9 }}
              label={{ value: "Hour of Day", position: "bottom", offset: 5, fill: "#64748b", fontSize: 9 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 9 }}
              label={{ value: "Multiplier", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 9 }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 10 }}
              formatter={(v) => [v.toFixed(2), "Multiplier"]} labelFormatter={(v) => `Hour ${v}:00`} />
            <ReferenceLine y={1.0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="multiplier" fill={COLORS.epanet} radius={[2, 2, 0, 0]}
              cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>

        {editHour !== null && (
          <div className="flex items-center gap-3 mt-2 px-2">
            <span className="text-xs text-slate-400">Hour {editHour}:00 =</span>
            <input type="number" value={pattern[editHour]} step={0.05} min={0} max={5}
              onChange={(e) => {
                const newP = [...pattern];
                newP[editHour] = parseFloat(e.target.value) || 0;
                setPattern(newP);
              }}
              className="w-20 px-2 py-1 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
            />
            <button onClick={() => setEditHour(null)} className="text-xs text-slate-500 hover:text-slate-300">Done</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Avg Multiplier" value={avgMultiplier} color="text-sky-300" />
        <StatCard label="Peak Factor" value={`${peakFactor}x`} color="text-amber-300" sub="peak / avg" />
        <StatCard label="Peak Hour" value={`${pattern.indexOf(Math.max(...pattern))}:00`} color="text-emerald-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-3">
          <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 [PATTERNS]</div>
          <pre className="text-xs text-amber-200/70 font-mono whitespace-pre overflow-x-auto">{swmmDWF}</pre>
        </div>
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-3">
          <div className="text-xs text-blue-400 font-semibold mb-2">EPANET [PATTERNS]</div>
          <pre className="text-xs text-blue-200/70 font-mono whitespace-pre overflow-x-auto">{epanetPat}</pre>
        </div>
      </div>

      <SectionNote type="tip">
        <strong>Key difference:</strong> EPANET patterns are always <strong>cyclical</strong> (they repeat). SWMM5 can use both repeating patterns and arbitrary time series that don't repeat. For event-based SWMM5 simulations, time series are more common.
      </SectionNote>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 8: CALIBRATION COMPARISON
// ═══════════════════════════════════════════════════════════════

function CalibrationTab() {
  return (
    <div className="space-y-4">
      <SectionNote type="info">
        Calibration workflows differ fundamentally. SWMM5 calibrates to <strong>flow & depth hydrographs during storms</strong>. EPANET calibrates to <strong>pressures & tank levels during normal operations</strong>.
      </SectionNote>

      <CompTable
        headers={["Aspect", "SWMM5 Calibration", "EPANET Calibration"]}
        rows={[
          ["Primary data", "Flow & depth hydrographs at manholes", "Pressure at hydrant tests, SCADA flows, tank levels"],
          ["Key parameters", "Imperviousness, width, slope, infiltration, Manning's n", "Pipe roughness C, junction demands, emitter coefficients"],
          ["Time scale", "Event-based (individual storms, hours)", "Operational (diurnal cycles, days to weeks)"],
          ["Difficulty", "High — nonlinear hydrology + hydraulics", "Moderate — primarily roughness adjustment"],
          ["Tools", "SRTC, PEST, manual", "Darwin Calibrator, WaterGEMS, manual C-factor"],
          ["Gold standard", "Long-term flow monitoring (RDII isolation)", "Fire flow test — measured ΔP at known Q"],
          ["Sensitivity", "Subcatchment width >> imperviousness > infiltration", "Roughness C > demands > minor losses"],
          ["Validation event", "Independent storm not used in calibration", "Independent demand condition (e.g., different season)"],
        ]}
        epanetCol={2} swmmCol={1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-4">
          <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 Calibration Workflow</div>
          <div className="space-y-2 text-xs text-slate-400">
            {[
              "1. Install flow monitors at key manholes",
              "2. Record 3+ storm events with rain gauge data",
              "3. Separate DWF from WWF (wet weather flow)",
              "4. Isolate RDII — R, T, K parameters per basin",
              "5. Adjust subcatchment width, imperviousness, infiltration",
              "6. Match peak flow, volume, timing, shape",
              "7. Validate on independent event",
              "8. Check continuity errors < 1-2%",
            ].map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-4">
          <div className="text-xs text-blue-400 font-semibold mb-2">EPANET Calibration Workflow</div>
          <div className="space-y-2 text-xs text-slate-400">
            {[
              "1. Conduct fire flow tests at hydrants (6+ locations)",
              "2. Record static & residual pressures + flow",
              "3. Collect SCADA data: tank levels, pump flows, pressures",
              "4. Set boundary conditions: tank levels, pump schedules",
              "5. Group pipes by age/material, adjust C-factors",
              "6. Match pressures at test locations within ±5 psi",
              "7. Verify tank fill/drain cycles match SCADA",
              "8. Check system flow balance < 1-2%",
            ].map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 9: SKELETONIZATION
// ═══════════════════════════════════════════════════════════════

function SkeletonTab() {
  const [origPipes, setOrigPipes] = useState(5000);
  const [minDia, setMinDia] = useState(6);
  const removedPct = Math.min(95, Math.max(0, (minDia - 2) * 12));
  const skelPipes = Math.round(origPipes * (1 - removedPct / 100));

  return (
    <div className="space-y-4">
      <SectionNote type="info">
        Both SWMM5 and EPANET models often need simplification, but for <strong>different reasons</strong>: EPANET for computation speed; SWMM5 for numerical stability (Courant condition).
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-4">
          <div className="text-xs text-blue-400 font-semibold mb-3">EPANET Skeletonization</div>
          <Slider label="Remove pipes below diameter" value={minDia} onChange={setMinDia} min={2} max={12} step={2} unit="in" color={COLORS.epanet} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatCard label="Original" value={origPipes.toLocaleString()} unit="pipes" color="text-slate-300" />
            <StatCard label="Skeletonized" value={skelPipes.toLocaleString()} unit="pipes" color="text-blue-300" sub={`${removedPct}% removed`} />
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>• Remove small-diameter pipes ({'<'} 6")</p>
            <p>• Collapse series pipes into equivalents</p>
            <p>• Merge close junctions, redistribute demands</p>
            <p>• Equivalent pipe: L_eq = L₁+L₂, solve for D_eq</p>
            <p><strong>Goal:</strong> Faster computation, maintain pressure accuracy at key nodes</p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-4">
          <div className="text-xs text-amber-400 font-semibold mb-3">SWMM5 Simplification</div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>• Combine subcatchments with similar characteristics</p>
            <p>• <strong>Lengthen short conduits</strong> to satisfy Courant condition: Δx ≥ V·Δt</p>
            <p>• Lump parallel pipes into equivalent single conduit</p>
            <p>• Simplify storage geometry (functional vs. tabular)</p>
            <p>• Remove insignificant dry-weather laterals</p>
            <p>• Replace complex cross-sections with circular equivalents</p>
            <p><strong>Goal:</strong> Numerical stability, reasonable runtimes, convergence</p>
          </div>
          <div className="mt-3 rounded bg-amber-900/20 border border-amber-700/30 p-2">
            <div className="text-xs text-amber-300 font-semibold mb-1">Courant Condition (DW)</div>
            <div className="text-xs text-slate-400 font-mono">
              Cr = (V + c) · Δt / Δx ≤ 1.0
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Short pipes with high velocity may require very small Δt — or lengthening.
            </div>
          </div>
        </div>
      </div>

      <CompTable
        headers={["Technique", "EPANET", "SWMM5"]}
        rows={[
          ["Series pipe merge", "L_eq, solve for equiv D & C", "Different — must preserve storage & inertia"],
          ["Parallel pipe merge", "Q_total = Q₁ + Q₂ at same ΔH", "Similar, but check surcharge behavior"],
          ["Node removal", "Redistribute demand to neighbors", "Redistribute loading to nearby subcatchments"],
          ["Dead-end trimming", "Common (cul-de-sacs)", "Rare — dead-ends unusual in collection systems"],
          ["Impact metric", "Pressure error at key nodes", "Flow/depth error at key manholes"],
        ]}
        epanetCol={1} swmmCol={2}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 10: SCADA & REAL-TIME
// ═══════════════════════════════════════════════════════════════

function ScadaTab() {
  return (
    <div className="space-y-4">
      <SectionNote type="info">
        Both tools are increasingly integrated with SCADA systems for real-time operation. EPANET-RTX and SWMM5 RTC rules represent different approaches to the same goal.
      </SectionNote>

      <CompTable
        headers={["Aspect", "SWMM5 Real-Time", "EPANET Real-Time"]}
        rows={[
          ["Extension", "RTC rules (built-in) / EPA-SWMM-R", "EPANET-RTX (external toolkit)"],
          ["SCADA inputs", "Rain gauges, flow meters, level sensors", "Tank levels, pump status, PRV settings, pressures"],
          ["Control logic", "Rule-based (IF-THEN-ELSE in .inp)", "Operational rules + pump schedules"],
          ["State estimation", "Limited — primarily I/I tracking", "Roughness, demand, leak detection"],
          ["Update frequency", "5 min – 1 hour typical", "5 min – 15 min typical"],
          ["Data mapping", "Flow → inflow TS; Level → storage TS", "Tank level → initial condition; Pump → on/off"],
          ["Commercial tools", "PCSWMM RT, ICM Live, MIKE", "Aquis, Elara, WaterSight, InfoWater Pro"],
          ["Key application", "CSO prediction, pump control", "Pressure management, energy optimization"],
        ]}
        epanetCol={2} swmmCol={1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-3">
          <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 RTC Rule Example</div>
          <pre className="text-xs text-amber-200/70 font-mono whitespace-pre overflow-x-auto">{`[CONTROLS]
;; Pump ON when wet well level > 5 ft
RULE R1
IF NODE WW1 DEPTH > 5.0
THEN PUMP P1 STATUS = ON

RULE R2  
IF NODE WW1 DEPTH < 2.0
THEN PUMP P1 STATUS = OFF`}</pre>
        </div>
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-3">
          <div className="text-xs text-blue-400 font-semibold mb-2">EPANET Control Rule Example</div>
          <pre className="text-xs text-blue-200/70 font-mono whitespace-pre overflow-x-auto">{`[CONTROLS]
;; Pump ON when tank level < 10 ft
LINK Pump1 OPEN IF NODE Tank1 BELOW 10.0
LINK Pump1 CLOSED IF NODE Tank1 ABOVE 25.0

[RULES]
RULE 1
IF SYSTEM CLOCKTIME >= 22:00
AND SYSTEM CLOCKTIME <= 06:00
AND TANK Tank1 LEVEL BELOW 20
THEN PUMP Pump1 STATUS IS OPEN`}</pre>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 11: MODEL INTEROPERABILITY
// ═══════════════════════════════════════════════════════════════

function InteropTab() {
  return (
    <div className="space-y-4">
      <SectionNote type="tip">
        Many real water/wastewater systems need <strong>both</strong> models. The collection system (SWMM5) delivers to treatment, and effluent enters the distribution system (EPANET). Understanding the handoff points is critical.
      </SectionNote>

      {/* Workflow diagram */}
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
        <div className="text-xs text-slate-500 font-semibold mb-3">Integrated Water System Workflow</div>
        <svg viewBox="0 0 600 150" className="w-full h-32">
          {/* SWMM5 zone */}
          <rect x="5" y="20" width="180" height="110" rx="8" fill="#F59E0B10" stroke="#F59E0B40" strokeWidth="1.5" />
          <text x="95" y="15" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="bold">SWMM5 Domain</text>
          <rect x="15" y="40" width="60" height="25" rx="4" fill="#F59E0B30" stroke="#F59E0B60" />
          <text x="45" y="57" textAnchor="middle" fill="#F59E0B" fontSize="8">Subcatch</text>
          <rect x="15" y="80" width="60" height="25" rx="4" fill="#F59E0B30" stroke="#F59E0B60" />
          <text x="45" y="97" textAnchor="middle" fill="#F59E0B" fontSize="8">Sewers</text>
          <rect x="110" y="60" width="65" height="30" rx="4" fill="#F59E0B50" stroke="#F59E0B80" />
          <text x="142" y="78" textAnchor="middle" fill="#F59E0B" fontSize="8" fontWeight="bold">Outfall</text>
          <line x1="75" y1="52" x2="110" y2="72" stroke="#F59E0B60" strokeWidth="1.5" />
          <line x1="75" y1="92" x2="110" y2="78" stroke="#F59E0B60" strokeWidth="1.5" />

          {/* Treatment */}
          <rect x="210" y="45" width="100" height="50" rx="8" fill="#10B98120" stroke="#10B98160" strokeWidth="1.5" />
          <text x="260" y="72" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="bold">Treatment</text>
          <text x="260" y="85" textAnchor="middle" fill="#10B98180" fontSize="7">WWTP / WTP</text>
          <line x1="175" y1="75" x2="210" y2="70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />

          {/* EPANET zone */}
          <rect x="340" y="20" width="250" height="110" rx="8" fill="#3B82F610" stroke="#3B82F640" strokeWidth="1.5" />
          <text x="465" y="15" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="bold">EPANET Domain</text>
          <rect x="350" y="45" width="65" height="30" rx="4" fill="#3B82F650" stroke="#3B82F680" />
          <text x="382" y="64" textAnchor="middle" fill="#3B82F6" fontSize="8" fontWeight="bold">Reservoir</text>
          <rect x="440" y="35" width="55" height="25" rx="4" fill="#3B82F630" stroke="#3B82F660" />
          <text x="467" y="52" textAnchor="middle" fill="#3B82F6" fontSize="8">Pipes</text>
          <rect x="440" y="70" width="55" height="25" rx="4" fill="#3B82F630" stroke="#3B82F660" />
          <text x="467" y="87" textAnchor="middle" fill="#3B82F6" fontSize="8">Demands</text>
          <rect x="520" y="50" width="55" height="25" rx="4" fill="#3B82F630" stroke="#3B82F660" />
          <text x="548" y="67" textAnchor="middle" fill="#3B82F6" fontSize="8">Tanks</text>
          <line x1="310" y1="70" x2="350" y2="60" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
          <line x1="415" y1="60" x2="440" y2="48" stroke="#3B82F660" strokeWidth="1.5" />
          <line x1="415" y1="60" x2="440" y2="82" stroke="#3B82F660" strokeWidth="1.5" />
          <line x1="495" y1="48" x2="520" y2="62" stroke="#3B82F660" strokeWidth="1.5" />

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>
      </div>

      <CompTable
        headers={["Integration Point", "How It Works", "Key Data Transfer"]}
        rows={[
          ["SWMM5 outfall → EPANET reservoir", "SWMM5 outfall flow becomes EPANET source input", "Flow time series → demand or source pattern"],
          ["Treatment plant effluent", "WTP clearwell modeled as EPANET reservoir", "Effluent quality → source concentration"],
          ["CSO impact on source water", "CSO discharge (SWMM5) near WTP intake (EPANET)", "Pollutant loads → source water quality"],
          ["Pump station boundary", "SWMM5 force main → EPANET pump station", "Flow rate, TDH, energy"],
        ]}
      />

      <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
        <div className="text-xs text-slate-500 font-semibold mb-2">Commercial Integrated Platforms</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { name: "InfoWorks ICM", desc: "Full collection + distribution in one model" },
            { name: "MIKE+", desc: "MIKE URBAN combines both domains" },
            { name: "PCSWMM / SWMM5+", desc: "SWMM5 + EPANET under one GIS interface" },
            { name: "Innovyze suite", desc: "InfoSWMM + InfoWater in ArcGIS" },
          ].map((t) => (
            <div key={t.name} className="rounded bg-slate-900/40 border border-slate-700/30 p-2">
              <div className="font-semibold text-slate-300">{t.name}</div>
              <div className="text-slate-500 mt-0.5">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 12: GIS INTEGRATION
// ═══════════════════════════════════════════════════════════════

function GisTab() {
  return (
    <div className="space-y-4">
      <CompTable
        headers={["GIS Aspect", "SWMM5", "EPANET"]}
        rows={[
          ["Native GIS", "None (coordinates only)", "None (coordinates only)"],
          ["Common GIS tools", "PCSWMM, ICM, XPSWMM, QGIS plugin", "WaterGEMS, WaterCAD, QGIS sketcher/plugin"],
          ["Elevation source", "LiDAR for inverts, rim elevations", "DEM for junction elevation"],
          ["Key GIS data", "Land use → imperviousness; soil → infiltration; pipe survey → inverts", "Pipe records (AM/FM); billing → demands; DEM; pressure zone boundaries"],
          ["Coordinate section", "[COORDINATES] — same format!", "[COORDINATES] — same format!"],
          ["Backdrop", "SWMM5 GUI supports images", "EPANET GUI supports images"],
          ["Polygon data", "[POLYGONS] for subcatchments", "N/A (no subcatchments)"],
          ["Typical CRS", "State Plane / UTM", "State Plane / UTM"],
        ]}
        epanetCol={2} swmmCol={1}
      />

      <SectionNote type="tip">
        Both SWMM5 and EPANET use identical [COORDINATES] formats — simply X, Y pairs for each node. GIS integration is handled entirely by third-party tools, not the engines themselves. This is an area where InfoWorks ICM, WaterGEMS, and PCSWMM add tremendous value.
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-3">
          <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 GIS Data Needs</div>
          <div className="space-y-1 text-xs text-slate-400">
            {["LiDAR → manhole rim & invert elevations", "Land use → impervious %, roughness n",
              "Soil survey → infiltration parameters (Green-Ampt, Horton)", "CCTV records → pipe condition, I/I sources",
              "Rain gauge network → precipitation input", "DWF allocations from billing/census data"].map((s, i) => (
              <div key={i} className="flex items-center gap-2"><span className="text-amber-500">•</span>{s}</div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-3">
          <div className="text-xs text-blue-400 font-semibold mb-2">EPANET GIS Data Needs</div>
          <div className="space-y-1 text-xs text-slate-400">
            {["Pipe records → diameter, material, install year → C-factor", "DEM → junction ground/service elevation",
              "Meter/billing data → demand allocation to junctions", "Pressure zone boundaries → PRV/pump locations",
              "Hydrant locations → fire flow analysis nodes", "Tank/reservoir locations → boundary conditions"].map((s, i) => (
              <div key={i} className="flex items-center gap-2"><span className="text-blue-500">•</span>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 13: REPORTING & OUTPUT
// ═══════════════════════════════════════════════════════════════

function ReportingTab() {
  return (
    <div className="space-y-4">
      <CompTable
        headers={["Output", "SWMM5", "EPANET"]}
        rows={[
          ["Report file", ".rpt — text summary + detailed tables", ".rpt — text summary + node/link tables"],
          ["Binary output", ".out — time-indexed binary", ".out — time-indexed binary"],
          ["Continuity check", "Runoff + routing volume balance (%)", "System flow balance (total in vs. out)"],
          ["Node outputs", "Depth, head, volume, flooding, quality", "Demand, head, pressure, quality"],
          ["Link outputs", "Flow, velocity, depth, d/D, Froude", "Flow, velocity, headloss, status"],
          ["Special reports", "LID performance, storage utilization", "Energy report (kWh, cost, efficiency/pump)"],
          ["Acceptable error", "Continuity < 1-2% for each component", "System balance < 1-2%"],
          ["Status messages", "Routing errors, instabilities", "Negative pressures, disconnected nodes"],
        ]}
        epanetCol={2} swmmCol={1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-3">
          <div className="text-xs text-amber-400 font-semibold mb-2">SWMM5 .rpt Key Sections</div>
          <pre className="text-xs text-amber-200/60 font-mono whitespace-pre overflow-x-auto">{`** Runoff Quantity Continuity **
  Total Precipitation ..  3.200 in
  Evaporation Loss .....  0.042 in
  Infiltration Loss ....  1.285 in
  Surface Runoff .......  1.854 in
  Continuity Error (%)..  0.59

** Flow Routing Continuity **
  Dry Weather Inflow ...  2.156 MG
  Wet Weather Inflow ...  4.832 MG
  Flooding Loss ........  0.052 MG
  Routing Error (%) ...  0.23`}</pre>
        </div>
        <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-3">
          <div className="text-xs text-blue-400 font-semibold mb-2">EPANET .rpt Key Sections</div>
          <pre className="text-xs text-blue-200/60 font-mono whitespace-pre overflow-x-auto">{`** System Flow Balance **
  Total Produced ....... 4.56 MGD
  Total Consumed ....... 4.49 MGD
  System Leakage ....... 0.00 MGD

** Energy Usage **
  Pump      Pct Util  Avg Eff  kWh/MG  Avg kW  Peak kW  Cost/day
  Pump1     85.42     76.3     421.2   45.3    52.1     $130.42
  Pump2     42.17     71.8     488.7   38.1    44.8     $55.78

  Total Cost/day: $186.20`}</pre>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 14: PIPE AGING / CONDITION
// ═══════════════════════════════════════════════════════════════

function AgingTab() {
  const [material, setMaterial] = useState("cast_iron");
  const [ageYears, setAgeYears] = useState(40);

  const materials = {
    cast_iron: { name: "Cast Iron (Unlined)", cNew: 130, cMin: 50, nNew: 0.012, nMax: 0.02, halfLife: 40 },
    ductile_iron: { name: "Ductile Iron", cNew: 140, cMin: 90, nNew: 0.011, nMax: 0.016, halfLife: 60 },
    pvc: { name: "PVC", cNew: 150, cMin: 140, nNew: 0.009, nMax: 0.011, halfLife: 100 },
    concrete: { name: "Concrete / RCP", cNew: 130, cMin: 80, nNew: 0.013, nMax: 0.018, halfLife: 50 },
    hdpe: { name: "HDPE", cNew: 150, cMin: 145, nNew: 0.009, nMax: 0.01, halfLife: 100 },
  };

  const mat = materials[material];
  const ageFrac = 1 - Math.exp(-ageYears / mat.halfLife);
  const currentC = Math.round(mat.cNew - (mat.cNew - mat.cMin) * ageFrac);
  const currentN = parseFloat((mat.nNew + (mat.nMax - mat.nNew) * ageFrac).toFixed(4));

  const agingData = useMemo(() => {
    const pts = [];
    for (let yr = 0; yr <= 100; yr += 2) {
      const frac = 1 - Math.exp(-yr / mat.halfLife);
      pts.push({
        year: yr,
        C: Math.round(mat.cNew - (mat.cNew - mat.cMin) * frac),
        n: parseFloat((mat.nNew + (mat.nMax - mat.nNew) * frac).toFixed(4)),
      });
    }
    return pts;
  }, [material]);

  return (
    <div className="space-y-4">
      <SectionNote type="info">
        Pipe aging affects both models differently: EPANET sees <strong>lower C-factor → higher headloss → lower pressures</strong>. SWMM5 sees <strong>higher Manning's n → reduced capacity → earlier surcharging</strong>.
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <div className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">Pipe Material & Age</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(materials).map(([k, m]) => (
                <button key={k} onClick={() => setMaterial(k)}
                  className={`px-2.5 py-1 rounded text-xs transition-all border ${
                    material === k ? "bg-sky-900/40 border-sky-600/50 text-sky-300" : "bg-slate-800/40 border-slate-700/30 text-slate-400"
                  }`}>{m.name}</button>
              ))}
            </div>
            <Slider label="Pipe Age" value={ageYears} onChange={setAgeYears} min={0} max={100} unit="years" color={COLORS.accent} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-950/20 border border-blue-700/30 p-3 text-center">
              <div className="text-xs text-blue-400 mb-1">EPANET C-Factor</div>
              <div className="text-2xl font-bold text-blue-300">{currentC}</div>
              <div className="text-xs text-slate-500">New: {mat.cNew} → Min: {mat.cMin}</div>
            </div>
            <div className="rounded-lg bg-amber-950/20 border border-amber-700/30 p-3 text-center">
              <div className="text-xs text-amber-400 mb-1">SWMM5 Manning's n</div>
              <div className="text-2xl font-bold text-amber-300">{currentN}</div>
              <div className="text-xs text-slate-500">New: {mat.nNew} → Max: {mat.nMax}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
          <div className="text-xs text-slate-500 mb-2 font-semibold">Roughness Degradation Over Time</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={agingData} margin={{ top: 5, right: 15, bottom: 20, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#475569" tick={{ fontSize: 9 }}
                label={{ value: "Pipe Age (years)", position: "bottom", offset: 5, fill: "#64748b", fontSize: 9 }} />
              <YAxis yAxisId="c" stroke="#3B82F6" tick={{ fontSize: 9 }}
                label={{ value: "H-W C", angle: -90, position: "insideLeft", fill: "#3B82F6", fontSize: 9 }} />
              <YAxis yAxisId="n" orientation="right" stroke="#F59E0B" tick={{ fontSize: 9 }}
                label={{ value: "Manning n", angle: 90, position: "insideRight", fill: "#F59E0B", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 10 }} />
              <ReferenceLine x={ageYears} stroke="#94a3b8" strokeDasharray="4 4"
                label={{ value: `${ageYears} yr`, position: "top", fill: "#94a3b8", fontSize: 9 }} />
              <Line yAxisId="c" type="monotone" dataKey="C" stroke={COLORS.epanet} strokeWidth={2.5} dot={false} name="C-Factor" />
              <Line yAxisId="n" type="monotone" dataKey="n" stroke={COLORS.swmm} strokeWidth={2.5} dot={false} name="Manning's n" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 15: TRANSIENT MODELING
// ═══════════════════════════════════════════════════════════════

function TransientTab() {
  const [velocity, setVelocity] = useState(4.0);
  const [celerity, setCelerity] = useState(3200);
  const [pipeLen, setPipeLen] = useState(5000);
  const [closureTime, setClosureTime] = useState(5);

  const criticalTime = (2 * pipeLen / celerity).toFixed(2);
  const isSudden = closureTime < parseFloat(criticalTime);
  const joukowsky = (celerity * velocity / 32.2).toFixed(1); // ft of head
  const joukowskyPsi = (parseFloat(joukowsky) * 0.433).toFixed(1);

  return (
    <div className="space-y-4">
      <SectionNote type="warning">
        Pressure transients (water hammer) can destroy pipes. EPANET itself is <strong>steady-state/EPS only</strong> — transient analysis requires HAMMER, AFT Impulse, or similar. SWMM5's dynamic wave captures free-surface transients but NOT pressure wave propagation.
      </SectionNote>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-4">
            <div className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Transient Parameters</div>
            <Slider label="Steady-State Velocity" value={velocity} onChange={setVelocity} min={0.5} max={10} step={0.5} unit="ft/s" />
            <Slider label="Wave Celerity" value={celerity} onChange={setCelerity} min={1000} max={4500} step={100} unit="ft/s" color={COLORS.accent} />
            <Slider label="Pipe Length" value={pipeLen} onChange={setPipeLen} min={500} max={20000} step={500} unit="ft" color={COLORS.green} />
            <Slider label="Valve Closure Time" value={closureTime} onChange={setClosureTime} min={0.5} max={30} step={0.5} unit="sec" color={COLORS.red} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Joukowsky ΔH" value={joukowsky} unit="ft" color="text-red-300" sub={`${joukowskyPsi} psi`} />
            <StatCard label="Critical Time (2L/a)" value={criticalTime} unit="sec" color="text-sky-300" sub={isSudden ? "⚠️ SUDDEN CLOSURE" : "✓ Slow closure"} />
          </div>
        </div>

        <div className="space-y-3">
          <CompTable
            headers={["Transient Type", "SWMM5 Dynamic Wave", "Dedicated Transient Solver"]}
            rows={[
              ["Wave type", "Free-surface / Preissmann slot", "Pressure wave (Method of Characteristics)"],
              ["Wave speed", "√(gA/T) ≈ 1-15 ft/s", "a ≈ 1,000-4,500 ft/s (acoustic)"],
              ["Time step", "0.5-30 sec typical", "0.001-0.01 sec (Courant on 'a')"],
              ["Captures", "Surcharge, backwater, flooding", "Water hammer, column separation, surge"],
              ["Tools", "SWMM5 DW, ICM, MIKE+", "HAMMER, AFT Impulse, Hytran"],
            ]}
          />

          <SectionNote type="tip">
            SWMM5's <strong>Preissmann slot</strong> approximation converts free-surface flow to a narrow pressurized slot, allowing the Saint-Venant equations to handle surcharge. But the "celerity" in the slot is much slower than a true acoustic pressure wave — so SWMM5 cannot model water hammer.
          </SectionNote>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { key: "valves", label: "Valve Types", icon: "🔧", priority: "high", component: ValveTab },
  { key: "fireflow", label: "Fire Flow", icon: "🔥", priority: "high", component: FireFlowTab },
  { key: "pump", label: "Pump Energy", icon: "⚡", priority: "high", component: PumpEnergyTab },
  { key: "demand", label: "Demand Alloc", icon: "🏘️", priority: "med", component: DemandTab },
  { key: "topology", label: "Topology", icon: "🔀", priority: "med", component: TopologyTab },
  { key: "design", label: "Design Criteria", icon: "📏", priority: "med", component: DesignCriteriaTab },
  { key: "pattern", label: "Patterns", icon: "📊", priority: "med", component: PatternTab },
  { key: "calib", label: "Calibration", icon: "🎯", priority: "med", component: CalibrationTab },
  { key: "skeleton", label: "Skeletonize", icon: "✂️", priority: "low", component: SkeletonTab },
  { key: "scada", label: "SCADA/RT", icon: "📡", priority: "low", component: ScadaTab },
  { key: "interop", label: "Interop", icon: "🔄", priority: "low", component: InteropTab },
  { key: "gis", label: "GIS", icon: "🗺️", priority: "low", component: GisTab },
  { key: "reporting", label: "Reporting", icon: "📋", priority: "low", component: ReportingTab },
  { key: "aging", label: "Pipe Aging", icon: "🔩", priority: "low", component: AgingTab },
  { key: "transient", label: "Transients", icon: "💥", priority: "low", component: TransientTab },
];

export default function EPANETExpansion() {
  const [activeTab, setActiveTab] = useState("valves");
  const [filter, setFilter] = useState("all");

  const filteredTabs = filter === "all" ? TABS : TABS.filter((t) => t.priority === filter);
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component || ValveTab;

  return (
    <div style={{
      background: "linear-gradient(155deg, #060D1A 0%, #0B1628 40%, #091220 100%)",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      minHeight: "100vh",
    }}>
      <style>{`
        :root { --sans: 'Inter', system-ui, -apple-system, sans-serif; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: #e2e8f0; cursor: pointer;
          border: 2px solid #334155;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #e2e8f0; cursor: pointer; border: 2px solid #334155;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #3B82F6, #F59E0B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff",
          }}>⟷</div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "var(--sans)" }}>
              EPANET ↔ SWMM5 Rosetta Stone
            </h1>
            <p className="text-xs text-slate-500" style={{ fontFamily: "var(--sans)" }}>
              15 Interactive Modules — Advanced Topics for Cross-Domain Experts
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        {/* Priority filter */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500" style={{ fontFamily: "var(--sans)" }}>Priority:</span>
          {[
            { key: "all", label: "All 15", color: "text-slate-300" },
            { key: "high", label: "🔴 High", color: "text-red-400" },
            { key: "med", label: "🟡 Medium", color: "text-amber-400" },
            { key: "low", label: "🟢 Lower", color: "text-emerald-400" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded text-xs transition-all border ${
                filter === f.key
                  ? "bg-slate-700/60 border-slate-500/50 text-white"
                  : "bg-slate-800/30 border-slate-700/20 text-slate-500 hover:text-slate-300"
              }`} style={{ fontFamily: "var(--sans)" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 mb-4 scrollbar-thin">
          {filteredTabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-slate-700/70 border-slate-500/50 text-white shadow-lg"
                  : "bg-slate-800/30 border-slate-700/20 text-slate-500 hover:text-slate-300 hover:border-slate-600/40"
              }`} style={{ fontFamily: "var(--sans)" }}>
              <span className="mr-1">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-4">
          <ActiveComponent />
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pt-4" style={{ fontFamily: "var(--sans)" }}>
          EPANET ↔ SWMM5 Rosetta Stone — Extended Edition • 15 Modules •
          Based on EPA SWMM 5.2 & EPANET 2.2 • swmm5.org
        </div>
      </div>
    </div>
  );
}
