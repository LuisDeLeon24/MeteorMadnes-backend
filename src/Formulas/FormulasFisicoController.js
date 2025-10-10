import { fetchHorizonsData } from "../fetch/FetchController.js";

export const DatosCompletosAsteroide = async (req, res) => {
  try {
    let { id, name, eficienciaLuminica = 0.1, perdidaMasaFraction = 0.01 } = req.body;

    if (!id && !name) {
      return res.status(400).json({ error: "Se requiere 'id' o 'name' del asteroide" });
    }

    if (!id && name) id = name;

    // 1️⃣ Obtener datos de Horizons
    const horizons = await fetchHorizonsData(id);
    if (!horizons || !horizons.basicInfo) {
      return res.status(404).json({ error: "No se encontró información básica del asteroide" });
    }

    // 2️⃣ Masa del asteroide
    let massKg = null;
    const gm = horizons.basicInfo?.GM;
    if (gm) {
      const G = 6.6743e-20; // km³/(kg·s²)
      massKg = gm / G;
    } else if (horizons.basicInfo?.radius) {
      const radiusM = horizons.basicInfo.radius * 1000;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
      const density = 3000; // kg/m³ promedio
      massKg = volume * density;
    }
    if (!massKg)
      return res.status(404).json({ error: "No se pudo calcular la masa del asteroide" });

    const radiusM = horizons.basicInfo.radius * 1000;
    const areaTransversal = Math.PI * Math.pow(radiusM, 2);

    // 3️⃣ Velocidad de impacto
    const velRel = horizons.ephemeris?.[0]?.velRel ?? horizons.ephemeris?.[0]?.deldot;
    if (!velRel) {
      console.error("Datos de velocidad no encontrados:", horizons.ephemeris?.[0]);
      return res.status(404).json({ error: "No se encontró velocidad en Horizons" });
    }

    const vEscape = 11.2; // km/s, velocidad de escape terrestre
    const velocityKmS = Math.sqrt(Math.pow(Math.abs(velRel), 2) + Math.pow(vEscape, 2));
    const velocityMS = velocityKmS * 1000; // m/s

    // 4️⃣ Energía cinética y megatones
    const energiaCinetica = 0.5 * massKg * Math.pow(velocityMS, 2);
    const energiaMt = energiaCinetica / 4.184e15;

    // 5️⃣ Luminosidad y pérdida de masa
    const perdidaMasa = massKg * perdidaMasaFraction;
    const luminosidad = 0.5 * eficienciaLuminica * perdidaMasa * Math.pow(velocityMS, 2);

    // Ablación simplificada
    const densidadAire = 0.001225; // kg/m³
    const densidadMeteoro = 3000;
    const ablacionConst = 1.0;
    const perdida = Math.min(
      (ablacionConst * areaTransversal * densidadAire * Math.pow(velocityMS, 3)) / densidadMeteoro,
      massKg / 10
    );

    // Altura de fragmentación
    const presionCritica = 1e6; // Pa
    const H = 7000; // m
    const presionDinamica = 0.5 * densidadAire * Math.pow(velocityMS, 2);
    let alturaFragmentacion = H * Math.log(presionCritica / presionDinamica);
    alturaFragmentacion = Math.max(0, alturaFragmentacion);

    // Fuerza de arrastre
    const coefArrastre = 1.3;
    const fuerzaArrastre = 0.5 * coefArrastre * densidadAire * Math.pow(velocityMS, 2) * areaTransversal;
    const presionDinamicaFinal = presionDinamica;

    // Energía sísmica
    const factorSismico = 0.01;
    const energiaSismica = factorSismico * energiaCinetica;

    return res.json({
      id,
      name: horizons.basicInfo?.name || id,
      massKg,
      radiusM,
      velRel,
      vEscape,
      velocityKmS,
      velocityMS,
      areaTransversal,
      energiaCinetica,
      energiaLiberada: energiaMt,
      luminosidad,
      perdida,
      alturaFragmentacion,
      fuerzaArrastre,
      presionDinamica: presionDinamicaFinal,
      energiaSismica,
    });
  } catch (err) {
    console.error("Error en DatosCompletosAsteroide:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};
