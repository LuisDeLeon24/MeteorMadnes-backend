// controllers/FormulasDemograficoController.js

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
    const { densidadPoblacionHabKm2, areaAfectadaKm2 } = req.body;

    if (!densidadPoblacionHabKm2 || !areaAfectadaKm2) {
      return res.status(400).json({ error: "Debes enviar densidadPoblacionHabKm2 y areaAfectadaKm2" });
    }

    const nafHab = densidadPoblacionHabKm2 * areaAfectadaKm2;

    return res.json({ densidadPoblacionHabKm2, areaAfectadaKm2, nafHab });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 7. Mortalidad esperada directa
export const mortalidadDirecta = async (req, res) => {
  try {
    const { nafHab, factorLetalidad } = req.body;

    if (!nafHab || !factorLetalidad) {
      return res.status(400).json({ error: "Debes enviar nafHab y factorLetalidad" });
    }

    const muertesDirectas = nafHab * factorLetalidad;

    return res.json({ nafHab, factorLetalidad, muertesDirectas });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 8. Víctimas indirectas
export const victimasIndirectas = async (req, res) => {
  try {
    const { nafHab, beta } = req.body;

    if (!nafHab || !beta) {
      return res.status(400).json({ error: "Debes enviar nafHab y beta" });
    }

    const muertesIndirectas = beta * nafHab;

    return res.json({ nafHab, beta, muertesIndirectas });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 9. Pérdidas económicas
export const perdidasEconomicas = async (req, res) => {
  try {
    const { gamma, areaAfectadaKm2, valorUrbanoUsdKm2 } = req.body;

    if (!gamma || !areaAfectadaKm2 || !valorUrbanoUsdKm2) {
      return res.status(400).json({ error: "Debes enviar gamma, areaAfectadaKm2 y valorUrbanoUsdKm2" });
    }

    const perdidasUsd = gamma * areaAfectadaKm2 * valorUrbanoUsdKm2;

    return res.json({ gamma, areaAfectadaKm2, valorUrbanoUsdKm2, perdidasUsd });
  } catch (err) {
    res.status(500).json({ error: "Error interno", details: err.message });
  }
};

// 10. Índice de severidad demográfica
export const severidadDemografica = async (req, res) => {
  try {
    const { muertesTotales, poblacionTotal } = req.body;

    if (!muertesTotales || !poblacionTotal) {
      return res.status(400).json({ error: "Debes enviar muertesTotales y poblacionTotal" });
    }

    const sPorcentaje = (muertesTotales / poblacionTotal) * 100;

    return res.json({ muertesTotales, poblacionTotal, sPorcentaje });
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