import { fetchHorizonsData } from "../fetch/FetchController.js";
import fetch from 'node-fetch'; // si Node <18, si Node 18+ fetch es global

// Función auxiliar para buscar asteroide por nombre usando NEO WS
const fetchNeoData = async () => {
  const NASA_API_KEY = process.env.NASA_API_KEY || 'JXo5cUUAsYAIcaKdgdMgOqeefNNf77SVR0NznOa4';
  const targetUrl = `https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=${NASA_API_KEY}`;
  const response = await fetch(targetUrl);
  const json = await response.json();

  return json.near_earth_objects.map(obj => ({
    id: obj.id,
    name: obj.name,
    hazardous: obj.is_potentially_hazardous_asteroid,
    magnitude: obj.absolute_magnitude_h
  }));
};

export const EnergiaCinetica = async (req, res) => {
  try {
    let { id, name } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) {
      id = name; // Horizons acepta nombre o designación oficial
    }

    const horizons = await fetchHorizonsData(id);
    if (!horizons) {
      return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
    }

    // 1️⃣ Calcular masa
    let massKg = null;

    // Intentar con GM
    const gm = horizons.basicInfo?.GM;
    if (gm) {
      const G = 6.67430e-20; // km^3 / (kg * s^2)
      massKg = gm / G;
    }

    // Si GM no existe, estimar con radio y densidad promedio
    if (!massKg && horizons.basicInfo?.radius) {
      const radiusM = horizons.basicInfo.radius * 1000;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000; // kg/m³
      massKg = volume * density;
    }

    if (!massKg) {
      return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });
    }

    // 2️⃣ Usar deldot como velocidad (km/s)
    const velocityKmS = horizons.ephemeris[0]?.deldot;
    if (!velocityKmS) {
      return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
    }

    // 3️⃣ Calcular energía cinética
    const velocityMS = velocityKmS * 1000;
    const energyJ = 0.5 * massKg * Math.pow(velocityMS, 2);

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      massKg,
      velocityKmS,
      energyJ
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};



// desaceleracion atmosferica 2
export const DesaceleracionAtmosferica = async(req, res) => {
    try {
        const { coeficienteArrastre, densidadAire, velocidad, areaTransversal, masa } = req.body;

        // Validar que todos los parámetros estén presentes
        if (!coeficienteArrastre || !densidadAire || !velocidad || !areaTransversal || !masa) {
            return res.status(400).json({
                error: "Debes enviar coeficienteArrastre, densidadAire, velocidad, area y masa"
            });
        }

        //dv/dt=-C_d*p_a*v^2*A/(2*m)
        const desaceleracion = -(coeficienteArrastre * densidadAire * Math.pow(velocidad, 2) * areaTransversal) / (2 * masa);

        return res.json({
            desaceleracion
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }

};

// luminosidad 3
export const Luminosidad = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { eficienciaLuminica, PerdidaMasa, velocidad } = req.body;

        if (!eficienciaLuminica || !PerdidaMasa || !velocidad) {
            return res.status(400).json({
                error: "Debes enviar factor de eficiencia LUminica, perdida de masa y velocidad"
            });
        }

        // I = 0.5 * k * dm/dt * v^2
        const luminosidad = 0.5 * eficienciaLuminica * PerdidaMasa * Math.pow(velocidad, 2);

        return res.json({
            luminosidad
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};


// tamaño crater 4
// Coeficientes empíricos (valores típicos, pueden variar según materiales)
export const TamanoCrater = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { materialSuelo, materialMeteoro, energia } = req.body;

        if (!materialSuelo || !materialMeteoro || !energia) {
            return res.status(400).json({
                error: "Debes enviar material de suelo, material del meteoro y energia"
            });
        }

        // D = a * E^b
        const diametro = a * Math.pow(energia, b);

        return res.json({
            diametro
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// perdida masa por ablacion 5
export const PerdidaMasaAblacion = async(req, res) => {
    try {
        // Obtener datos 
        const ablacionConst = 1.0; // Constante de ablación (valor típico, puede variar)
        const { areaTransversal, densidadAire, velocidad, densidadMeteoro } = req.body;

        if (!areaTransversal || !densidadAire || !velocidad || !densidadMeteoro) {
            return res.status(400).json({
                error: "Debes enviar area transversal, densidad del Aire, velocidad y densidad del meteoro"
            });
        }

        //dm/dt = c * A * p_a * v^3 / p
        const perdida = (ablacionConst * areaTransversal * densidadAire * Math.pow(velocidad, 3)) / (densidadMeteoro);

        return res.json({
            perdida
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// altura fragmentacion 6
export const AlturaFragmentacion = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { alturaInicial, velocidadInicial, gravedad } = req.body;

        if (!alturaInicial || !velocidadInicial || !gravedad) {
            return res.status(400).json({
                error: "Debes enviar altura inicial y velocidad inicial"
            });
        }

        // h = h_0 - v_0^2 / (2 * g)
        const alturaFragmentacion = alturaInicial - (Math.pow(velocidadInicial, 2) / (2 * gravedad));

        return res.json({
            alturaFragmentacion: alturaFragmentacion
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// fuerza arrastre oscuro 7
export const FuerzaArrastreOscuro = async(req, res) => {
    try {
        const { coeficienteArrastre, densidadAire, velocidad, areaTransversal } = req.body;

        if (!coeficienteArrastre || !densidadAire || !velocidad || !areaTransversal) {
            return res.status(400).json({
                error: "Debes enviar coeficiente de arrastre, densidad del aire, velocidad y area transversal"
            });
        }

        const fuerzaArrastre = 0.5 * coeficienteArrastre * densidadAire * Math.pow(velocidad, 2) * areaTransversal;
        return res.json({
            fuerzaArrastre
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

//Presion dinamica (fragmentacion) 8
export const PresionDinamica = async(req, res) => {
    try {
        const { densidadAire, velocidad } = req.body;

        if (!densidadAire || !velocidad) {
            return res.status(400).json({
                error: "Debes enviar densidad del aire y velocidad"
            });
        }
        const presionDinamica = 0.5 * densidadAire * Math.pow(velocidad, 2);
        return res.json({
            presionDinamica
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// energia sismica por impacto del meteorito 9
export const EnergiaSismicaImpacto = async(req, res) => {
    try {
        const { energiaSismicaOnda, EnergiaCinetica } = req.body;
        if (!energiaSismicaOnda || !EnergiaCinetica) {
            return res.status(400).json({
                error: "Debes enviar  energia de la onda sismica y energia cinetica"
            });
        }
        const energiaSismica = energiaSismicaOnda * EnergiaCinetica;
        return res.json({
            energiaSismica
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// mitigacion impacto al meteoro 10
export const MitigacionImpacto = async(req, res) => {
    try {
        const { masaImpactor, velocidadImpactor, masaMeteoro } = req.body;
        if (!masaImpactor || !velocidadImpactor || !masaMeteoro) {
            return res.status(400).json({
                error: "Debes enviar masa del impactor, velocidad del impactor y masa del meteoro"
            });
        }
        const cambioVelocidad = (masaImpactor * velocidadImpactor) / (masaImpactor + masaMeteoro);
        return res.json({
            cambioVelocidad
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};