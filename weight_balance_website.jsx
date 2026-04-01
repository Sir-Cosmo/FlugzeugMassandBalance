import React, { useMemo, useState } from "react";

const LBS_TO_KG = 0.453592;

const AIRCRAFTS = [
  { id: "HB-PMI", name: "HB-PMI", emptyMassKg: 1611.6 * LBS_TO_KG, emptyArmM: (138001.3 / 1611.6) * 0.0254 },
  { id: "PQI", name: "PQI", emptyMassKg: 1589.5 * LBS_TO_KG, emptyArmM: (136422.0 / 1589.5) * 0.0254 },
  { id: "PMJ", name: "PMJ", emptyMassKg: 1657.9 * LBS_TO_KG, emptyArmM: (143159.7 / 1657.9) * 0.0254 },
  { id: "PMF", name: "PMF", emptyMassKg: 1653.5 * LBS_TO_KG, emptyArmM: (142429.9 / 1653.5) * 0.0254 },
];

const ARM_VALUES = {
  pilot: 2.17,
  copilot: 2.17,
  paxRear: 3.0,
  fuel: 2.41,
  baggage: 3.63,
  taxiFuel: 2.41,
};

const LIMITS = {
  normalMaxKg: 1100,
  baggageMaxKg: 90,
};

const FUEL_DENSITY = 0.82;
const FUEL_BURN_LPH = 20;
const KG_TO_CM = 100;

const envelopeNormal = [
  { x: 210.8, y: 550 },
  { x: 210.8, y: 885 },
  { x: 221.5, y: 1050 },
  { x: 235.8, y: 1050 },
  { x: 235.8, y: 550 },
];

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function pointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function NumberInput({ label, value, onChange, step = "0.1" }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-500"
      />
    </label>
  );
}

function EnvelopeChart({ zfmPoint, takeoffPoint }) {
  const width = 900;
  const height = 560;
  const margin = { top: 70, right: 40, bottom: 90, left: 85 };
  const xMin = 205;
  const xMax = 240;
  const yMin = 550;
  const yMax = 1100;

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (y) => margin.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;
  const polygonPath = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y)}`).join(" ") + " Z";

  const xTicks = [];
  for (let x = xMin; x <= xMax; x += 5) xTicks.push(x);
  const yTicks = [];
  for (let y = yMin; y <= yMax; y += 50) yTicks.push(y);

  const renderPoint = (point, label) => (
    <g>
      <circle cx={xScale(point.x)} cy={yScale(point.y)} r="5" fill="black" />
      <text x={xScale(point.x) + 8} y={yScale(point.y) - 12} fontSize="14" fontWeight="700">
        {label}
      </text>
    </g>
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {xTicks.map((x) => (
          <g key={x}>
            <line x1={xScale(x)} y1={yScale(yMin)} x2={xScale(x)} y2={yScale(yMax)} stroke="black" strokeWidth="0.5" />
            <text x={xScale(x)} y={height - 25} textAnchor="middle" fontSize="12">{x}</text>
          </g>
        ))}

        {yTicks.map((y) => (
          <g key={y}>
            <line x1={xScale(xMin)} y1={yScale(y)} x2={xScale(xMax)} y2={yScale(y)} stroke="black" strokeWidth="0.5" />
            <text x="50" y={yScale(y) + 4} textAnchor="middle" fontSize="12">{y}</text>
          </g>
        ))}

        <path d={polygonPath(envelopeNormal)} fill="none" stroke="black" strokeWidth="3" />
        {renderPoint(zfmPoint, "ZFM")}
        {renderPoint(takeoffPoint, "TOM")}

        {/* X Axis Title */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
        >
          C.G. Location [cm aft datum]
        </text>

        {/* Y Axis Title */}
        <text
          x="20"
          y={height / 2}
          transform={`rotate(-90 20 ${height / 2})`}
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
        >
          Aircraft Weight [kg]
        </text>
      </svg>
    </div>
  );
}

export default function WeightBalanceWebsite() {
  const [selectedAircraftId, setSelectedAircraftId] = useState(AIRCRAFTS[0].id);
  const selectedAircraft = AIRCRAFTS.find((a) => a.id === selectedAircraftId) || AIRCRAFTS[0];

  const [pilot, setPilot] = useState(100);
  const [copilot, setCopilot] = useState(80);
  const [paxRear, setPaxRear] = useState(0);
  const [baggage, setBaggage] = useState(15);
  const [fuelLiters, setFuelLiters] = useState(50);

  const rows = useMemo(() => {
    const items = [
      { label: "Leermasse", mass: selectedAircraft.emptyMassKg, arm: selectedAircraft.emptyArmM },
      { label: "Pilot und vorderer Fluggast", mass: pilot + copilot, arm: ARM_VALUES.pilot },
      { label: "Hintere Fluggäste", mass: paxRear, arm: ARM_VALUES.paxRear },
      { label: "Gepäck", mass: baggage, arm: ARM_VALUES.baggage },
    ];

    return items.map((row) => ({ ...row, moment: row.mass * row.arm }));
  }, [selectedAircraft, pilot, copilot, paxRear, baggage]);

  const calc = useMemo(() => {
    const zeroFuelMass = rows.reduce((sum, row) => sum + row.mass, 0);
    const zeroFuelMoment = rows.reduce((sum, row) => sum + row.moment, 0);

    const fuelKg = fuelLiters * FUEL_DENSITY;
    const fuelEnduranceHours = fuelLiters / FUEL_BURN_LPH;

    const takeoffMass = zeroFuelMass + fuelKg;
    const takeoffMoment = zeroFuelMoment + fuelKg * ARM_VALUES.fuel;

    const cgZeroFuelM = zeroFuelMoment / zeroFuelMass;
    const cgTakeoffM = takeoffMoment / takeoffMass;

    return {
      zeroFuelMass,
      fuelKg,
      fuelEnduranceHours,
      takeoffMass,
      cgZeroFuelM,
      cgTakeoffM,
      zfmPoint: { x: cgZeroFuelM * KG_TO_CM, y: zeroFuelMass },
      takeoffPoint: { x: cgTakeoffM * KG_TO_CM, y: takeoffMass },
      normalOk: takeoffMass <= LIMITS.normalMaxKg && pointInPolygon({ x: cgTakeoffM * KG_TO_CM, y: takeoffMass }, envelopeNormal),
    };
  }, [rows, fuelLiters, baggage]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h1 className="text-2xl font-bold">Weight & Balance</h1>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-sm text-slate-500">Basic Empty Mass</div>
            <div className="text-xl font-bold">{selectedAircraft.emptyMassKg.toFixed(1)} kg</div>
          </div>
          <select value={selectedAircraftId} onChange={(e) => setSelectedAircraftId(e.target.value)} className="border p-2 rounded">
            {AIRCRAFTS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <NumberInput label="Pilot [kg]" value={pilot} onChange={setPilot} />
          <NumberInput label="CoPilot [kg]" value={copilot} onChange={setCopilot} />
          <NumberInput label="Rear Pax [kg]" value={paxRear} onChange={setPaxRear} />
          <NumberInput label="Baggage [kg]" value={baggage} onChange={setBaggage} />
          <NumberInput label="Fuel [L]" value={fuelLiters} onChange={setFuelLiters} />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className={`font-bold ${calc.normalOk ? "text-green-600" : "text-red-600"}`}>
                {calc.normalOk ? "Within Envelope" : "Outside Envelope"}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Fuel Endurance</div>
              <div className="text-xl font-bold">{calc.fuelEnduranceHours.toFixed(1)} h</div>
              <div className="text-sm text-slate-600">at 20 L/hour</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-500">ZFM</div>
              <div className="text-xl font-bold">{calc.zeroFuelMass.toFixed(1)} kg</div>
              <div className="text-sm text-slate-600">CG {(calc.cgZeroFuelM * 100).toFixed(1)} cm</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">TOM</div>
              <div className="text-xl font-bold">{calc.takeoffMass.toFixed(1)} kg</div>
              <div className="text-sm text-slate-600">Fuel {calc.fuelKg.toFixed(1)} kg</div>
              <div className="text-sm text-slate-600">CG {(calc.cgTakeoffM * 100).toFixed(1)} cm</div>
            </div>
          </div>
        </div>

        <EnvelopeChart zfmPoint={calc.zfmPoint} takeoffPoint={calc.takeoffPoint} />
      </div>
    </div>
  );
}
