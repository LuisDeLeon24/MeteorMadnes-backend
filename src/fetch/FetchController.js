import fetch from "node-fetch"; // si Node <18, si Node 18+ fetch es global

export const Horizons = async (req, res) => {
  try {
    const { id, stopOffsetDays = 30 } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Se requiere parÃ¡metro 'id'" });
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
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const getSmallBodyData = async (req, res) => {
  try {
    const { spkid, name } = req.query;

    if (!spkid && !name) {
      return res.status(400).json({ error: "Se requiere parámetro 'spkid' o 'name'" });
    }

    let targetUrl = 'https://ssd-api.jpl.nasa.gov/sbdb.api?';
    targetUrl += spkid ? `spk=${spkid}` : `sstr=${encodeURIComponent(name)}`;
    targetUrl += '&full-prec=true&phys-par=true&ca-data=true';

    const response = await fetch(targetUrl);
    const json = await response.json();

    if (!json?.object?.fullname) {
      return res.status(404).json({ error: "Objeto no encontrado" });
    }

    const parsedData = parseSmallBodyData(json);
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getNeoData = async (req, res) => {
  try {
    const { startDate, endDate, detailed = false } = req.query;
    const API_KEY = process.env.NASA_API_KEY || 'JXo5cUUAsYAIcaKdgdMgOqeefNNf77SVR0NznOa4';

    const today = new Date();
    const start = startDate || today.toISOString().split("T")[0];
    const endDateObj = endDate ? new Date(endDate) : new Date();
    if (!endDate) {
      endDateObj.setDate(today.getDate() + 7);
    }
    const end = endDateObj.toISOString().split("T")[0];

    const targetUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&detailed=${detailed}&api_key=${API_KEY}`;

    const response = await fetch(targetUrl);
    const json = await response.json();

    const parsedData = parseNeoFeedData(json);
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getWorldBankData = async (req, res) => {
  try {
    const { 
      country = 'all', 
      indicator = 'SP.POP.TOTL',
      date = '2020:2023' 
    } = req.query;

    const targetUrl = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?date=${date}&format=json&per_page=1000`;

    const response = await fetch(targetUrl);
    const json = await response.json();

    if (!Array.isArray(json) || json.length < 2 || !json[1]) {
      return res.status(404).json({ error: "No se encontraron datos" });
    }

    const parsedData = parseWorldBankData(json);
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getLocationData = async (req, res) => {
  try {
    const { query, lat, lon, limit = 10 } = req.query;

    if (!query && (!lat || !lon)) {
      return res.status(400).json({ error: "Se requiere 'query' o coordenadas 'lat' y 'lon'" });
    }

    let targetUrl = 'https://nominatim.openstreetmap.org/';
    
    if (query) {
      targetUrl += `search?q=${encodeURIComponent(query)}`;
    } else {
      targetUrl += `reverse?lat=${lat}&lon=${lon}`;
    }

    targetUrl += `&format=json&addressdetails=1&limit=${limit}`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'MeteorMadnessApp/1.0 (contact@meteormadness.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `OpenStreetMap API error: ${response.status}` 
      });
    }

    const json = await response.json();

    if (!json || (Array.isArray(json) && json.length === 0)) {
      return res.status(404).json({ error: "No se encontraron ubicaciones" });
    }

    const parsedData = parseLocationData(json, !!query);
    
    // Delay para respetar límites
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getGDACSDisasters = async (req, res) => {
  try {
    const {
      alertlevel = 'all',
      eventtype = 'all', 
      country = 'all',
      fromdate = null,
      todate = null,
      limit = '50',
      event_id = null
    } = req.query;

    // Usar API RSS de GDACS
    let targetUrl = `https://www.gdacs.org/xml/rss.xml`;

    const response = await fetch(targetUrl, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MeteorMadnessApp/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `GDACS API error: ${response.status}` });
    }

    const xmlText = await response.text();
    
    // Parsing del XML/RSS
    const events = [];
    const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
    
    itemMatches.forEach((item, index) => {
      const titleMatch = item.match(/<title[^>]*>(.*?)<\/title>/);
      const descMatch = item.match(/<description[^>]*>(.*?)<\/description>/);
      const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') : '';
      
      // Extraer información del título
      let eventType = 'Unknown';
      let alertLevel = 'Unknown';
      let eventCountry = 'Unknown';
      let magnitude = null;
      
      if (title.includes('Earthquake')) eventType = 'EQ';
      else if (title.includes('Flood')) eventType = 'FL'; 
      else if (title.includes('Cyclone')) eventType = 'TC';
      else if (title.includes('Volcano')) eventType = 'VO';
      else if (title.includes('Wildfire')) eventType = 'WF';
      
      if (title.toLowerCase().includes('red')) alertLevel = 'Red';
      else if (title.toLowerCase().includes('orange')) alertLevel = 'Orange';
      else if (title.toLowerCase().includes('green')) alertLevel = 'Green';
      
      const countryMatch = title.match(/in\s+([A-Za-z\s]+)/);
      if (countryMatch) eventCountry = countryMatch[1].trim();
      
      const magMatch = title.match(/M(\d+\.?\d*)/);
      if (magMatch) magnitude = parseFloat(magMatch[1]);
      
      events.push({
        eventId: `gdacs_${index}_${Date.now()}`,
        type: eventType,
        alertLevel: alertLevel,
        latitude: 0,
        longitude: 0,
        magnitude: magnitude,
        date: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
        country: eventCountry,
        description: title
      });
    });
    
    // APLICAR FILTROS
    let filteredEvents = events;

    if (country !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.country && event.country.toLowerCase().includes(country.toLowerCase())
      );
    }

    if (eventtype !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.type && event.type.toLowerCase().includes(eventtype.toLowerCase())
      );
    }

    if (alertlevel !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.alertLevel && event.alertLevel.toLowerCase().includes(alertlevel.toLowerCase())
      );
    }

    if (fromdate) {
      const fromDateTime = new Date(fromdate);
      filteredEvents = filteredEvents.filter(event => 
        event.date && new Date(event.date) >= fromDateTime
      );
    }

    if (todate) {
      const toDateTime = new Date(todate);
      filteredEvents = filteredEvents.filter(event => 
        event.date && new Date(event.date) <= toDateTime
      );
    }

    filteredEvents = filteredEvents.slice(0, parseInt(limit));

    res.json({
      events: filteredEvents,
      count: filteredEvents.length,
      filters: { alertlevel, eventtype, country, fromdate, todate }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getNASANeoWsData = async (req, res) => {
  try {
    const { 
      endpoint = 'feed',
      start_date = new Date().toISOString().split('T')[0],
      end_date = null,
      asteroid_id = null,
      detailed = false 
    } = req.query;

    const NASA_API_KEY = process.env.NASA_API_KEY || 'JXo5cUUAsYAIcaKdgdMgOqeefNNf77SVR0NznOa4';
    let targetUrl = '';

    switch (endpoint) {
      case 'feed':
        const endDate = end_date || start_date;
        targetUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start_date}&end_date=${endDate}&detailed=${detailed}&api_key=${NASA_API_KEY}`;
        break;
      case 'lookup':
        if (!asteroid_id) {
          return res.status(400).json({ error: "Se requiere asteroid_id para lookup" });
        }
        targetUrl = `https://api.nasa.gov/neo/rest/v1/neo/${asteroid_id}?api_key=${NASA_API_KEY}`;
        break;
      case 'browse':
        targetUrl = `https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=${NASA_API_KEY}`;
        break;
      default:
        return res.status(400).json({ error: "Endpoint inválido: feed, lookup, browse" });
    }

    const response = await fetch(targetUrl);
    const json = await response.json();

    const parsedData = parseNeoWsData(json, endpoint);
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getNaturalEarthData = async (req, res) => {
  try {
    const { scale = '50m', category = 'cultural', dataset = 'admin_0_countries' } = req.query;

    // URLs directas que funcionan
    const workingUrls = {
      'countries': `https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson`,
      'admin_0_countries': `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson`,
      'populated_places': `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places.geojson`,
      'coastline': `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson`,
      'land': `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson`,
      'ocean': `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_ocean.geojson`
    };

    let targetUrl = workingUrls[dataset] || workingUrls['admin_0_countries'];

    const response = await fetch(targetUrl, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MeteorMadnessApp/1.0)'
      }
    });
    
    if (!response.ok) {
      return res.status(404).json({ 
        error: "Dataset no encontrado",
        availableDatasets: Object.keys(workingUrls),
        usingDefault: 'admin_0_countries'
      });
    }

    const json = await response.json();
    const parsedData = parseNaturalEarthData(json);
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function parseSmallBodyData(json) {
  const obj = json.object;
  
  const physicalParams = {};
  if (json.phys_par && Array.isArray(json.phys_par)) {
    json.phys_par.forEach(param => {
      const name = param.name?.toLowerCase();
      const value = parseFloat(param.value);
      
      if (name === 'diameter' && !isNaN(value)) physicalParams.diameter = value;
      if (name === 'albedo' && !isNaN(value)) physicalParams.albedo = value;
      if (name === 'density' && !isNaN(value)) physicalParams.density = value;
      if (name === 'mass' && !isNaN(value)) physicalParams.mass = value;
      if (name === 'rot_per' && !isNaN(value)) physicalParams.rotationPeriod = value;
      if (name === 'h' && !isNaN(value)) physicalParams.absoluteMagnitude = value;
    });
  }

  const orbitalElements = {};
  if (json.orbit?.elements && Array.isArray(json.orbit.elements)) {
    json.orbit.elements.forEach(element => {
      if (element.name && element.value !== undefined) {
        orbitalElements[element.name] = parseFloat(element.value) || element.value;
      }
    });
  }

  const closeApproaches = [];
  if (json.ca_data && Array.isArray(json.ca_data)) {
    json.ca_data.forEach(approach => {
      closeApproaches.push({
        body: approach.body,
        date: approach.cd,
        distance: parseFloat(approach.dist),
        velocity: parseFloat(approach.v_rel)
      });
    });
  }

  return {
    spkid: obj.spkid,
    name: obj.fullname,
    designation: obj.des,
    neo: obj.neo || false,
    pha: obj.pha || false,
    physicalParams,
    orbitalElements,
    closeApproaches: closeApproaches.slice(0, 5)
  };
}

function parseNeoFeedData(json) {
  const asteroids = [];
  const nearEarthObjects = json.near_earth_objects || {};

  Object.entries(nearEarthObjects).forEach(([date, objects]) => {
    objects.forEach(obj => {
      const approach = obj.close_approach_data?.[0] || {};
      asteroids.push({
        id: obj.id,
        name: obj.name,
        date: date,
        diameter: {
          min: obj.estimated_diameter?.kilometers?.estimated_diameter_min,
          max: obj.estimated_diameter?.kilometers?.estimated_diameter_max
        },
        hazardous: obj.is_potentially_hazardous_asteroid,
        distance: parseFloat(approach.miss_distance?.kilometers),
        velocity: parseFloat(approach.relative_velocity?.kilometers_per_second),
        magnitude: obj.absolute_magnitude_h
      });
    });
  });

  return {
    elementCount: json.element_count,
    totalAsteroids: asteroids.length,
    hazardousCount: asteroids.filter(a => a.hazardous).length,
    asteroids: asteroids.sort((a, b) => a.distance - b.distance)
  };
}

function parseWorldBankData(json) {
  const data = json[1].map(item => ({
    countryCode: item.countryiso3code,
    countryName: item.country?.value,
    indicator: item.indicator?.value,
    value: item.value !== null ? parseFloat(item.value) : null,
    year: parseInt(item.date)
  }))
  .filter(item => item.value !== null)
  .sort((a, b) => b.year - a.year);

  const latestByCountry = data.reduce((acc, item) => {
    if (!acc[item.countryCode] || acc[item.countryCode].year < item.year) {
      acc[item.countryCode] = item;
    }
    return acc;
  }, {});

  return {
    totalRecords: data.length,
    years: [...new Set(data.map(item => item.year))].sort(),
    data: data,
    latest: Object.values(latestByCountry),
    top10: Object.values(latestByCountry)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 10)
  };
}

function parseLocationData(json, isSearch) {
  if (isSearch) {
    return json.map(location => ({
      name: location.display_name,
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lon),
      type: location.type,
      country: location.address?.country,
      city: location.address?.city || location.address?.town,
      importance: parseFloat(location.importance)
    })).slice(0, 5);
  } else {
    return {
      name: json.display_name,
      latitude: parseFloat(json.lat),
      longitude: parseFloat(json.lon),
      type: json.type,
      country: json.address?.country,
      city: json.address?.city || json.address?.town
    };
  }
}

function parseGDACSData(json) {
  const events = json.features || json.items || (Array.isArray(json) ? json : [json]);
  
  return events.map(event => {
    const props = event.properties || event.item || event;
    const coords = event.geometry?.coordinates || [0, 0];
    
    return {
      eventId: props.eventid || props.id,
      type: props.eventtype || props.type,
      alertLevel: props.episodealertlevel || props.alertlevel,
      latitude: coords[1] || parseFloat(props.latitude),
      longitude: coords[0] || parseFloat(props.longitude),
      magnitude: parseFloat(props.magnitude) || parseFloat(props.severity),
      date: props.fromdate || props.pubDate,
      country: props.country,
      description: props.description || props.name
    };
  }).filter(event => event.eventId && event.latitude && event.longitude);
}

function parseGDACSDataImproved(json, countryFilter, fromDate, toDate) {
  const events = json.features || json.items || (Array.isArray(json) ? json : [json]);
  const seenEvents = new Set(); // Para evitar duplicados
  const filteredEvents = [];
  
  events.forEach(event => {
    const props = event.properties || event.item || event;
    const coords = event.geometry?.coordinates || [0, 0];
    
    const eventData = {
      eventId: props.eventid || props.id,
      type: props.eventtype || props.type,
      alertLevel: props.episodealertlevel || props.alertlevel,
      latitude: coords[1] || parseFloat(props.latitude),
      longitude: coords[0] || parseFloat(props.longitude),
      magnitude: parseFloat(props.magnitude) || parseFloat(props.severity),
      date: props.fromdate || props.pubDate,
      country: props.country,
      description: props.description || props.name
    };

    // FILTRADO MEJORADO
    const eventKey = `${eventData.eventId}-${eventData.date}-${eventData.country}`;
    
    if (seenEvents.has(eventKey)) return; // Skip duplicados
    seenEvents.add(eventKey);

    // Filtrar por país si se especifica
    if (countryFilter !== 'all' && eventData.country !== countryFilter) return;

    // Filtrar por fecha si se especifica
    if (fromDate && eventData.date && new Date(eventData.date) < new Date(fromDate)) return;
    if (toDate && eventData.date && new Date(eventData.date) > new Date(toDate)) return;

    // Solo agregar eventos válidos
    if (eventData.eventId && eventData.latitude && eventData.longitude) {
      filteredEvents.push(eventData);
    }
  });

  return {
    events: filteredEvents,
    count: filteredEvents.length,
    filterApplied: {
      country: countryFilter,
      fromDate: fromDate,
      toDate: toDate
    }
  };
}

export const getESARiskList = async (req, res) => {
  try {
    const { minTorinoScale = 0, maxTorinoScale = 10, limit = 100 } = req.query;

    // Usar NASA Close Approach API que funciona
    const targetUrl = `https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.2&date-min=2025-01-01&date-max=2030-12-31&sort=date&limit=${limit}`;

    const response = await fetch(targetUrl, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MeteorMadnessApp/1.0)'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Close Approach API error: ${response.status}` });
    }

    const json = await response.json();
    
    const riskObjects = json.data ? json.data.slice(0, parseInt(limit)).map(item => ({
      objectName: item[0] || 'Unknown',
      date: item[3] || 'Unknown',
      distance: parseFloat(item[4]) || 0,
      velocity: parseFloat(item[7]) || 0,
      diameter: parseFloat(item[9]) || 0,
      riskLevel: parseFloat(item[4]) < 0.05 ? 'High' : 'Low'
    })) : [];

    const parsedData = {
      riskObjects: riskObjects,
      count: json.count || 0,
      highRisk: riskObjects.filter(obj => obj.riskLevel === 'High')
    };
    
    res.json(parsedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



function parseMPCData(json) {
  if (!Array.isArray(json)) return { observations: [], count: 0 };
  
  return {
    observations: json.map(obs => ({
      objectName: obs.object_name,
      designation: obs.designation,
      date: obs.date,
      ra: obs.ra,
      dec: obs.dec,
      magnitude: parseFloat(obs.magnitude),
      observatoryCode: obs.observatory_code,
      discoveryFlag: obs.discovery_flag
    })),
    count: json.length
  };
}

function parseATLASData(json) {
  if (!json.detections) return { detections: [], count: 0 };
  
  return {
    detections: json.detections.map(detection => ({
      objectName: detection.object_name,
      date: detection.date,
      ra: parseFloat(detection.ra),
      dec: parseFloat(detection.dec),
      magnitude: parseFloat(detection.magnitude),
      filter: detection.filter,
      observatory: detection.observatory
    })),
    count: json.detections.length
  };
}

function parseNeoWsData(json, endpoint) {
  if (endpoint === 'feed') {
    const asteroids = [];
    const nearEarthObjects = json.near_earth_objects || {};

    Object.entries(nearEarthObjects).forEach(([date, objects]) => {
      objects.forEach(obj => {
        const approach = obj.close_approach_data?.[0] || {};
        asteroids.push({
          id: obj.id,
          name: obj.name,
          date: date,
          diameter: obj.estimated_diameter?.kilometers?.estimated_diameter_max,
          hazardous: obj.is_potentially_hazardous_asteroid,
          distance: parseFloat(approach.miss_distance?.kilometers),
          velocity: parseFloat(approach.relative_velocity?.kilometers_per_second)
        });
      });
    });

    return {
      asteroids: asteroids.sort((a, b) => a.distance - b.distance),
      count: asteroids.length,
      hazardousCount: asteroids.filter(a => a.hazardous).length
    };
  } else if (endpoint === 'lookup') {
    const approach = json.close_approach_data?.[0] || {};
    return {
      id: json.id,
      name: json.name,
      diameter: json.estimated_diameter?.kilometers?.estimated_diameter_max,
      hazardous: json.is_potentially_hazardous_asteroid,
      nextApproach: {
        date: approach.close_approach_date,
        distance: parseFloat(approach.miss_distance?.kilometers),
        velocity: parseFloat(approach.relative_velocity?.kilometers_per_second)
      }
    };
  } else {
    return json.near_earth_objects?.map(obj => ({
      id: obj.id,
      name: obj.name,
      hazardous: obj.is_potentially_hazardous_asteroid,
      magnitude: obj.absolute_magnitude_h
    })) || [];
  }
}

function parseNaturalEarthData(json) {
  return {
    features: json.features?.map(feature => ({
      name: feature.properties?.NAME || feature.properties?.name,
      type: feature.geometry?.type,
      coordinates: feature.geometry?.coordinates,
      properties: {
        country: feature.properties?.ADMIN || feature.properties?.admin,
        population: feature.properties?.POP_EST || feature.properties?.pop_est
      }
    })) || [],
    count: json.features?.length || 0
  };
}

export const getNASASEDAC = async (req, res) => {
  try {
    const { 
      bbox = '-99.25,19.5,-99.0,19.75',
      x = '256',
      y = '256'
    } = req.query;

    // Mock data para desarrollo mientras SEDAC está caído
    const coords = bbox.split(',').map(parseFloat);
    const center_lat = (coords[1] + coords[3]) / 2;
    const center_lon = (coords[0] + coords[2]) / 2;
    
    // Generar datos de población simulados basados en coordenadas
    const population_density = Math.abs(Math.sin(center_lat) * Math.cos(center_lon) * 10000);
    const population_count = Math.round(population_density * 100); // Área aproximada de 100 km²

    const mockData = [{
      id: `mock_${center_lon.toFixed(4)}_${center_lat.toFixed(4)}`,
      population_density: population_density,
      population_count: population_count,
      coordinates: [
        [coords[0], coords[1]],
        [coords[0], coords[3]],
        [coords[2], coords[3]],
        [coords[2], coords[1]],
        [coords[0], coords[1]]
      ],
      metadata: {
        source: "MOCK_DATA - NASA SEDAC temporalmente no disponible",
        bbox: bbox,
        timestamp: new Date().toISOString()
      }
    }];

    res.json({
      data: mockData,
      warning: "Usando datos mock - Servicio SEDAC no disponible",
      metadata: {
        source: "MOCK_DATA",
        bbox: bbox
      }
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
      suggestion: "El servicio NASA SEDAC está temporalmente no disponible"
    });
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