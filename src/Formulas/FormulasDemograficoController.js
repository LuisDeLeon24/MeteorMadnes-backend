import { getWorldBankData } from '../fetch/FetchController.js';

// ========================================
// FUNCIONES DE LÓGICA PURA (reutilizables)
// ========================================

export const calcularPoblacionAfectada = async ({ country, areaAfectadaKm2, date }) => {
  const yearRange = date || '2020:2023';
  const densidadData = await getWorldBankData({ country, indicator: 'EN.POP.DNST', date: yearRange });
  const latestDensity = densidadData.data.find(d => d.value != null);
  if (!latestDensity) throw new Error("No se encontró densidad poblacional");
  
  const densidadPoblacionHabKm2 = latestDensity.value;
  const nafHab = densidadPoblacionHabKm2 * areaAfectadaKm2;
  
  return { densidadPoblacionHabKm2, nafHab, year: latestDensity.year };
};

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
  
  const factorLetalidad = Math.min(fLetalidadBase * (10 / camasPorMil), 0.3);
  
  return { 
    nafHab, 
    factorLetalidad, 
    muertesDirectas: nafHab * factorLetalidad, 
    year: latestDensity.year,
    densidadHabKm2,
    camasPorMil 
  };
};

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
  
  const beta = Math.min(betaBase * (10 / camasPorMil), 0.25);
  
  return { 
    nafHab, 
    beta, 
    muertesIndirectas: nafHab * beta, 
    year: latestDensity.year,
    densidadHabKm2,
    camasPorMil 
  };
};

export const calcularPerdidaPIB = async ({ country, areaAfectadaKm2, gamma = 1, date }) => {
  const yearRange = date || '2020:2023';
  
  const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
  const latestPoblacion = poblacionData.data.find(d => d.value != null);
  if (!latestPoblacion) throw new Error("No se encontró población total");
  const poblacionTotal = latestPoblacion.value;
  
  const nafHabRes = await calcularPoblacionAfectada({ country, areaAfectadaKm2, date });
  const nafHab = nafHabRes.nafHab;
  
  const SDI = Math.min(nafHab / poblacionTotal, 1);
  
  const gdpData = await getWorldBankData({ country, indicator: 'NY.GDP.MKTP.CD', date: yearRange });
  const latestGDP = gdpData.data.find(d => d.value != null);
  if (!latestGDP) throw new Error("No se encontró GDP total");
  const GDPtotal = latestGDP.value;
  
  const perdidaTotal = gamma * GDPtotal * SDI;
  
  return {
    year: latestGDP.year,
    GDPtotal,
    poblacionTotal,
    nafHab,
    SDI,
    gamma,
    perdidaTotalUSD: perdidaTotal
  };
};

export const calcularPerdidasEconomicas = async ({ country, areaAfectadaKm2, gammaBase = 0.3, date }) => {
  const yearRange = date || '2020:2023';
  
  const poblacionData = await getWorldBankData({ country, indicator: 'SP.URB.TOTL', date: yearRange });
  const latestPoblacion = poblacionData.data.find(d => d.value != null);
  if (!latestPoblacion) throw new Error("No se encontró población urbana");
  const poblacionUrbana = latestPoblacion.value;
  
  const pibData = await getWorldBankData({ country, indicator: 'NY.GDP.PCAP.CD', date: yearRange });
  const latestPib = pibData.data.find(d => d.value != null);
  const pibPerCapita = latestPib ? latestPib.value : 5000;
  
  const valorUrbanoUsdKm2 = (pibPerCapita * poblacionUrbana) / (poblacionUrbana / 1000);
  const gamma = Math.min(gammaBase, 1);
  const perdidasUsd = gamma * areaAfectadaKm2 * valorUrbanoUsdKm2;
  
  return {
    year: latestPoblacion.year,
    poblacionUrbana,
    pibPerCapita,
    valorUrbanoUsdKm2,
    gamma,
    perdidasUsd
  };
};

export const calcularSeveridadDemografica = async ({ country, areaAfectadaKm2, fLetalidadBase = 0.05, betaBase = 0.2, date }) => {
  const md = await calcularMuertesDirectas({ country, areaAfectadaKm2, fLetalidadBase, date });
  const mi = await calcularMuertesIndirectas({ country, areaAfectadaKm2, betaBase, date });
  
  const yearRange = date || '2020:2023';
  const poblacionData = await getWorldBankData({ country, indicator: 'SP.POP.TOTL', date: yearRange });
  const latestPoblacion = poblacionData.data.find(d => d.value != null);
  if (!latestPoblacion) throw new Error("No se encontró población total");
  
  const poblacionTotal = latestPoblacion.value;
  const muertesTotales = md.muertesDirectas + mi.muertesIndirectas;
  const sPorcentaje = (muertesTotales / poblacionTotal) * 100;
  
  return {
    year: latestPoblacion.year,
    poblacionTotal,
    muertesDirectas: md.muertesDirectas,
    muertesIndirectas: mi.muertesIndirectas,
    muertesTotales,
    sPorcentaje
  };
};

// ========================================
// ENDPOINTS DE API (wrappers HTTP)
// ========================================

const formatNumber = (num) => Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const poblacionAfectada = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, date } = req.body;
    const result = await calcularPoblacionAfectada({ country, areaAfectadaKm2, date });
    
    return res.json({
      country,
      year: result.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadPoblacionHabKm2: formatNumber(result.densidadPoblacionHabKm2),
      nafHab: formatNumber(result.nafHab)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const perdidaPIB = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, gamma = 1, date } = req.body;
    const result = await calcularPerdidaPIB({ country, areaAfectadaKm2, gamma, date });
    
    return res.json({
      country,
      year: result.year,
      GDPtotal: formatNumber(result.GDPtotal),
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      poblacionTotal: formatNumber(result.poblacionTotal),
      nafHab: formatNumber(result.nafHab),
      SDI: formatNumber(result.SDI),
      gamma: formatNumber(result.gamma),
      perdidaTotalUSD: formatNumber(result.perdidaTotalUSD)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const mortalidadDirecta = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, fLetalidadBase = 0.05, date } = req.body;
    const result = await calcularMuertesDirectas({ country, areaAfectadaKm2, fLetalidadBase, date });
    
    return res.json({
      country,
      year: result.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(result.densidadHabKm2),
      camasPorMil: formatNumber(result.camasPorMil),
      nafHab: formatNumber(result.nafHab),
      factorLetalidad: formatNumber(result.factorLetalidad),
      muertesDirectas: formatNumber(result.muertesDirectas)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const victimasIndirectas = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, betaBase = 0.2, date } = req.body;
    const result = await calcularMuertesIndirectas({ country, areaAfectadaKm2, betaBase, date });
    
    return res.json({
      country,
      year: result.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(result.densidadHabKm2),
      camasPorMil: formatNumber(result.camasPorMil),
      nafHab: formatNumber(result.nafHab),
      beta: formatNumber(result.beta),
      muertesIndirectas: formatNumber(result.muertesIndirectas)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const perdidasEconomicas = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, gammaBase = 0.3, date } = req.body;
    const result = await calcularPerdidasEconomicas({ country, areaAfectadaKm2, gammaBase, date });
    
    return res.json({
      country,
      year: result.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      poblacionUrbana: formatNumber(result.poblacionUrbana),
      pibPerCapita: formatNumber(result.pibPerCapita),
      valorUrbanoUsdKm2: formatNumber(result.valorUrbanoUsdKm2),
      gamma: formatNumber(result.gamma),
      perdidasUsd: formatNumber(result.perdidasUsd)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

export const severidadDemografica = async (req, res) => {
  try {
    const { country, areaAfectadaKm2, fLetalidadBase = 0.05, betaBase = 0.2, date } = req.body;
    const result = await calcularSeveridadDemografica({ country, areaAfectadaKm2, fLetalidadBase, betaBase, date });
    
    return res.json({
      country,
      year: result.year,
      poblacionTotal: formatNumber(result.poblacionTotal),
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      muertesDirectas: formatNumber(result.muertesDirectas),
      muertesIndirectas: formatNumber(result.muertesIndirectas),
      muertesTotales: formatNumber(result.muertesTotales),
      sPorcentaje: formatNumber(result.sPorcentaje)
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// ========================================
// RESUMEN IMPACTO (USA TODAS LAS FUNCIONES)
// ========================================

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

    console.log("Parámetros recibidos:", { country, areaAfectadaKm2});

    // Calcular todo usando las funciones reutilizables
    const poblacionData = await calcularPoblacionAfectada({ country, areaAfectadaKm2, date });
    const muertesDirectasData = await calcularMuertesDirectas({ country, areaAfectadaKm2, fLetalidadBase, date });
    const muertesIndirectasData = await calcularMuertesIndirectas({ country, areaAfectadaKm2, betaBase, date });
    const perdidaPIBData = await calcularPerdidaPIB({ country, areaAfectadaKm2, gamma, date });
    const perdidasEconomicasData = await calcularPerdidasEconomicas({ country, areaAfectadaKm2, gammaBase, date });
    const severidadData = await calcularSeveridadDemografica({ country, areaAfectadaKm2, fLetalidadBase, betaBase, date });

    console.log("Datos calculados:", {  poblacionData, muertesDirectasData, muertesIndirectasData, perdidaPIBData, perdidasEconomicasData, severidadData });

    return res.json({
      country,
      year: poblacionData.year,
      areaAfectadaKm2: formatNumber(areaAfectadaKm2),
      densidadHabKm2: formatNumber(poblacionData.densidadPoblacionHabKm2),
      nafHab: formatNumber(poblacionData.nafHab),
      camasPorMil: formatNumber(muertesDirectasData.camasPorMil),
      factorLetalidad: formatNumber(muertesDirectasData.factorLetalidad),
      muertesDirectas: formatNumber(muertesDirectasData.muertesDirectas),
      beta: formatNumber(muertesIndirectasData.beta),
      muertesIndirectas: formatNumber(muertesIndirectasData.muertesIndirectas),
      poblacionTotal: formatNumber(perdidaPIBData.poblacionTotal),
      GDPtotal: formatNumber(perdidaPIBData.GDPtotal),
      SDI: formatNumber(perdidaPIBData.SDI),
      perdidaPIBTotal: formatNumber(perdidaPIBData.perdidaTotalUSD),
      poblacionUrbana: formatNumber(perdidasEconomicasData.poblacionUrbana),
      pibPerCapita: formatNumber(perdidasEconomicasData.pibPerCapita),
      valorUrbanoUsdKm2: formatNumber(perdidasEconomicasData.valorUrbanoUsdKm2),
      perdidasEconomicasTotal: formatNumber(perdidasEconomicasData.perdidasUsd),
      muertesTotales: formatNumber(severidadData.muertesTotales),
      sPorcentaje: formatNumber(severidadData.sPorcentaje)
    });

  } catch (err) {
    console.error("Error en resumenImpacto:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};