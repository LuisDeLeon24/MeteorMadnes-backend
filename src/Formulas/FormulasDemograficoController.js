import { getWorldBankData } from '../fetch/FetchController.js';
// 1. Energía cinética (base para todo)
export const energia = (masaKg, velocidadMs) => {
  return 0.5 * masaKg * Math.pow(velocidadMs, 2); // J
};

// 2. Conversión de energía a megatones TNT
export const energiaMegatones = async (req, res) => {
  try {
    const { masaKg, velocidadKms } = req.body;

    if (!masaKg || !velocidadKms) {
      return res.status(400).json({ error: "Debes enviar masaKg (kg) y velocidadKms (km/s)" });
    }

    const velocidadMs = velocidadKms * 1000;
    const energiaJ = energia(masaKg, velocidadMs);
    const energiaMt = energiaJ / 4.184e15;

    return res.json({ masaKg, velocidadMs, energiaJ, energiaMt });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 3. Radio del cráter de impacto (empírico)
export const radioCrater = async (req, res) => {
  try {
    const { masaKg, densidadObjetivoKgm3, velocidadMs, k } = req.body;

    if (!masaKg || !densidadObjetivoKgm3 || !velocidadMs || !k) {
      return res.status(400).json({ error: "Debes enviar masaKg, densidadObjetivoKgm3, velocidadMs, k" });
    }

    const rcM = k * Math.pow(masaKg / densidadObjetivoKgm3, 1/3) * Math.pow(velocidadMs, 0.44);

    return res.json({ masaKg, densidadObjetivoKgm3, velocidadMs, k, rcM });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 4. Radio de destrucción total
export const radioDestruccion = async (req, res) => {
  try {
    const { energiaMt, alfa } = req.body;

    if (!energiaMt || !alfa) {
      return res.status(400).json({ error: "Debes enviar energiaMt y alfa" });
    }

    const rdKm = alfa * Math.pow(energiaMt, 1/3);

    return res.json({ energiaMt, alfa, rdKm });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 5. Presión dinámica onda de choque
export const presionDinamica = async (req, res) => {
  try {
    const { densidadAireKgm3, velocidadOndaMs } = req.body;

    if (!densidadAireKgm3 || !velocidadOndaMs) {
      return res.status(400).json({ error: "Debes enviar densidadAireKgm3 y velocidadOndaMs" });
    }

    const pPa = 0.5 * densidadAireKgm3 * Math.pow(velocidadOndaMs, 2);

    return res.json({ densidadAireKgm3, velocidadOndaMs, pPa });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 6. Población afectada
export const poblacionAfectada = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Traer densidad poblacional desde World Bank
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) return res.status(404).json({ error: "No se encontró densidad poblacional" });
    const densidadPoblacionHabKm2 = latestDensity.value;

    // 2️⃣ Calcular población afectada
    const nafHab = densidadPoblacionHabKm2 * areaAfectadaKm2;

    // Función para formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadPoblacionHabKm2: formatNumber(densidadPoblacionHabKm2),
      nafHab: formatNumber(nafHab)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};


export const perdidaPIB = async (req, res) => {
  try {
    const {
      country,
      areaAfectadaKm2,
      gamma = 1,
      date
    } = req.body;

    const yearRange = date || '2020:2023';

    // 1️⃣ Traer población total
    const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
    const latestPoblacion = poblacionData.data.find(d => d.value != null);
    if (!latestPoblacion) return res.status(404).json({ error: "No se encontró población total" });
    const poblacionTotal = latestPoblacion.value;

    // 2️⃣ Traer población afectada
    const nafHabRes = await calcularPoblacionAfectada({ country, areaAfectadaKm2, date });
    const nafHab = nafHabRes.nafHab || areaAfectadaKm2; // fallback

    // 3️⃣ Estimar SDI
    const SDI = Math.min(nafHab / poblacionTotal, 1); // limitar a 1

    // 4️⃣ Traer GDP total
    const gdpData = await getWorldBankData({ country, indicator: 'NY.GDP.MKTP.CD', date: yearRange });
    const latestGDP = gdpData.data.find(d => d.value != null);
    if (!latestGDP) return res.status(404).json({ error: "No se encontró GDP total" });
    const GDPtotal = latestGDP.value;

    // 5️⃣ Calcular pérdida total
    const perdidaTotal = gamma * GDPtotal * SDI;

    // Formatear números con comas
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestGDP.year,
      GDPtotal: formatNumber(GDPtotal),
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      poblacionTotal: formatNumber(poblacionTotal),
      nafHab: formatNumber(nafHab),
      SDI: formatNumber(SDI),
      gamma: formatNumber(gamma),
      perdidaTotalUSD: formatNumber(perdidaTotal)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 7. Mortalidad esperada directa
export const mortalidadDirecta = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, fLetalidadBase = 0.05, date } = req.body;
    const yearRange = date || '2020:2023';

    // Densidad poblacional
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) return res.status(404).json({ error: "No se encontró densidad poblacional" });
    const densidadHabKm2 = latestDensity.value;

    // Población afectada
    const nafHab = densidadHabKm2 * areaAfectadaKm2;

    // Camas hospitalarias
    const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
    const latestCamas = camasData.data.find(d => d.value != null);
    const camasPorMil = latestCamas ? latestCamas.value : 1.5;

    // Factor de letalidad ajustado
    const factorLetalidad = fLetalidadBase * (10 / camasPorMil);

    // Muertes directas
    const muertesDirectas = nafHab * factorLetalidad;

    // Función para formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(densidadHabKm2),
      camasPorMil: formatNumber(camasPorMil),
      nafHab: formatNumber(nafHab),
      factorLetalidad: formatNumber(factorLetalidad),
      muertesDirectas: formatNumber(muertesDirectas)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};



// 8. Víctimas indirectas
export const victimasIndirectas = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, betaBase = 0.2, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Traer densidad poblacional
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) return res.status(404).json({ error: "No se encontró densidad poblacional" });
    const densidadHabKm2 = latestDensity.value;

    // 2️⃣ Calcular población afectada
    const nafHab = densidadHabKm2 * areaAfectadaKm2;

    // 3️⃣ Ajustar beta según infraestructura de salud
    const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
    const latestCamas = camasData.data.find(d => d.value != null);
    const camasPorMil = latestCamas ? latestCamas.value : 1.5;

    // Factor de víctimas indirectas ajustado
    const beta = Math.min(betaBase * (10 / camasPorMil), 1);

    // 4️⃣ Calcular víctimas indirectas
    const muertesIndirectas = nafHab * beta;

    // Función para formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(densidadHabKm2),
      camasPorMil: formatNumber(camasPorMil),
      nafHab: formatNumber(nafHab),
      beta: formatNumber(beta),
      muertesIndirectas: formatNumber(muertesIndirectas)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 9. Pérdidas económicas
export const perdidasEconomicas = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, gammaBase = 0.3, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Traer población total y urbana
    const poblacionData = await getWorldBankData({ country, indicator: 'SP.URB.TOTL', date: yearRange });
    const latestPoblacion = poblacionData.data.find(d => d.value != null);
    if (!latestPoblacion) return res.status(404).json({ error: "No se encontró población urbana" });
    const poblacionUrbana = latestPoblacion.value;

    // 2️⃣ Traer PIB per cápita (USD)
    const pibData = await getWorldBankData({ country, indicator: 'NY.GDP.PCAP.CD', date: yearRange });
    const latestPib = pibData.data.find(d => d.value != null);
    const pibPerCapita = latestPib ? latestPib.value : 5000; // valor por defecto si no hay datos

    // 3️⃣ Estimar valor urbano por km²
    const valorUrbanoUsdKm2 = (pibPerCapita * poblacionUrbana) / (poblacionUrbana / 1000);

    // 4️⃣ Calcular pérdidas económicas
    const gamma = Math.min(gammaBase, 1); // limitar a 1
    const perdidasUsd = gamma * areaAfectadaKm2 * valorUrbanoUsdKm2;

    // Función para formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestPoblacion.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      poblacionUrbana: formatNumber(poblacionUrbana),
      pibPerCapita: formatNumber(pibPerCapita),
      valorUrbanoUsdKm2: formatNumber(valorUrbanoUsdKm2),
      gamma: formatNumber(gamma),
      perdidasUsd: formatNumber(perdidasUsd)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};


// 10. Índice de severidad demográfica
export const severidadDemografica = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, fLetalidadBase = 0.05, betaBase = 0.2, date } = req.body;

    // Función para formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    // Calcular muertes directas
    const md = await calcularMuertesDirectas({ country, areaAfectadaKm2, fLetalidadBase, date });

    // Calcular muertes indirectas
    const mi = await calcularMuertesIndirectas({ country, areaAfectadaKm2, betaBase, date });

    // Traer población total
    const yearRange = date || '2020:2023';
    const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
    const latestPoblacion = poblacionData.data.find(d => d.value != null);
    if (!latestPoblacion) return res.status(404).json({ error: "No se encontró población total" });

    const poblacionTotal = latestPoblacion.value;

    // Calcular muertes totales y severidad
    const muertesTotales = md.muertesDirectas + mi.muertesIndirectas;
    const sPorcentaje = (muertesTotales / poblacionTotal) * 100;

    return res.json({
      country,
      year: latestPoblacion.year,
      poblacionTotal: formatNumber(poblacionTotal),
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      muertesDirectas: formatNumber(md.muertesDirectas),
      muertesIndirectas: formatNumber(mi.muertesIndirectas),
      muertesTotales: formatNumber(muertesTotales),
      sPorcentaje: formatNumber(sPorcentaje)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};


// 11. Volumen material eyectado
export const materialEyectado = async (req, res) => {
  try {
    const { delta, densidadObjetivoKgm3, rcM } = req.body;

    if (!delta || !densidadObjetivoKgm3 || !rcM) {
      return res.status(400).json({ error: "Debes enviar delta, densidadObjetivoKgm3 y rcM" });
    }

    const meyKg = delta * densidadObjetivoKgm3 * Math.pow(rcM, 3);

    return res.json({ delta, densidadObjetivoKgm3, rcM, meyKg });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// Función interna para muertes directas
export const calcularMuertesDirectas = async ({ country, areaAfectadaKm2, fLetalidadBase = 0.05, date }) => {
  const yearRange = date || '2020:2023';

  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");
  const densidadHabKm2 = latestDensity.value;

  const nafHab = densidadHabKm2 * areaAfectadaKm2;

  const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
  const latestCamas = camasData.data.find(d => d.value != null);
  const camasPorMil = latestCamas ? latestCamas.value : 1.5;

  const factorLetalidad = Math.min(fLetalidadBase * (10 / camasPorMil), 1);

  return { nafHab, factorLetalidad, muertesDirectas: nafHab * factorLetalidad, year: latestDensity.year };
};

// Función interna para muertes indirectas
export const calcularMuertesIndirectas = async ({ country, areaAfectadaKm2, betaBase = 0.2, date }) => {
  const yearRange = date || '2020:2023';

  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");
  const densidadHabKm2 = latestDensity.value;

  const nafHab = densidadHabKm2 * areaAfectadaKm2;

  const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
  const latestCamas = camasData.data.find(d => d.value != null);
  const camasPorMil = latestCamas ? latestCamas.value : 1.5;

  const beta = Math.min(betaBase * (10 / camasPorMil), 1);

  return { nafHab, beta, muertesIndirectas: nafHab * beta, year: latestDensity.year };
};

export const calcularPoblacionAfectada = async ({ country, areaAfectadaKm2, date }) => {
  const yearRange = date || '2020:2023';

  // Traer densidad poblacional desde World Bank
  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");

  const densidadPoblacionHabKm2 = latestDensity.value;
  const nafHab = densidadPoblacionHabKm2 * areaAfectadaKm2;

  return { densidadPoblacionHabKm2, nafHab, year: latestDensity.year };
};

export const resumenImpacto = async (req, res) => {
  try {
    const {
      country,
      areaAfectadaKm2,
      fLetalidadBase = 0.05,
      betaBase = 0.2,
      gammaBase = 0.3,
      gamma = 1,
      date
    } = req.body;

    const yearRange = date || '2020:2023';

    // Función para formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    // --------------------------
    // 1️⃣ Población afectada
    // --------------------------
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) return res.status(404).json({ error: "No se encontró densidad poblacional" });

    const densidadHabKm2 = latestDensity.value;
    const nafHab = densidadHabKm2 * areaAfectadaKm2;

    // --------------------------
    // 2️⃣ Mortalidad directa - CORREGIDO: Limitar a 1.0
    // --------------------------
    const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
    const latestCamas = camasData.data.find(d => d.value != null);
    const camasPorMil = latestCamas ? latestCamas.value : 1.5;

    const factorLetalidad = Math.min(fLetalidadBase * (10 / camasPorMil), 1.0); // ✅ Limitar a 1.0
    const muertesDirectas = nafHab * factorLetalidad;

    // --------------------------
    // 3️⃣ Víctimas indirectas - CORREGIDO: Limitar a 1.0
    // --------------------------
    const beta = Math.min(betaBase * (10 / camasPorMil), 1.0); // ✅ Limitar a 1.0
    const muertesIndirectas = nafHab * beta;

    // --------------------------
    // 4️⃣ Pérdida por PIB
    // --------------------------
    const poblacionTotalData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
    const latestPoblacionTotal = poblacionTotalData.data.find(d => d.value != null);
    if (!latestPoblacionTotal) return res.status(404).json({ error: "No se encontró población total" });
    const poblacionTotal = latestPoblacionTotal.value;

    const gdpData = await getWorldBankData({ country, indicator: 'NY.GDP.MKTP.CD', date: yearRange });
    const latestGDP = gdpData.data.find(d => d.value != null);
    if (!latestGDP) return res.status(404).json({ error: "No se encontró GDP total" });
    const GDPtotal = latestGDP.value;

    const SDI = Math.min(nafHab / poblacionTotal, 1);
    const perdidaPIBTotal = gamma * GDPtotal * SDI;

    // --------------------------
    // 5️⃣ Pérdidas económicas
    // --------------------------
    const poblacionUrbanaData = await getWorldBankData({ country, indicator: 'SP.URB.TOTL', date: yearRange });
    const latestPoblacionUrbana = poblacionUrbanaData.data.find(d => d.value != null);
    const poblacionUrbana = latestPoblacionUrbana ? latestPoblacionUrbana.value : 0;

    const pibData = await getWorldBankData({ country, indicator: 'NY.GDP.PCAP.CD', date: yearRange });
    const latestPib = pibData.data.find(d => d.value != null);
    const pibPerCapita = latestPib ? latestPib.value : 5000;

    const valorUrbanoUsdKm2 = (pibPerCapita * poblacionUrbana) / (poblacionUrbana / 1000);
    const perdidasEconomicasTotal = Math.min(gammaBase, 1) * areaAfectadaKm2 * valorUrbanoUsdKm2;

    // --------------------------
    // 6️⃣ Severidad demográfica
    // --------------------------
    const muertesTotales = muertesDirectas + muertesIndirectas;
    const sPorcentaje = (muertesTotales / poblacionTotal) * 100;

    // --------------------------
    // Resumen master
    // --------------------------
    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(densidadHabKm2),
      nafHab: formatNumber(nafHab),
      camasPorMil: formatNumber(camasPorMil),
      factorLetalidad: formatNumber(factorLetalidad),
      muertesDirectas: formatNumber(muertesDirectas),
      beta: formatNumber(beta),
      muertesIndirectas: formatNumber(muertesIndirectas),
      poblacionTotal: formatNumber(poblacionTotal),
      GDPtotal: formatNumber(GDPtotal),
      SDI: formatNumber(SDI),
      perdidaPIBTotal: formatNumber(perdidaPIBTotal),
      poblacionUrbana: formatNumber(poblacionUrbana),
      pibPerCapita: formatNumber(pibPerCapita),
      valorUrbanoUsdKm2: formatNumber(valorUrbanoUsdKm2),
      perdidasEconomicasTotal: formatNumber(perdidasEconomicasTotal),
      muertesTotales: formatNumber(muertesTotales),
      sPorcentaje: formatNumber(sPorcentaje)
    });

  } catch (err) {
    console.error("Error en resumenImpacto:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};