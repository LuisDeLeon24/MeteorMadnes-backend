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


// Desaceleración atmosférica calculada automáticamente
export const DesaceleracionAtmosferica = async (req, res) => {
  try {
    let { id, name } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) id = name; // Horizons acepta nombre o designación oficial

    const horizons = await fetchHorizonsData(id);
    if (!horizons) {
      return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
    }

    // 1️⃣ Calcular masa
    let massKg = null;
    const gm = horizons.basicInfo?.GM;
    if (gm) {
      const G = 6.67430e-20; // km^3 / (kg * s^2)
      massKg = gm / G;
    }
    if (!massKg && horizons.basicInfo?.radius) {
      const radiusM = horizons.basicInfo.radius * 1000;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000; // kg/m³
      massKg = volume * density;
    }
    if (!massKg) {
      return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });
    }

    // 2️⃣ Calcular área transversal (asumiendo esfera)
    const radiusM = horizons.basicInfo.radius * 1000;
    const areaTransversal = Math.PI * Math.pow(radiusM, 2);

    // 3️⃣ Asignar coeficiente de arrastre y densidad de aire
    const coeficienteArrastre = 0.47; // valor típico para esfera
    const densidadAire = 1.225; // kg/m³ a nivel del mar

    // 4️⃣ Velocidad (tomamos deldot en km/s)
    const velocityKmS = horizons.ephemeris[0]?.deldot;
    if (!velocityKmS) {
      return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
    }
    const velocityMS = Math.abs(velocityKmS * 1000); // convertir a m/s y tomar valor absoluto

    // 5️⃣ Calcular desaceleración
    const desaceleracion = -(coeficienteArrastre * densidadAire * Math.pow(velocityMS, 2) * areaTransversal) / (2 * massKg);

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      massKg,
      radiusM,
      areaTransversal,
      coeficienteArrastre,
      densidadAire,
      velocityMS,
      desaceleracion
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};


export const Luminosidad = async (req, res) => {
    try {
        let { id, name, eficienciaLuminica = 0.1, perdidaMasaFraction = 0.01 } = req.body;

        if (!id && !name) {
            return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
        }

        if (!id && name) id = name;

        // Obtener efemérides
        const horizons = await fetchHorizonsData(id);
        if (!horizons) {
            return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
        }

        // Calcular masa si no hay id
        let massKg = null;
        const gm = horizons.basicInfo?.GM;
        if (gm) {
            const G = 6.67430e-20; // km^3 / (kg * s^2)
            massKg = gm / G;
        } else if (horizons.basicInfo?.radius) {
            const radiusM = horizons.basicInfo.radius * 1000;
            const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
            const density = 3000; // kg/m³
            massKg = volume * density;
        }

        if (!massKg) {
            return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });
        }

        // Velocidad en m/s
        const velocityKmS = horizons.ephemeris[0]?.deldot;
        if (!velocityKmS) {
            return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
        }
        const velocityMS = velocityKmS * 1000;

        // Estimar pérdida de masa
        const perdidaMasa = massKg * perdidaMasaFraction;

        // Calcular luminosidad
        const luminosidad = 0.5 * eficienciaLuminica * perdidaMasa * Math.pow(velocityMS, 2);

        return res.json({
            id,
            name: horizons.basicInfo?.name || id,
            massKg,
            velocityKmS,
            luminosidad
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// pérdida de masa por ablación 5
export const PerdidaMasaAblacion = async (req, res) => {
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

    // 1️⃣ Obtener área transversal (A = π*r^2)
    const radiusM = horizons.basicInfo?.radius ? horizons.basicInfo.radius * 1000 : null;
    if (!radiusM) {
      return res.status(404).json({ error: "No se encontró radio del asteroide" });
    }
    const areaTransversal = Math.PI * Math.pow(radiusM, 2);

    // 2️⃣ Obtener velocidad absoluta en m/s
    const velocityKmS = horizons.ephemeris[0]?.deldot;
    if (!velocityKmS) {
      return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
    }
    const velocidadMS = Math.abs(velocityKmS * 1000);

    // 3️⃣ Calcular masa si no se pasa
    let massKg = null;
    const gm = horizons.basicInfo?.GM;
    if (gm) {
      const G = 6.67430e-20; // km^3 / (kg * s^2)
      massKg = gm / G;
    }
    if (!massKg && radiusM) {
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000; // kg/m³ promedio
      massKg = volume * density;
    }

    if (!massKg) {
      return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });
    }

    // 4️⃣ Constante de ablación típica
    const ablacionConst = 1.0;

    // 5️⃣ Densidad del aire promedio a 100 km (kg/m³)
    const densidadAire = 0.0000185;

    // 6️⃣ Densidad del meteoro promedio
    const densidadMeteoro = 3000;

    // 7️⃣ Calcular pérdida de masa por ablación: dm/dt = c * A * ρ_aire * v^3 / ρ_meteoro
    const perdida = (ablacionConst * areaTransversal * densidadAire * Math.pow(velocidadMS, 3)) / densidadMeteoro;

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      areaTransversal,
      velocityKmS,
      velocidadMS,
      massKg,
      perdida
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};



// Altura de fragmentación simplificada
export const AlturaFragmentacion = async (req, res) => {
  try {
    let { id, name } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) {
      id = name;
    }

    const horizons = await fetchHorizonsData(id);
    if (!horizons) {
      return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
    }

    // 1️⃣ Calcular masa (igual que en EnergiaCinetica)
    let massKg = null;
    const gm = horizons.basicInfo?.GM;
    if (gm) {
      const G = 6.67430e-20; // km^3 / (kg * s^2)
      massKg = gm / G;
    }
    if (!massKg && horizons.basicInfo?.radius) {
      const radiusM = horizons.basicInfo.radius * 1000;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000; // kg/m³ promedio
      massKg = volume * density;
    }
    if (!massKg) {
      return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });
    }

    // 2️⃣ Tomar velocidad (deldot) y convertir a m/s
    const velocityKmS = horizons.ephemeris[0]?.deldot;
    if (!velocityKmS) {
      return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
    }
    const velocityMS = Math.abs(velocityKmS * 1000); // usar valor absoluto

    // 3️⃣ Altura de fragmentación aproximada
    // Usamos modelo simplificado basado en masa y área del asteroide:
    const radiusM = horizons.basicInfo.radius * 1000;
    const areaTransversal = Math.PI * Math.pow(radiusM, 2); // m²
    const densidadAire = 1.225; // kg/m³ a nivel del mar
    const gravedad = 9.81; // m/s²
    const coefArrastre = 1.0; // valor típico

    // Fórmula simplificada: h = (0.5 * C_d * rho_air * A * v^2) / (m * g)
    const alturaFragmentacion = (0.5 * coefArrastre * densidadAire * areaTransversal * Math.pow(velocityMS, 2)) / (massKg * gravedad);

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      alturaFragmentacion
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// Fuerza de arrastre oscuro 7
export const FuerzaArrastreOscuro = async (req, res) => {
    try {
        let { id, name } = req.body;

        if (!id && !name) {
            return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
        }

        if (!id && name) {
            id = name;
        }

        const horizons = await fetchHorizonsData(id);
        if (!horizons) {
            return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
        }

        // Calcular masa
        let massKg = null;
        const gm = horizons.basicInfo?.GM;
        if (gm) {
            const G = 6.67430e-20; // km^3 / (kg * s^2)
            massKg = gm / G;
        }
        if (!massKg && horizons.basicInfo?.radius) {
            const radiusM = horizons.basicInfo.radius * 1000;
            const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
            const density = 3000; // kg/m³
            massKg = volume * density;
        }

        if (!massKg) return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });

        // Área transversal
        const areaTransversal = Math.PI * Math.pow(horizons.basicInfo.radius * 1000, 2);

        // Velocidad
        const velocityKmS = horizons.ephemeris[0]?.deldot;
        if (!velocityKmS) return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
        const velocityMS = Math.abs(velocityKmS * 1000);

        // Coeficiente de arrastre típico para meteoroides
        const coeficienteArrastre = 1.3;

        // Calcular fuerza de arrastre
        const fuerzaArrastre = 0.5 * coeficienteArrastre * 1.225 * Math.pow(velocityMS, 2) * areaTransversal;

        return res.json({
            id,
            name: horizons.basicInfo?.name || id,
            massKg,
            areaTransversal,
            velocityKmS,
            velocityMS,
            fuerzaArrastre
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error interno", details: err.message });
    }
};


// Presión dinámica (fragmentación) 8
export const PresionDinamica = async (req, res) => {
  try {
    let { id, name } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) id = name;

    const horizons = await fetchHorizonsData(id);
    if (!horizons) return res.status(404).json({ error: "No se encontró efemérides en Horizons" });

    // 1️⃣ Velocidad en m/s
    const velocityKmS = horizons.ephemeris[0]?.deldot;
    if (!velocityKmS) return res.status(404).json({ error: "No se encontró velocidad (deldot) en Horizons" });
    const velocityMS = Math.abs(velocityKmS * 1000); // m/s

    // 2️⃣ Área transversal aproximada (m²)
    const radiusM = horizons.basicInfo?.radius ? horizons.basicInfo.radius * 1000 : 1; // fallback 1 m
    const areaTransversal = Math.PI * Math.pow(radiusM, 2);

    // 3️⃣ Densidad del aire promedio (kg/m³)
    const densidadAire = 1.225; // al nivel del mar, simplificado

    // 4️⃣ Presión dinámica
    const presionDinamica = 0.5 * densidadAire * Math.pow(velocityMS, 2);

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      velocityKmS,
      velocityMS,
      areaTransversal,
      densidadAire,
      presionDinamica
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};

export const EnergiaSismicaImpacto = async (req, res) => {
  try {
    let { id, name } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) id = name;

    // Obtener datos de Horizons
    const horizons = await fetchHorizonsData(id);
    if (!horizons) {
      return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
    }

    // Calcular masa
    let massKg = null;
    const gm = horizons.basicInfo?.GM;
    if (gm) {
      const G = 6.67430e-20;
      massKg = gm / G;
    } else if (horizons.basicInfo?.radius) {
      const radiusM = horizons.basicInfo.radius * 1000;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000;
      massKg = volume * density;
    }

    if (!massKg) return res.status(404).json({ error: "No se pudo calcular la masa" });

    // Velocidad
    const velocityKmS = horizons.ephemeris[0]?.deldot;
    if (!velocityKmS) return res.status(404).json({ error: "No se encontró velocidad (deldot)" });
    const velocityMS = Math.abs(velocityKmS) * 1000;

    // Energía cinética
    const energiaCinetica = 0.5 * massKg * Math.pow(velocityMS, 2);

    // Factor de eficiencia para energía sísmica (típico 0.01–0.05)
    const factorSismico = 0.01;
    const energiaSismica = factorSismico * energiaCinetica;

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      massKg,
      velocityKmS,
      velocityMS,
      energiaCinetica,
      energiaSismica
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};

/*
export const MitigacionImpacto = async (req, res) => {
  try {
    let { id, name, masaImpactor, velocidadImpactor } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) id = name;

    // Obtener datos del asteroide
    const horizons = await fetchHorizonsData(id);
    if (!horizons) {
      return res.status(404).json({ error: "No se encontró efemérides en Horizons" });
    }

    // Masa del meteoro
    let masaMeteoro = horizons.basicInfo?.GM ? horizons.basicInfo.GM / 6.67430e-20 : null;
    if (!masaMeteoro && horizons.basicInfo?.radius) {
      const radiusM = horizons.basicInfo.radius * 1000;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000; // kg/m³
      masaMeteoro = volume * density;
    }

    // Velocidad del meteoro (km/s a m/s)
    const velocidadMeteoro = horizons.ephemeris[0]?.deldot * 1000;
    if (!velocidadMeteoro) {
      return res.status(404).json({ error: "No se encontró velocidad en Horizons" });
    }

    if (!masaImpactor || !velocidadImpactor) {
      return res.status(400).json({
        error: "Debes enviar masa del impactor y velocidad del impactor"
      });
    }

    const cambioVelocidad = (masaImpactor * velocidadImpactor) / (masaImpactor + masaMeteoro);

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      masaMeteoro,
      velocidadMeteoro,
      cambioVelocidad
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};
*/

export const EnergiaMegatones = async (req, res) => {
  try {
    // Reutilizamos el mismo flujo de EnergiaCinetica
    const energiaCineticaResponse = await EnergiaCinetica({
      body: req.body
    }, {
      status: (code) => ({
        json: (obj) => { throw { code, obj }; } // manejar errores de status
      }),
      json: (obj) => obj
    });

    const energiaJ = energiaCineticaResponse.energyJ;

    // Convertir a megatones de TNT
    const energiaMt = energiaJ / 4.184e15;

    return res.json({
      ...energiaCineticaResponse,
      energiaMt
    });

  } catch (err) {
    if (err.obj) {
      // Errores lanzados desde status().json
      return res.status(err.code).json(err.obj);
    }
    return res.status(500).json({ error: "Error interno", details: err.message });
  }
};
