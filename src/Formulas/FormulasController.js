export const Energia = async (req, res) => {
  try {
    // Obtener datos desde el body (POST) o query (GET)
    const { masaKg, velocidadKms } = req.body; 

    if (!masaKg || !velocidadKms) {
      return res.status(400).json({
        error: "Debes enviar masaKg (kg) y velocidadKms (km/s)"
      });
    }

    // Convertir velocidad a m/s
    const velocidadMs = velocidadKms * 1000;

    // Energía en Joules
    const energiaJoules = 0.5 * masaKg * Math.pow(velocidadMs, 2);

    // Energía en megatones de TNT
    const energiaMegatones = energiaJoules / 4.184e15;

    return res.json({
      masaKg,
      velocidadKms,
      energiaJoules,
      energiaMegatones
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
  
  
  }
};

// Constante de gravitación universal
const G = 6.67430e-11; // N·m²/kg²

export async function Energia2(req, res) {
  try {
    const { masaKg, velocidadKms } = req.body;

    if (!masaKg || !velocidadKms) {
      return res.status(400).json({
        error: "Debes enviar masaKg (kg) y velocidadKms (km/s)"
      });
    }

    const velocidadMs = velocidadKms * 1000;
    const energiaJoules = 0.5 * masaKg * Math.pow(velocidadMs, 2);
    const energiaMegatones = energiaJoules / 4.184e15;

    return res.json({
      masaKg,
      velocidadKms,
      energiaJoules,
      energiaMegatones
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
}

// Nueva fórmula: Fuerza gravitatoria
export const FuerzaGravitatoria = async (req, res) => {
  try {
    const { masa1Kg, masa2Kg, distanciaM } = req.body;

    if (!masa1Kg || !masa2Kg || !distanciaM) {
      return res.status(400).json({
        error: "Debes enviar masa1Kg, masa2Kg y distanciaM (en metros)"
      });
    }

    const fuerza = G * (masa1Kg * masa2Kg) / Math.pow(distanciaM, 2);

    return res.json({
      masa1Kg,
      masa2Kg,
      distanciaM,
      fuerzaNewton: fuerza
    });

  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
};
