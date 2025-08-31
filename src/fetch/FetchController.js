import fetch from "node-fetch"; // si Node <18, si Node 18+ fetch es global

export const getHorizons = async (req, res) => {
  try {
    const targetUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='499'&MAKE_EPHEM=YES&EPHEM_TYPE=OBSERVER&CENTER='500@0'&START_TIME='2025-01-01'&STOP_TIME='2025-12-31'&STEP_SIZE='1 d'&QUANTITIES='1,20,23,24'`;

    const response = await fetch(targetUrl);
    const text = await response.text();

    res.setHeader("Content-Type", "text/plain");
    res.send(text);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

export const getESA = async (req, res) => {
  try {
    const targetUrl = `https://neo.ssa.esa.int/PSDB-portlet/download?file=esa_risk_list`;

    const response = await fetch(targetUrl);
    const text = await response.text();

    res.setHeader("Content-Type", "text/plain");
    res.send(text);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};