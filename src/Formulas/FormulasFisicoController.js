// energia cinetica 1
export const EnergiaCinetica = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { masaKg, velocidadMs, densidad, diametro } = req.body;
        let energiaJoules = null;

        if (masaKg && velocidadMs) {
            // Fórmula con masa y velocidad
            energiaJoules = 0.5 * masaKg * Math.pow(velocidadMs, 2);
        } else if (densidad && diametro && velocidadMs) {
            // Fórmula con densidad, diámetro y velocidad
            energiaJoules = (Math.PI / 12) * densidad * Math.pow(diametro, 3) * Math.pow(velocidadMs, 2);
        } else {
            return res.status(400).json({
                error: "Debes enviar (masaKg y velocidadMs) o (densidad, diametro y velocidadMs)"
            });
        }

        return res.json({
            energiaJoules
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// desaceleracion atmosferica 2
export const DesaceleracionAtmosferica = async(req, res) => {
    try {
        const { coeficienteArrastre, densidadAire, velocidad, area, masa } = req.body;

        // Validar que todos los parámetros estén presentes
        if (!coeficienteArrastre || !densidadAire || !velocidad || !areaTransversal || !masa) {
            return res.status(400).json({
                error: "Debes enviar coefArrastre, densidadAire, velocidad, area y masa"
            });
        }

        //dv/dt=-C_d*p_a*v^2*A/(2*m)
        const desaceleracion = -(coeficienteArrastre * densidadAire * Math.pow(velocidad, 2) * areaTransversal) / (2 * masa);

        return res.json({
            desaceleracion
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }

};

// luminosidad 3
export const Luminosidad = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { eficienciaLuminica, PerdidaMasa, velocidad } = req.body;

        if (!eficienciaLuminica || !PerdidaMasa || !velocidad) {
            return res.status(400).json({
                error: "Debes enviar factor de eficiencia LUminica, perdida de masa y velocidad"
            });
        }

        // I = 0.5 * k * dm/dt * v^2
        const luminosidad = 0.5 * eficienciaLuminica * PerdidaMasa * Math.pow(velocidad, 2);

        return res.json({
            luminosidad
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};


// tamaño crater 4
// Coeficientes empíricos (valores típicos, pueden variar según materiales)
export const TamanoCrater = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { materialSuelo, materialMeteoro, energia } = req.body;

        if (!materialSuelo || !materialMeteoro || !energia) {
            return res.status(400).json({
                error: "Debes enviar material de suelo, material del meteoro y energia"
            });
        }

        // D = a * E^b
        const diametro = a * Math.pow(energia, b);

        return res.json({
            diametro
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// perdida masa por ablacion 5
export const PerdidaMasaAblacion = async(req, res) => {
    try {
        // Obtener datos 
        const ablacionConst = 1.0; // Constante de ablación (valor típico, puede variar)
        const { areaTransversal, densidadAire, velocidad, densidadMeteoro } = req.body;

        if (!areaTransversal || !densidadAire || !velocidad || !densidadMeteoro) {
            return res.status(400).json({
                error: "Debes enviar area transversal, densidad del Aire, velocidad y densidad del meteoro"
            });
        }

        //dm/dt = c * A * p_a * v^3 / p
        const perdida = (ablacionConst * areaTransversal * densidadAire * Math.pow(velocidad, 3)) / (densidadMeteoro);

        return res.json({
            perdida
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// altura fragmentacion 6
export const AlturaFragmentacion = async(req, res) => {
    try {
        // Obtener datos desde el body
        const { alturaInicial, velocidadInicial, gravedad } = req.body;

        if (!alturaInicial || !velocidadInicial || !gravedad) {
            return res.status(400).json({
                error: "Debes enviar altura inicial y velocidad inicial"
            });
        }

        // h = h_0 - v_0^2 / (2 * g)
        const alturaFragmentacion = alturaInicial - (Math.pow(velocidadInicial, 2) / (2 * gravedad));

        return res.json({
            alturaFragmentacion: alturaFragmentacion
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// fuerza arrastre oscuro 7
export const FuerzaArrastreOscuro = async(req, res) => {
    try {
        const { coeficienteArrastre, densidadAire, velocidad, areaTransversal } = req.body;

        if (!coeficienteArrastre || !densidadAire || !velocidad || !areaTransversal) {
            return res.status(400).json({
                error: "Debes enviar coeficiente de arrastre, densidad del aire, velocidad y area transversal"
            });
        }

        const fuerzaArrastre = 0.5 * coeficienteArrastre * densidadAire * Math.pow(velocidad, 2) * areaTransversal;
        return res.json({
            fuerzaArrastre
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

//Presion dinamica (fragmentacion) 8
export const PresionDinamica = async(req, res) => {
    try {
        const { densidadAire, velocidad } = req.body;

        if (!densidadAire || !velocidad) {
            return res.status(400).json({
                error: "Debes enviar densidad del aire y velocidad"
            });
        }
        const presionDinamica = 0.5 * densidadAire * Math.pow(velocidad, 2);
        return res.json({
            presionDinamica
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// energia sismica por impacto del meteorito 9
export const EnergiaSismicaImpacto = async(req, res) => {
    try {
        const { energiaSismicaOnda, EnergiaCinetica } = req.body;
        if (!energiaSismicaOnda || !EnergiaCinetica) {
            return res.status(400).json({
                error: "Debes enviar  energia de la onda sismica y energia cinetica"
            });
        }
        const energiaSismica = energiaSismicaOnda * EnergiaCinetica;
        return res.json({
            energiaSismica
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};

// mitigacion impacto al meteoro 10
export const MitigacionImpacto = async(req, res) => {
    try {
        const { masaImpactor, velocidadImpactor, masaMeteoro } = req.body;
        if (!masaImpactor || !velocidadImpactor || !masaMeteoro) {
            return res.status(400).json({
                error: "Debes enviar masa del impactor, velocidad del impactor y masa del meteoro"
            });
        }
        const cambioVelocidad = (masaImpactor * velocidadImpactor) / (masaImpactor + masaMeteoro);
        return res.json({
            cambioVelocidad
        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor", details: err.message });
    }
};