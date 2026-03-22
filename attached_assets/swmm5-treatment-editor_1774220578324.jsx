import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── SWMM5 Treatment Functions & Constants ───
const PROCESS_VARS = [
  { name: "HRT", desc: "Hydraulic Residence Time (hours)", unit: "hrs" },
  { name: "DT", desc: "Time step (seconds)", unit: "sec" },
  { name: "FLOW", desc: "Flow rate into node", unit: "CFS/CMS" },
  { name: "DEPTH", desc: "Water depth above node invert", unit: "ft/m" },
  { name: "AREA", desc: "Node surface area", unit: "ft²/m²" },
];

const MATH_FUNCS = [
  { name: "EXP", sig: "EXP(x)", desc: "Exponential e^x" },
  { name: "LOG", sig: "LOG(x)", desc: "Natural logarithm" },
  { name: "LOG10", sig: "LOG10(x)", desc: "Base-10 logarithm" },
  { name: "SQRT", sig: "SQRT(x)", desc: "Square root" },
  { name: "ABS", sig: "ABS(x)", desc: "Absolute value" },
  { name: "STEP", sig: "STEP(x)", desc: "0 if x≤0, else 1" },
  { name: "SIGN", sig: "SIGN(x)", desc: "-1, 0, or +1" },
  { name: "MIN", sig: "MIN(x,y)", desc: "Minimum of x and y" },
  { name: "MAX", sig: "MAX(x,y)", desc: "Maximum of x and y" },
  { name: "SGN", sig: "SGN(x)", desc: "Same as SIGN" },
];

const TEMPLATES = [
  {
    name: "Exponential Decay (1st Order)",
    category: "kinetic",
    expr: "C = C_IN * EXP(-k * HRT)",
    desc: "First-order decay based on residence time. k is the decay rate constant (1/hr).",
    params: { k: 0.5 },
    icon: "📉",
  },
  {
    name: "Constant Removal %",
    category: "simple",
    expr: "R = removal_pct",
    desc: "Removes a fixed percentage of influent concentration.",
    params: { removal_pct: 75 },
    icon: "✂️",
  },
  {
    name: "Concentration Cap",
    category: "simple",
    expr: "C = MIN(C_IN, max_conc)",
    desc: "Caps effluent at a maximum concentration.",
    params: { max_conc: 20 },
    icon: "🔒",
  },
  {
    name: "Kadlec-Knight (Wetland k-C*)",
    category: "kinetic",
    expr: "C = C_star + (C_IN - C_star) * EXP(-k * HRT)",
    desc: "Wetland treatment with background concentration C*. Common for TSS, BOD, nutrients.",
    params: { k: 0.3, C_star: 5 },
    icon: "🌿",
  },
  {
    name: "Settling (Overflow Rate)",
    category: "physical",
    expr: "C = C_IN * EXP(-vs * AREA / FLOW)",
    desc: "Particle settling based on surface overflow rate. vs = settling velocity.",
    params: { vs: 0.01 },
    icon: "⬇️",
  },
  {
    name: "Depth-Dependent Removal",
    category: "physical",
    expr: "R = k * DEPTH * STEP(DEPTH - d_min)",
    desc: "Removal increases with depth above a minimum threshold.",
    params: { k: 15, d_min: 0.5 },
    icon: "📐",
  },
  {
    name: "Co-Removal (Linked Pollutant)",
    category: "linked",
    expr: "R = f * R_TSS",
    desc: "Removal fraction linked to TSS removal. Common for metals, phosphorus.",
    params: { f: 0.6 },
    icon: "🔗",
  },
  {
    name: "Two-Stage (Fast + Slow)",
    category: "kinetic",
    expr: "C = C_IN * (a * EXP(-k1 * HRT) + (1 - a) * EXP(-k2 * HRT))",
    desc: "Bi-exponential: fast-settling + slow-settling fractions.",
    params: { a: 0.6, k1: 2.0, k2: 0.2 },
    icon: "⚡",
  },
];

const POLLUTANT_PRESETS = [
  { name: "TSS", units: "mg/L", typical_in: 150, color: "#8B4513" },
  { name: "BOD", units: "mg/L", typical_in: 120, color: "#228B22" },
  { name: "COD", units: "mg/L", typical_in: 250, color: "#2E8B57" },
  { name: "TN", units: "mg/L", typical_in: 8, color: "#4169E1" },
  { name: "TP", units: "mg/L", typical_in: 2.5, color: "#9932CC" },
  { name: "Zn", units: "μg/L", typical_in: 200, color: "#708090" },
  { name: "Cu", units: "μg/L", typical_in: 50, color: "#B87333" },
  { name: "Pb", units: "μg/L", typical_in: 80, color: "#36454F" },
  { name: "E.coli", units: "MPN/100mL", typical_in: 50000, color: "#DC143C" },
  { name: "Fecal Coliform", units: "MPN/100mL", typical_in: 100000, color: "#FF4500" },
];

// ─── Safe Expression Evaluator ───
function evalTreatment(expr, vars) {
  try {
    let e = expr.trim();
    // Determine if C= or R= form
    let isRemoval = false;
    let formula = e;
    if (/^R\s*=/i.test(e)) {
      isRemoval = true;
      formula = e.replace(/^R\s*=\s*/i, "");
    } else if (/^C\s*=/i.test(e)) {
      isRemoval = false;
      formula = e.replace(/^C\s*=\s*/i, "");
    }
    // Replace SWMM functions
    let js = formula
      .replace(/\bEXP\b/gi, "Math.exp")
      .replace(/\bLOG10\b/gi, "Math.log10")
      .replace(/\bLOG\b/gi, "Math.log")
      .replace(/\bSQRT\b/gi, "Math.sqrt")
      .replace(/\bABS\b/gi, "Math.abs")
      .replace(/\bMIN\b/gi, "Math.min")
      .replace(/\bMAX\b/gi, "Math.max")
      .replace(/\bSTEP\b/gi, "((x)=>(x>0?1:0))")
      .replace(/\bSIGN\b/gi, "Math.sign")
      .replace(/\bSGN\b/gi, "Math.sign")
      .replace(/\bPI\b/gi, "Math.PI");
    // Replace variables
    for (const [k, v] of Object.entries(vars)) {
      const re = new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\b", "g");
      js = js.replace(re, `(${v})`);
    }
    const val = Function(`"use strict"; return (${js})`)();
    return { value: isRemoval ? val : val, isRemoval, raw: val };
  } catch (err) {
    return { value: NaN, isRemoval: false, raw: NaN, error: err.message };
  }
}

function validateExpression(expr) {
  if (!expr.trim()) return { valid: false, msg: "Expression is empty" };
  if (!/^(C|R)\s*=/i.test(expr.trim()))
    return { valid: false, msg: "Must start with C = or R =" };
  const test = evalTreatment(expr, {
    C_IN: 100, HRT: 1, DT: 300, FLOW: 10, DEPTH: 3, AREA: 500,
    R_TSS: 80, C_TSS: 30, k: 1, vs: 0.01, removal_pct: 75,
    C_star: 5, d_min: 0.5, f: 0.6, a: 0.6, k1: 2, k2: 0.2, max_conc: 20,
  });
  if (isNaN(test.raw)) return { valid: false, msg: test.error || "Cannot evaluate" };
  if (!isFinite(test.raw)) return { valid: false, msg: "Result is infinite" };
  return { valid: true, msg: "Valid expression" };
}

// ─── Components ───

function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-sky-900/40 text-sky-300 border-sky-700/50",
    green: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
    amber: "bg-amber-900/40 text-amber-300 border-amber-700/50",
    red: "bg-red-900/40 text-red-300 border-red-700/50",
    purple: "bg-purple-900/40 text-purple-300 border-purple-700/50",
    gray: "bg-slate-700/40 text-slate-300 border-slate-600/50",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${colors[color]}`}>
      {children}
    </span>
  );
}

function InsertButton({ label, onClick, desc, compact }) {
  return (
    <button
      onClick={onClick}
      title={desc}
      className={`${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} 
        rounded font-mono bg-slate-700/60 hover:bg-sky-800/60 text-slate-200 
        hover:text-sky-200 border border-slate-600/40 hover:border-sky-500/50 
        transition-all duration-150 active:scale-95`}
    >
      {label}
    </button>
  );
}

// ─── Main App ───
export default function SWMM5TreatmentEditor() {
  // State
  const [pollutants, setPollutants] = useState([
    { name: "TSS", units: "mg/L", C_in: 150, expr: "C = C_IN * EXP(-0.5 * HRT)", color: "#8B4513" },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [addPollName, setAddPollName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [simHRT, setSimHRT] = useState([0, 24]);
  const [simSteps, setSimSteps] = useState(100);
  const [simFlow, setSimFlow] = useState(10);
  const [simDepth, setSimDepth] = useState(3);
  const [simArea, setSimArea] = useState(500);
  const [showExport, setShowExport] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [tabView, setTabView] = useState("curve"); // curve | table | swmm
  const exprRef = useRef(null);

  const active = pollutants[activeIdx] || pollutants[0];

  // Insert text at cursor
  const insertAtCursor = useCallback((text) => {
    const el = exprRef.current;
    if (!el) return;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const newVal = val.substring(0, start) + text + val.substring(end);
    updateExpr(newVal);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
    }, 0);
  }, [activeIdx]);

  const updateExpr = (newExpr) => {
    setPollutants((prev) =>
      prev.map((p, i) => (i === activeIdx ? { ...p, expr: newExpr } : p))
    );
  };

  const updateCin = (val) => {
    setPollutants((prev) =>
      prev.map((p, i) => (i === activeIdx ? { ...p, C_in: val } : p))
    );
  };

  const validation = useMemo(() => validateExpression(active.expr), [active.expr]);

  // Simulation data
  const simData = useMemo(() => {
    const dt = (simHRT[1] - simHRT[0]) / simSteps;
    const pts = [];
    for (let i = 0; i <= simSteps; i++) {
      const hrt = simHRT[0] + i * dt;
      const vars = {
        C_IN: active.C_in, HRT: hrt, DT: dt * 3600,
        FLOW: simFlow, DEPTH: simDepth, AREA: simArea,
        R_TSS: 80, C_TSS: 30,
        k: 0.5, vs: 0.01, removal_pct: 75, C_star: 5,
        d_min: 0.5, f: 0.6, a: 0.6, k1: 2.0, k2: 0.2, max_conc: 20,
      };
      // Extract custom params from expression
      const customParamRegex = /\b([a-z_]\w*)\b/gi;
      let match;
      while ((match = customParamRegex.exec(active.expr)) !== null) {
        const token = match[1];
        if (!vars.hasOwnProperty(token) && !/^(C|R|EXP|LOG|LOG10|SQRT|ABS|STEP|SIGN|SGN|MIN|MAX|PI)$/i.test(token)) {
          // Assign a default
          if (!vars[token]) vars[token] = 1;
        }
      }
      const result = evalTreatment(active.expr, vars);
      let C_out, removal;
      if (result.isRemoval) {
        removal = Math.max(0, Math.min(100, result.raw));
        C_out = active.C_in * (1 - removal / 100);
      } else {
        C_out = Math.max(0, result.raw);
        removal = active.C_in > 0 ? ((active.C_in - C_out) / active.C_in) * 100 : 0;
      }
      pts.push({
        hrt: parseFloat(hrt.toFixed(3)),
        C_in: active.C_in,
        C_out: parseFloat(C_out.toFixed(3)),
        removal: parseFloat(removal.toFixed(1)),
      });
    }
    return pts;
  }, [active.expr, active.C_in, simHRT, simSteps, simFlow, simDepth, simArea]);

  // Multi-pollutant overlay
  const multiData = useMemo(() => {
    if (pollutants.length < 2) return null;
    const dt = (simHRT[1] - simHRT[0]) / simSteps;
    const pts = [];
    for (let i = 0; i <= simSteps; i++) {
      const hrt = simHRT[0] + i * dt;
      const row = { hrt: parseFloat(hrt.toFixed(3)) };
      pollutants.forEach((p) => {
        const vars = {
          C_IN: p.C_in, HRT: hrt, DT: dt * 3600,
          FLOW: simFlow, DEPTH: simDepth, AREA: simArea,
          R_TSS: 80, C_TSS: 30, k: 0.5, vs: 0.01, removal_pct: 75,
          C_star: 5, d_min: 0.5, f: 0.6, a: 0.6, k1: 2, k2: 0.2, max_conc: 20,
        };
        const r = evalTreatment(p.expr, vars);
        let rem;
        if (r.isRemoval) {
          rem = Math.max(0, Math.min(100, r.raw));
        } else {
          const co = Math.max(0, r.raw);
          rem = p.C_in > 0 ? ((p.C_in - co) / p.C_in) * 100 : 0;
        }
        row[`${p.name}_removal`] = parseFloat(rem.toFixed(1));
      });
      pts.push(row);
    }
    return pts;
  }, [pollutants, simHRT, simSteps, simFlow, simDepth, simArea]);

  // SWMM5 export text
  const swmmText = useMemo(() => {
    let lines = "[TREATMENT]\n;;Node           Pollutant        Expression\n;;-------------- ---------------- ----------\n";
    pollutants.forEach((p) => {
      lines += `Node1            ${p.name.padEnd(16)} ${p.expr}\n`;
    });
    return lines;
  }, [pollutants]);

  const addPollutant = (preset) => {
    if (pollutants.find((p) => p.name === preset.name)) return;
    setPollutants((prev) => [
      ...prev,
      { name: preset.name, units: preset.units, C_in: preset.typical_in, expr: "C = C_IN * EXP(-0.5 * HRT)", color: preset.color },
    ]);
    setActiveIdx(pollutants.length);
    setShowAddPoll(false);
  };

  const addCustomPollutant = () => {
    if (!addPollName.trim() || pollutants.find((p) => p.name === addPollName.trim())) return;
    setPollutants((prev) => [
      ...prev,
      { name: addPollName.trim(), units: "mg/L", C_in: 100, expr: "C = C_IN * EXP(-0.5 * HRT)", color: "#607D8B" },
    ]);
    setActiveIdx(pollutants.length);
    setAddPollName("");
    setShowAddPoll(false);
  };

  const removePollutant = (idx) => {
    if (pollutants.length <= 1) return;
    setPollutants((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, activeIdx - (idx <= activeIdx ? 1 : 0)));
  };

  const applyTemplate = (t) => {
    updateExpr(t.expr);
    setShowTemplates(false);
  };

  return (
    <div style={{ 
      background: "linear-gradient(145deg, #0B1120 0%, #0F1A2E 30%, #0D1525 100%)",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      minHeight: "100vh",
    }}>
      {/* ─── Header ─── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #0EA5E9, #6366F1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
          }}>T</div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              SWMM5 Treatment Editor
            </h1>
            <p className="text-xs text-slate-500">
              Visual expression builder with live simulation
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        {/* ─── Pollutant Tabs ─── */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {pollutants.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setActiveIdx(i)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                i === activeIdx
                  ? "bg-slate-700/80 text-white border border-sky-500/50 shadow-lg shadow-sky-500/10"
                  : "bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:border-slate-600/50 hover:text-slate-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{p.name}</span>
              {pollutants.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); removePollutant(i); }}
                  className="ml-1 text-xs text-slate-500 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >✕</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowAddPoll(!showAddPoll)}
            className="px-2.5 py-1.5 rounded-lg text-sm bg-slate-800/40 text-sky-400 border border-dashed border-slate-600/40 hover:border-sky-500/50 hover:bg-sky-900/20 transition-all"
          >+ Add</button>
        </div>

        {/* Add pollutant dropdown */}
        {showAddPoll && (
          <div className="mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Common Pollutants</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {POLLUTANT_PRESETS.filter(pp => !pollutants.find(p => p.name === pp.name)).map((pp) => (
                <button key={pp.name} onClick={() => addPollutant(pp)}
                  className="px-2.5 py-1 rounded text-xs bg-slate-700/50 hover:bg-sky-800/40 text-slate-300 hover:text-sky-300 border border-slate-600/30 hover:border-sky-500/40 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ background: pp.color }} />
                  {pp.name} <span className="text-slate-500 ml-1">{pp.typical_in} {pp.units}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={addPollName} onChange={(e) => setAddPollName(e.target.value)}
                placeholder="Custom pollutant name..." 
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-600/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
                onKeyDown={(e) => e.key === "Enter" && addCustomPollutant()}
              />
              <button onClick={addCustomPollutant}
                className="px-3 py-1.5 rounded-lg text-sm bg-sky-700/40 hover:bg-sky-600/50 text-sky-300 border border-sky-600/40 transition-all">Add</button>
            </div>
          </div>
        )}

        {/* ─── Expression Editor ─── */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/40 bg-slate-800/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                Treatment Expression
              </span>
              <span className="w-2 h-2 rounded-full" style={{ background: active.color }} />
              <span className="text-xs text-slate-500">{active.name} ({active.units})</span>
            </div>
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <Badge color="green">✓ Valid</Badge>
              ) : (
                <Badge color="red">✗ {validation.msg}</Badge>
              )}
            </div>
          </div>

          {/* Expression input */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sky-400 font-bold text-sm">{/^R\s*=/i.test(active.expr) ? "R" : "C"} =</span>
              <textarea
                ref={exprRef}
                value={active.expr}
                onChange={(e) => updateExpr(e.target.value)}
                rows={2}
                spellCheck={false}
                className="flex-1 bg-slate-900/70 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono border border-slate-600/30 focus:outline-none focus:border-sky-500/60 resize-none"
                placeholder="C = C_IN * EXP(-0.5 * HRT)"
              />
            </div>

            {/* Influent concentration */}
            <div className="flex items-center gap-3 mb-3 px-1">
              <span className="text-xs text-slate-400 whitespace-nowrap" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>C_IN =</span>
              <input type="number" value={active.C_in} onChange={(e) => updateCin(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
              />
              <span className="text-xs text-slate-500">{active.units}</span>
              <button onClick={() => setShowTemplates(!showTemplates)}
                className="ml-auto px-3 py-1 rounded-lg text-xs bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 border border-purple-600/30 hover:border-purple-500/40 transition-all"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >📋 Templates</button>
              <button onClick={() => setShowReference(!showReference)}
                className="px-3 py-1 rounded-lg text-xs bg-slate-700/40 hover:bg-slate-600/50 text-slate-300 border border-slate-600/30 hover:border-slate-500/40 transition-all"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >📖 Reference</button>
            </div>

            {/* Quick-insert palette */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 mr-1 w-14 shrink-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Vars</span>
                <InsertButton label="C_IN" onClick={() => insertAtCursor("C_IN")} desc="Influent concentration" compact />
                {PROCESS_VARS.map((v) => (
                  <InsertButton key={v.name} label={v.name} onClick={() => insertAtCursor(v.name)} desc={`${v.desc} (${v.unit})`} compact />
                ))}
                {pollutants.filter((p, i) => i !== activeIdx).map((p) => (
                  <InsertButton key={`R_${p.name}`} label={`R_${p.name}`} onClick={() => insertAtCursor(`R_${p.name}`)} desc={`Removal % of ${p.name}`} compact />
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 mr-1 w-14 shrink-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Funcs</span>
                {MATH_FUNCS.map((f) => (
                  <InsertButton key={f.name} label={f.name} onClick={() => insertAtCursor(f.sig)} desc={f.desc} compact />
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 mr-1 w-14 shrink-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Ops</span>
                {["+", "-", "*", "/", "^", "(", ")", ","].map((op) => (
                  <InsertButton key={op} label={op} onClick={() => insertAtCursor(` ${op} `)} desc="" compact />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Templates Panel ─── */}
        {showTemplates && (
          <div className="mb-4 rounded-xl bg-slate-800/60 border border-purple-700/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-purple-300" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Treatment Templates</span>
              <div className="flex gap-1.5">
                {["all", "simple", "kinetic", "physical", "linked"].map((f) => (
                  <button key={f} onClick={() => setTemplateFilter(f)}
                    className={`px-2 py-0.5 rounded text-xs capitalize transition-all ${
                      templateFilter === f 
                        ? "bg-purple-700/50 text-purple-200 border border-purple-500/50" 
                        : "text-slate-400 hover:text-slate-300 border border-transparent"
                    }`}
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                  >{f}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.filter((t) => templateFilter === "all" || t.category === templateFilter).map((t) => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="text-left p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 hover:border-purple-500/40 hover:bg-purple-900/20 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{t.icon}</span>
                    <span className="text-sm font-medium text-white group-hover:text-purple-200" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{t.name}</span>
                  </div>
                  <code className="text-xs text-emerald-400/80 block mb-1">{t.expr}</code>
                  <p className="text-xs text-slate-500 leading-relaxed" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Reference Panel ─── */}
        {showReference && (
          <div className="mb-4 rounded-xl bg-slate-800/60 border border-slate-700/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-300" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>SWMM5 Treatment Reference</span>
              <button onClick={() => setShowReference(false)} className="text-slate-500 hover:text-slate-300 text-xs">Close</button>
            </div>
            <div className="space-y-3 text-xs text-slate-400" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              <div>
                <div className="font-semibold text-sky-300 mb-1">Expression Forms</div>
                <p><code className="text-emerald-400">C = f(...)</code> — Set effluent concentration directly</p>
                <p><code className="text-emerald-400">R = f(...)</code> — Set fractional removal (0-100%)</p>
              </div>
              <div>
                <div className="font-semibold text-sky-300 mb-1">Process Variables</div>
                {PROCESS_VARS.map((v) => (
                  <p key={v.name}><code className="text-amber-400">{v.name}</code> — {v.desc} ({v.unit})</p>
                ))}
              </div>
              <div>
                <div className="font-semibold text-sky-300 mb-1">Cross-References</div>
                <p><code className="text-amber-400">R_pollutant</code> — Removal of another pollutant (%)</p>
                <p><code className="text-amber-400">C_pollutant</code> — Concentration of another pollutant</p>
              </div>
              <div>
                <div className="font-semibold text-sky-300 mb-1">Key Notes</div>
                <p>• Treatment expressions are evaluated at each computational time step</p>
                <p>• C_IN is the mixture concentration from all inflows to the node</p>
                <p>• HRT is cumulative residence time, reset when node goes dry</p>
                <p>• Removal R is capped at 0% (no removal) to 100% (complete removal)</p>
                <p>• Expressions for linked pollutants are evaluated in order listed</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Simulation Controls ─── */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Simulation Parameters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>HRT Range (hrs)</label>
              <div className="flex gap-1.5">
                <input type="number" value={simHRT[0]} step={0.5} min={0}
                  onChange={(e) => setSimHRT([parseFloat(e.target.value) || 0, simHRT[1]])}
                  className="w-full px-2 py-1.5 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
                />
                <span className="text-slate-500 self-center">→</span>
                <input type="number" value={simHRT[1]} step={1} min={simHRT[0] + 0.5}
                  onChange={(e) => setSimHRT([simHRT[0], parseFloat(e.target.value) || 24])}
                  className="w-full px-2 py-1.5 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Flow (CFS)</label>
              <input type="number" value={simFlow} step={1} min={0.1}
                onChange={(e) => setSimFlow(parseFloat(e.target.value) || 10)}
                className="w-full px-2 py-1.5 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Depth (ft)</label>
              <input type="number" value={simDepth} step={0.5} min={0}
                onChange={(e) => setSimDepth(parseFloat(e.target.value) || 3)}
                className="w-full px-2 py-1.5 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Area (ft²)</label>
              <input type="number" value={simArea} step={100} min={1}
                onChange={(e) => setSimArea(parseFloat(e.target.value) || 500)}
                className="w-full px-2 py-1.5 rounded bg-slate-900/60 border border-slate-600/30 text-sm text-white focus:outline-none focus:border-sky-500/60"
              />
            </div>
          </div>
        </div>

        {/* ─── Output Tabs ─── */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 overflow-hidden mb-4">
          <div className="flex items-center border-b border-slate-700/40 bg-slate-800/30">
            {[
              { key: "curve", label: "Treatment Curve" },
              { key: "removal", label: "Removal Overlay" },
              { key: "table", label: "Data Table" },
              { key: "swmm", label: "SWMM5 Export" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setTabView(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
                  tabView === tab.key
                    ? "text-sky-300 border-sky-400 bg-sky-900/10"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >{tab.label}</button>
            ))}
          </div>

          <div className="p-4">
            {/* Treatment Curve */}
            {tabView === "curve" && (
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-0.5 bg-slate-400 inline-block" style={{ borderTop: "2px dashed #94a3b8" }} />
                    <span className="text-xs text-slate-400" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Influent (C_IN)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-0.5 inline-block" style={{ background: active.color || "#0EA5E9" }} />
                    <span className="text-xs text-slate-400" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Effluent ({active.name})</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={simData} margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hrt" stroke="#64748b" tick={{ fontSize: 11 }}
                      label={{ value: "HRT (hours)", position: "bottom", offset: 10, fill: "#64748b", fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }}
                      label={{ value: `Conc (${active.units})`, angle: -90, position: "insideLeft", offset: 5, fill: "#64748b", fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(v, name) => [typeof v === "number" ? v.toFixed(2) : v, name === "C_in" ? "Influent" : name === "C_out" ? "Effluent" : "Removal %"]}
                      labelFormatter={(v) => `HRT: ${v} hrs`}
                    />
                    <ReferenceLine y={active.C_in} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1} />
                    <Line type="monotone" dataKey="C_out" stroke={active.color || "#0EA5E9"} strokeWidth={2.5} dot={false} name="C_out" />
                  </LineChart>
                </ResponsiveContainer>
                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {[
                    { label: "C_IN", val: `${active.C_in.toFixed(1)}`, unit: active.units, color: "text-slate-300" },
                    { label: "C_OUT @ mid", val: simData.length > 0 ? `${simData[Math.floor(simData.length / 2)]?.C_out?.toFixed(1)}` : "—", unit: active.units, color: "text-sky-300" },
                    { label: "C_OUT @ end", val: simData.length > 0 ? `${simData[simData.length - 1]?.C_out?.toFixed(1)}` : "—", unit: active.units, color: "text-emerald-300" },
                    { label: "Max Removal", val: simData.length > 0 ? `${Math.max(...simData.map((d) => d.removal)).toFixed(1)}` : "—", unit: "%", color: "text-amber-300" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-slate-900/50 border border-slate-700/30 p-2.5 text-center">
                      <div className="text-xs text-slate-500 mb-0.5" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{s.label}</div>
                      <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                      <div className="text-xs text-slate-600">{s.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removal Overlay (multi-pollutant) */}
            {tabView === "removal" && (
              <div>
                {pollutants.length < 2 ? (
                  <div className="text-center py-12 text-slate-500" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                    <p className="text-sm">Add more pollutants to see removal comparison overlay</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={multiData} margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hrt" stroke="#64748b" tick={{ fontSize: 11 }}
                        label={{ value: "HRT (hours)", position: "bottom", offset: 10, fill: "#64748b", fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]}
                        label={{ value: "Removal %", angle: -90, position: "insideLeft", offset: 5, fill: "#64748b", fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(v) => `HRT: ${v} hrs`}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {pollutants.map((p) => (
                        <Line key={p.name} type="monotone" dataKey={`${p.name}_removal`} stroke={p.color} strokeWidth={2} dot={false} name={p.name} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Data Table */}
            {tabView === "table" && (
              <div className="max-h-64 overflow-auto rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr className="text-slate-400 border-b border-slate-700/40">
                      <th className="text-left px-3 py-2">HRT (hrs)</th>
                      <th className="text-right px-3 py-2">C_IN ({active.units})</th>
                      <th className="text-right px-3 py-2">C_OUT ({active.units})</th>
                      <th className="text-right px-3 py-2">Removal (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simData.filter((_, i) => i % Math.max(1, Math.floor(simSteps / 25)) === 0 || i === simData.length - 1).map((d, i) => (
                      <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-700/20 text-slate-300">
                        <td className="px-3 py-1.5 font-mono">{d.hrt.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{d.C_in.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-sky-300">{d.C_out.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{d.removal.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SWMM5 Export */}
            {tabView === "swmm" && (
              <div>
                <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Copy this into your SWMM5 .inp file [TREATMENT] section. Replace "Node1" with your actual node ID.
                </p>
                <pre className="bg-slate-900/70 rounded-lg p-4 text-sm text-emerald-300 font-mono overflow-x-auto border border-slate-700/30 whitespace-pre">
                  {swmmText}
                </pre>
                <button
                  onClick={() => { navigator.clipboard?.writeText(swmmText); }}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs bg-sky-700/40 hover:bg-sky-600/50 text-sky-300 border border-sky-600/40 transition-all"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="text-center text-xs text-slate-600 pt-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          SWMM5 Treatment Editor • Based on EPA SWMM 5.2 Treatment Specification • swmm5.org
        </div>
      </div>
    </div>
  );
}
