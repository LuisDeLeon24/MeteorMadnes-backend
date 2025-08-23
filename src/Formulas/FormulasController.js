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