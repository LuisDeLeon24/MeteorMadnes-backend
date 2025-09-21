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