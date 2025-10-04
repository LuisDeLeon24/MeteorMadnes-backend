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
    const { country = 'GT', areaAfectadaKm2 = 100, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Traer densidad poblacional desde World Bank (habitantes por km²)
    const densidadData = await getWorldBankData({ 
      country, 
      indicator: 'EN.POP.DNST', 
      date: yearRange 
    });

    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) {
      return res.status(404).json({ error: "No se encontró densidad poblacional" });
    }

    const densidadPoblacionHabKm2 = latestDensity.value;

    // 2️⃣ Cálculo base: población afectada = densidad promedio * área
    const nafBase = densidadPoblacionHabKm2 * areaAfectadaKm2;

    // 3️⃣ Heurística para diferenciar urbano/rural
    // Si área es pequeña (<50 km2) y densidad nacional > 100 => probablemente urbano
    const isLikelyUrban = (areaAfectadaKm2 <= 50 && densidadPoblacionHabKm2 > 100);

    // Escenarios de ajuste
    const nafUrban = nafBase * (isLikelyUrban ? 3 : 1.2);  // urbano denso ≈ 3x
    const nafRural = nafBase * 0.5;                        // rural disperso ≈ 0.5x

    // Rango de incertidumbre
    const nafMin = Math.min(nafBase, nafUrban, nafRural);
    const nafMax = Math.max(nafBase, nafUrban, nafRural);

    // Función formateo
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    // 4️⃣ Respuesta JSON
    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadPoblacionHabKm2: formatNumber(densidadPoblacionHabKm2),
      nafHab_mean: formatNumber(nafBase),
      nafHab_min: formatNumber(nafMin),
      nafHab_max: formatNumber(nafMax),
      method: "national_density_with_urban_rural_heuristic",
      notes: isLikelyUrban 
        ? "Área pequeña y densidad alta: posible zona urbana — usar nafHab_max" 
        : "Estimación basada en densidad nacional promedio — alta incertidumbre"
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};


export const perdidaPIB = async (req, res) => {
  try {
    const { country = 'GT', areaAfectadaKm2 = 10, gamma = 1, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Población total
    const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
    const latestPoblacion = poblacionData.data.find(d => d.value != null);
    if (!latestPoblacion) return res.status(404).json({ error: "No se encontró población total" });
    const poblacionTotal = latestPoblacion.value;

    // 2️⃣ Población afectada
    const nafHabRes = await calcularPoblacionAfectada({ country, areaAfectadaKm2, date });
    const nafHab = nafHabRes.nafHab || areaAfectadaKm2;

    // 3️⃣ Traer GDP total
    const gdpData = await getWorldBankData({ country, indicator: 'NY.GDP.MKTP.CD', date: yearRange });
    const latestGDP = gdpData.data.find(d => d.value != null);
    if (!latestGDP) return res.status(404).json({ error: "No se encontró GDP total" });
    const GDPtotal = latestGDP.value;

    // 4️⃣ Calcular pérdida económica realista
    const impactoRelativo = Math.min((nafHab / poblacionTotal) * 0.1 * gamma, 0.05); // max 5% del GDP
    const perdidaTotal = GDPtotal * impactoRelativo;

    // 5️⃣ Formatear resultados
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestGDP.year,
      GDPtotal: formatNumber(GDPtotal),
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      poblacionTotal: formatNumber(poblacionTotal),
      nafHab: formatNumber(nafHab),
      impactoRelativo: formatNumber(impactoRelativo),
      perdidaTotalUSD: formatNumber(perdidaTotal)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 7. Mortalidad esperada directa
export const mortalidadDirecta = async (req, res) => {
  try {
    const { country = 'GT', areaAfectadaKm2 = 100, fLetalidadBase = 0.05, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Densidad poblacional
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) return res.status(404).json({ error: "No se encontró densidad poblacional" });
    const densidadHabKm2 = latestDensity.value;

    // 2️⃣ Población afectada
    const nafHab = densidadHabKm2 * areaAfectadaKm2;

    // 3️⃣ Camas hospitalarias (% camas por población)
    const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
    const latestCamas = camasData.data.find(d => d.value != null);
    const camasPorMil = latestCamas ? latestCamas.value : 1.5;

    // 4️⃣ Factor de letalidad ajustado y limitado
    const factorLetalidadAjustado = Math.min(fLetalidadBase * (10 / Math.max(camasPorMil, 1)), 0.3);

    // 5️⃣ Muertes directas
    const muertesDirectas = nafHab * factorLetalidadAjustado;

    // 6️⃣ Formatear resultados
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(densidadHabKm2),
      camasPorMil: formatNumber(camasPorMil),
      nafHab: formatNumber(nafHab),
      factorLetalidad: formatNumber(factorLetalidadAjustado),
      muertesDirectas: formatNumber(muertesDirectas)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};




// 8. Víctimas indirectas
export const victimasIndirectas = async (req, res) => {
  try {
    const { country = 'GT', areaAfectadaKm2 = 100, betaBase = 0.2, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Densidad poblacional
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    if (!latestDensity) return res.status(404).json({ error: "No se encontró densidad poblacional" });
    const densidadHabKm2 = latestDensity.value;

    // 2️⃣ Población afectada
    const nafHab = densidadHabKm2 * areaAfectadaKm2;

    // 3️⃣ Camas hospitalarias
    const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
    const latestCamas = camasData.data.find(d => d.value != null);
    const camasPorMil = latestCamas ? latestCamas.value : 1.5;

    // 4️⃣ Factor de víctimas indirectas ajustado y limitado
    const betaAjustado = Math.min(betaBase * (10 / Math.max(camasPorMil, 1)), 0.25);

    // 5️⃣ Muertes indirectas
    const muertesIndirectas = nafHab * betaAjustado;

    // 6️⃣ Formatear resultados
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestDensity.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(densidadHabKm2),
      camasPorMil: formatNumber(camasPorMil),
      nafHab: formatNumber(nafHab),
      beta: formatNumber(betaAjustado),
      muertesIndirectas: formatNumber(muertesIndirectas)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

//9.perdidas economicas
export const perdidasEconomicas = async (req, res) => {
  try {
    const { country = 'GT', areaAfectadaKm2 = 100, gammaBase = 0.3, date } = req.body;
    const yearRange = date || '2020:2023';

    // 1️⃣ Traer población urbana
    const poblacionData = await getWorldBankData({ country, indicator: 'SP.URB.TOTL', date: yearRange });
    const latestPoblacion = poblacionData.data.find(d => d.value != null);
    if (!latestPoblacion) return res.status(404).json({ error: "No se encontró población urbana" });
    const poblacionUrbana = latestPoblacion.value;

    // 2️⃣ Traer PIB per cápita (USD)
    const pibData = await getWorldBankData({ country, indicator: 'NY.GDP.PCAP.CD', date: yearRange });
    const latestPib = pibData.data.find(d => d.value != null);
    const pibPerCapita = latestPib ? latestPib.value : 5000;

    // 3️⃣ Traer densidad urbana (habitantes/km²)
    const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
    const latestDensity = densidadData.data.find(d => d.value != null);
    const densidadHabKm2 = latestDensity ? latestDensity.value : 200; // fallback

    // 4️⃣ Valor urbano por km² aproximado
    const valorUrbanoUsdKm2 = pibPerCapita * densidadHabKm2;

    // 5️⃣ Calcular pérdidas económicas
    const gamma = Math.min(gammaBase, 1);
    const perdidasUsd = gamma * areaAfectadaKm2 * valorUrbanoUsdKm2;

    // Formatear números
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return res.json({
      country,
      year: latestPoblacion.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      poblacionUrbana: formatNumber(poblacionUrbana),
      pibPerCapita: formatNumber(pibPerCapita),
      densidadHabKm2: formatNumber(densidadHabKm2),
      valorUrbanoUsdKm2: formatNumber(valorUrbanoUsdKm2),
      gamma: formatNumber(gamma),
      perdidasUsd: formatNumber(perdidasUsd)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};


// 10.severidad demografica
export const severidadDemografica = async (req, res) => {
  try {
    const { country = 'GT', areaAfectadaKm2 = 100, fLetalidadBase = 0.05, betaBase = 0.2, date } = req.body;

    const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

    // 1️⃣ Muertes directas
    const md = await calcularMuertesDirectas({ country, areaAfectadaKm2, fLetalidadBase, date });

    // 2️⃣ Muertes indirectas
    const mi = await calcularMuertesIndirectas({ country, areaAfectadaKm2, betaBase, date });

    // 3️⃣ Población total
    const yearRange = date || '2020:2023';
    const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
    const latestPoblacion = poblacionData.data.find(d => d.value != null);
    if (!latestPoblacion) return res.status(404).json({ error: "No se encontró población total" });
    const poblacionTotal = latestPoblacion.value;

    // 4️⃣ Calcular muertes totales y severidad
    const muertesTotales = md.muertesDirectasNum + mi.muertesIndirectasNum; // usar valores numéricos crudos
    const sPorcentaje = Math.min((muertesTotales / poblacionTotal) * 100, 100);

    return res.json({
      country,
      year: latestPoblacion.year,
      poblacionTotal: formatNumber(poblacionTotal),
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      muertesDirectas: formatNumber(md.muertesDirectasNum),
      muertesIndirectas: formatNumber(mi.muertesIndirectasNum),
      muertesTotales: formatNumber(muertesTotales),
      sPorcentaje: formatNumber(sPorcentaje)
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};


//11. Material eyectado
export const materialEyectado = async (req, res) => {
  try {
    const { delta = 1, densidadObjetivoKgm3, rcM } = req.body;

    if (!densidadObjetivoKgm3 || !rcM) {
      return res.status(400).json({ error: "Debes enviar densidadObjetivoKgm3 y rcM" });
    }

    // Volumen aproximado como cono eyectadoconst meyKg = delta * densidadObjetivoKgm3 * (1/3) * Math.PI * Math.pow(rcM, 3);

    return res.json({ delta, densidadObjetivoKgm3, rcM, meyKg: Number(meyKg.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const calcularMuertesDirectas = async ({ country, areaAfectadaKm2 = 100, fLetalidadBase = 0.05, date }) => {
  const yearRange = date || '2020:2023';

  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");
  const densidadHabKm2 = latestDensity.value;

  const nafHab = densidadHabKm2 * areaAfectadaKm2;

  const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
  const latestCamas = camasData.data.find(d => d.value != null);
  const camasPorMil = latestCamas ? latestCamas.value : 1.5;

  // Ajuste realista: factor de letalidad entre 0.01 y 0.5
  let factorLetalidad = fLetalidadBase * (10 / camasPorMil);
  factorLetalidad = Math.min(Math.max(factorLetalidad, 0.01), 0.5);

  return { nafHab, factorLetalidad, muertesDirectas: nafHab * factorLetalidad, year: latestDensity.year };
};

// Función interna para muertes indirectas
export const calcularMuertesIndirectas = async ({ country, areaAfectadaKm2 = 100, betaBase = 0.2, date }) => {
  const yearRange = date || '2020:2023';

  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");
  const densidadHabKm2 = latestDensity.value;

  const nafHab = densidadHabKm2 * areaAfectadaKm2;

  const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
  const latestCamas = camasData.data.find(d => d.value != null);
  const camasPorMil = latestCamas ? latestCamas.value : 1.5;

  // Ajuste realista: beta entre 0.01 y 0.2
  let beta = betaBase * (10 / camasPorMil);
  beta = Math.min(Math.max(beta, 0.01), 0.2);

  return { nafHab, beta, muertesIndirectas: nafHab * beta, year: latestDensity.year };
};


export const calcularPoblacionAfectada = async ({ country = 'GT', areaAfectadaKm2 = 100, date }) => {
  const yearRange = date || '2020:2023';

  // Traer densidad poblacional
  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");

  const densidadPoblacionHabKm2 = latestDensity.value;
  let nafHab = densidadPoblacionHabKm2 * areaAfectadaKm2;

  // Limitar población afectada al total del país
  const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
  const latestPoblacion = poblacionData.data.find(d => d.value != null);
  const poblacionTotal = latestPoblacion ? latestPoblacion.value : Infinity;

  nafHab = Math.min(nafHab, poblacionTotal);

  return { densidadPoblacionHabKm2, nafHab, year: latestDensity.year };
};

export const resumenImpacto = async (req, res) => {
  try {
    const {
      country = 'GT',
      areaAfectadaKm2 = 100,
      fLetalidadBase = 0.05,
      betaBase = 0.2,
      gammaBase = 0.3,
      gamma = 1,
      date
    } = req.body;

    const yearRange = date || '2020:2023';

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
    // 2️⃣ Mortalidad directa
    // --------------------------
    const camasData = await getWorldBankData({ country, indicator: 'SH.MED.BEDS.ZS', date: yearRange });
    const latestCamas = camasData.data.find(d => d.value != null);
    const camasPorMil = latestCamas ? latestCamas.value : 1.5;

    const factorLetalidad = Math.min(fLetalidadBase * (10 / camasPorMil), 0.15);
    const muertesDirectas = nafHab * factorLetalidad;

    // --------------------------
    // 3️⃣ Víctimas indirectas
    // --------------------------
    const beta = Math.min(betaBase * (10 / camasPorMil), 0.10);
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
    // 5️⃣ Pérdidas económicas urbanas - CORREGIDO
    // --------------------------
    const poblacionUrbanaData = await getWorldBankData({ country, indicator: 'SP.URB.TOTL', date: yearRange });
    const latestPoblacionUrbana = poblacionUrbanaData.data.find(d => d.value != null);
    const poblacionUrbana = latestPoblacionUrbana ? latestPoblacionUrbana.value : 0;

    const pibData = await getWorldBankData({ country, indicator: 'NY.GDP.PCAP.CD', date: yearRange });
    const latestPib = pibData.data.find(d => d.value != null);
    const pibPerCapita = latestPib ? latestPib.value : 5000;

    // PIB urbano aproximado
    const PIBurbano = poblacionUrbana * pibPerCapita;

    // Limitar población afectada al máximo urbano
    const poblacionAfectadaUrbana = Math.min(nafHab, poblacionUrbana);

    // Pérdidas económicas ajustadas
    const perdidasEconomicasTotal = (poblacionAfectadaUrbana / poblacionUrbana) * PIBurbano * Math.min(gammaBase, 1);

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
      perdidasEconomicasTotal: formatNumber(perdidasEconomicasTotal),
      muertesTotales: formatNumber(muertesTotales),
      sPorcentaje: formatNumber(sPorcentaje)
    });

  } catch (err) {
    console.error("Error en resumenImpacto:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};