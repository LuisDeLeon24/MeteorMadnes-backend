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

export const getSmallBodyData = async (req, res) => {
  try {
    const { spkid, name } = req.query;

    if (!spkid && !name) {
      return res.status(400).json({ 
        error: "Se requiere parámetro 'spkid' o 'name'" 
      });
    }

    let targetUrl = 'https://ssd-api.jpl.nasa.gov/sbdb.api?';
    
    if (spkid) {
      targetUrl += `spk=${spkid}`;
    } else {
      targetUrl += `sstr=${encodeURIComponent(name)}`;
    }

    targetUrl += '&full-prec=true&phys-par=true';

    const response = await fetch(targetUrl);
    const json = await response.json();

    if (json.signature && json.signature.source === 'NASA/JPL Small-Body Database API') {
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        data: json,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ 
        error: "Objeto no encontrado en la base de datos JPL" 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getNeoData = async (req, res) => {
  try {
    const { startDate, endDate, detailed = false } = req.query;
    const API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY'; // Usar variable de entorno

    const today = new Date();
    const start = startDate || today.toISOString().split("T")[0];
    
    const endDateObj = endDate ? new Date(endDate) : new Date();
    if (!endDate) {
      endDateObj.setDate(today.getDate() + 7); // 7 días por defecto
    }
    const end = endDateObj.toISOString().split("T")[0];

    const targetUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&detailed=${detailed}&api_key=${API_KEY}`;

    const response = await fetch(targetUrl);
    const json = await response.json();

    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true,
      data: json,
      timestamp: new Date().toISOString(),
      parameters: { start_date: start, end_date: end, detailed }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getWorldBankData = async (req, res) => {
  try {
    const { 
      country = 'all', 
      indicator = 'SP.POP.TOTL', // Population total por defecto
      date = '2020:2023' 
    } = req.query;

    const targetUrl = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?date=${date}&format=json&per_page=1000`;

    const response = await fetch(targetUrl);
    const json = await response.json();

    // World Bank API devuelve array donde [0] son metadatos y [1] son datos
    if (Array.isArray(json) && json.length >= 2) {
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        metadata: json[0],
        data: json[1],
        timestamp: new Date().toISOString(),
        parameters: { country, indicator, date }
      });
    } else {
      res.status(404).json({ 
        error: "No se encontraron datos para los parámetros especificados" 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLocationData = async (req, res) => {
  try {
    const { 
      query, 
      lat, 
      lon, 
      format = 'json',
      addressdetails = 1,
      limit = 10
    } = req.query;

    let targetUrl = 'https://nominatim.openstreetmap.org/';

    if (query) {
      // Búsqueda por texto
      targetUrl += `search?q=${encodeURIComponent(query)}`;
    } else if (lat && lon) {
      // Búsqueda reversa por coordenadas
      targetUrl += `reverse?lat=${lat}&lon=${lon}`;
    } else {
      return res.status(400).json({ 
        error: "Se requiere parámetro 'query' o coordenadas 'lat' y 'lon'" 
      });
    }

    targetUrl += `&format=${format}&addressdetails=${addressdetails}&limit=${limit}`;
    targetUrl += '&user-agent=MeteorMadnessApp'; // User-agent requerido

    const response = await fetch(targetUrl);
    const json = await response.json();

    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true,
      data: json,
      timestamp: new Date().toISOString(),
      parameters: { query, lat, lon, format, addressdetails, limit }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDisasterData = async (req, res) => {
  try {
    const { 
      eventtype = '', // earthquake, flood, cyclone, volcano, etc.
      alertlevel = '', // Green, Orange, Red
      country = '',
      fromdate = '',
      todate = '',
      limit = 100
    } = req.query;

    let targetUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?';
    
    const params = new URLSearchParams();
    if (eventtype) params.append('eventtype', eventtype);
    if (alertlevel) params.append('alertlevel', alertlevel);
    if (country) params.append('country', country);
    if (fromdate) params.append('fromdate', fromdate);
    if (todate) params.append('todate', todate);
    params.append('limit', limit.toString());

    targetUrl += params.toString();

    const response = await fetch(targetUrl);
    const text = await response.text();
    
    // GDACS devuelve XML, intentamos parsearlo o devolvemos como texto
    let parsedData;
    try {
      // Si tienes una librería XML parser, úsala aquí
      parsedData = text; // Por ahora devolvemos el XML como texto
    } catch (parseError) {
      parsedData = text;
    }

    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true,
      data: parsedData,
      timestamp: new Date().toISOString(),
      parameters: { eventtype, alertlevel, country, fromdate, todate, limit },
      note: "GDACS API devuelve datos en formato XML"
    });
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