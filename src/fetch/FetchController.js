import fetch from "node-fetch"; // si Node <18, si Node 18+ fetch es global



export const Horizons = async (req, res) => {
  try {
    const { id, stopOffsetDays = 30 } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Se requiere parámetro 'id'" });
    }

    // Fecha de hoy
    const today = new Date();
    const start = today.toISOString().split("T")[0];

    // Stop = hoy + stopOffsetDays
    const stopDate = new Date();
    stopDate.setDate(today.getDate() + Number(stopOffsetDays));
    const stop = stopDate.toISOString().split("T")[0];

    const targetUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${id}'&MAKE_EPHEM=YES&EPHEM_TYPE=OBSERVER&CENTER='500@0'&START_TIME='${start}'&STOP_TIME='${stop}'&STEP_SIZE='1 d'&QUANTITIES='1,20,23,24'`;

    const response = await fetch(targetUrl);
    const json = await response.json();

    const parsedData = parseAsteroidData(json.result);

    res.setHeader("Content-Type", "application/json");
    res.json(parsedData); // envia un único JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function parseAsteroidData(result) {
  const lines = result.split('\n');

  // ===== Información básica =====
  const nameMatch = lines.find(line => line.includes('Target body name:'))?.match(/Target body name:\s*(.+?)\s*\{/);
  const name = nameMatch ? nameMatch[1].trim() : null;

  const radiusLine = lines.find(line => line.includes('RAD='));
  const radius = parseFloat(radiusLine?.match(/RAD=\s*([\d.]+)/)?.[1] ?? null);
  const rotation = parseFloat(radiusLine?.match(/ROTPER=\s*([\d.]+)/)?.[1] ?? null);

  const HLine = lines.find(line => line.includes('H='));
  const H = parseFloat(HLine?.match(/H=\s*([\d.]+)/)?.[1] ?? null);
  const spectralType = HLine?.match(/STYP=\s*(\w+)/)?.[1] ?? null;

  // ===== Elementos orbitales =====
  const orbitalLine = lines.find(line => line.includes('EC='));
  const EC = parseFloat(orbitalLine?.match(/EC=\s*([\d.]+)/)?.[1] ?? null);
  const A = parseFloat(orbitalLine?.match(/A=\s*([\d.]+)/)?.[1] ?? null);
  const QR = parseFloat(orbitalLine?.match(/QR=\s*([\d.]+)/)?.[1] ?? null);
  const ADIST = parseFloat(orbitalLine?.match(/ADIST=\s*([\d.]+)/)?.[1] ?? null);
  const IN = parseFloat(orbitalLine?.match(/IN=\s*([\d.]+)/)?.[1] ?? null);
  const OM = parseFloat(orbitalLine?.match(/OM=\s*([\d.]+)/)?.[1] ?? null);
  const W = parseFloat(orbitalLine?.match(/W=\s*([\d.]+)/)?.[1] ?? null);

  // ===== Ephemeris =====
  const startIdx = lines.indexOf('$$SOE') + 1;
  const endIdx = lines.indexOf('$$EOE');
  const ephemeris = startIdx > 0 && endIdx > startIdx
    ? lines.slice(startIdx, endIdx).map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          date: parts[0],
          time: parts[1],
          RA: `${parts[2]} ${parts[3]} ${parts[4]}`,
          DEC: `${parts[5]} ${parts[6]} ${parts[7]}`,
          delta: parseFloat(parts[8]),
          deldot: parseFloat(parts[9]),
          solarElongation: parseFloat(parts[10]),
          STO: parseFloat(parts[12])
        };
      })
    : [];

  return {
    basicInfo: { name, radius, rotation, H, spectralType },
    orbitalElements: { EC, A, QR, ADIST, IN, OM, W },
    ephemeris
  };
}



export const getESA = async (req, res) => {
  try {
    const targetUrl = `https://neo.ssa.esa.int/PSDB-portlet/download?file=esa_risk_list`;

    const response = await fetch(targetUrl);
    const text = await response.text();

    res.setHeader("Content-Type", "text/plain");
    res.send(text);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};