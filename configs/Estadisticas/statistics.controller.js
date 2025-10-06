import { Statistics } from "./statistics.model.js";

// Guardar puntuación de un usuario
export const saveScore = async (req, res) => {
  const { uid, score } = req.body;

  try {
    const newScore = new Statistics({
      uid,
      score
    });

    await newScore.save();

    res.status(201).json({ 
      message: "Puntuación guardada correctamente",
      data: newScore 
    });
  } catch (err) {
    console.error("Error guardando puntuación:", err);
    res.status(500).json({ error: "Error guardando puntuación" });
  }
};

// Obtener todas las puntuaciones
export const getAllScores = async (req, res) => {
  try {
    const scores = await Statistics.find().sort({ date: -1 });
    res.status(200).json(scores);
  } catch (err) {
    console.error("Error obteniendo puntuaciones:", err);
    res.status(500).json({ error: "Error obteniendo puntuaciones" });
  }
};

// Obtener puntuaciones de un usuario específico
export const getUserScores = async (req, res) => {
  const { uid } = req.params;

  try {
    const scores = await Statistics.find({ uid }).sort({ date: -1 });
    res.status(200).json(scores);
  } catch (err) {
    console.error("Error obteniendo puntuaciones del usuario:", err);
    res.status(500).json({ error: "Error obteniendo puntuaciones del usuario" });
  }
};

// Obtener estadísticas completas (media, varianza, desviación estándar, etc.)
export const getStatistics = async (req, res) => {
  try {
    const allScores = await Statistics.find();

    if (allScores.length === 0) {
      return res.status(200).json({
        message: "No hay datos suficientes para calcular estadísticas",
        count: 0
      });
    }

    const scores = allScores.map(s => s.score);
    const n = scores.length;

    // Media (promedio)
    const mean = scores.reduce((sum, score) => sum + score, 0) / n;

    // Varianza
    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - mean, 2);
    }, 0) / n;

    // Desviación estándar
    const standardDeviation = Math.sqrt(variance);

    // Coeficiente de variación (CV = desviación estándar / media * 100)
    const coefficientOfVariation = (standardDeviation / mean) * 100;

    // Datos para la campana de Gauss (distribución normal)
    // Generamos puntos para graficar la distribución
    const gaussianData = [];
    const min = Math.floor(Math.min(...scores) - standardDeviation);
    const max = Math.ceil(Math.max(...scores) + standardDeviation);
    const step = (max - min) / 50; // 50 puntos para la curva

    for (let x = min; x <= max; x += step) {
      // Fórmula de la distribución normal
      const exponent = -Math.pow(x - mean, 2) / (2 * variance);
      const y = (1 / (standardDeviation * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      gaussianData.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(6)) });
    }

    // Histograma de frecuencias (para comparar con la curva)
    const bins = 10;
    const binSize = (max - min) / bins;
    const histogram = Array(bins).fill(0);
    const binLabels = [];

    scores.forEach(score => {
      const binIndex = Math.min(Math.floor((score - min) / binSize), bins - 1);
      histogram[binIndex]++;
    });

    for (let i = 0; i < bins; i++) {
      const binStart = min + (i * binSize);
      const binEnd = binStart + binSize;
      binLabels.push({
        range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count: histogram[i],
        frequency: (histogram[i] / n * 100).toFixed(2) + '%'
      });
    }

    // Valores máximo y mínimo
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Mediana
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sortedScores[n / 2 - 1] + sortedScores[n / 2]) / 2
      : sortedScores[Math.floor(n / 2)];

    res.status(200).json({
      count: n,
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      variance: parseFloat(variance.toFixed(2)),
      standardDeviation: parseFloat(standardDeviation.toFixed(2)),
      coefficientOfVariation: parseFloat(coefficientOfVariation.toFixed(2)) + '%',
      maxScore,
      minScore,
      gaussianData,
      histogram: binLabels,
      summary: {
        interpretation: coefficientOfVariation < 15 
          ? "Baja variabilidad - Los puntajes son consistentes"
          : coefficientOfVariation < 30
          ? "Variabilidad moderada"
          : "Alta variabilidad - Los puntajes son muy dispersos"
      }
    });
  } catch (err) {
    console.error("Error calculando estadísticas:", err);
    res.status(500).json({ error: "Error calculando estadísticas" });
  }
};

// Obtener estadísticas de un usuario específico
export const getUserStatistics = async (req, res) => {
  const { uid } = req.params;

  try {
    const userScores = await Statistics.find({ uid });

    if (userScores.length === 0) {
      return res.status(200).json({
        message: "No hay datos suficientes para este usuario",
        uid,
        count: 0
      });
    }

    const scores = userScores.map(s => s.score);
    const n = scores.length;

    const mean = scores.reduce((sum, score) => sum + score, 0) / n;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    res.status(200).json({
      uid,
      count: n,
      mean: parseFloat(mean.toFixed(2)),
      standardDeviation: parseFloat(standardDeviation.toFixed(2)),
      maxScore,
      minScore,
      lastScore: userScores[0].score,
      improvement: userScores.length > 1 
        ? parseFloat(((userScores[0].score - userScores[userScores.length - 1].score) / userScores[userScores.length - 1].score * 100).toFixed(2)) + '%'
        : 'N/A'
    });
  } catch (err) {
    console.error("Error calculando estadísticas del usuario:", err);
    res.status(500).json({ error: "Error calculando estadísticas del usuario" });
  }
};
