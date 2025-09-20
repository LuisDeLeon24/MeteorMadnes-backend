// pNeos.controller.js
import fs from "fs";
import mongoose from "mongoose";
import { NeoObservation } from "./pNeos.model.js"; // tu modelo

export const insertNEOs = async (req, res) => {
  const { filePath } = req.body;

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const neos = JSON.parse(rawData);

    const neoDocs = neos.map(neo => ({
      _id: neo["Neo_ID"],
      tempDesig: neo["Temp_Desig"],
      score: neo["Score"],
      discoveryDate: {
        year: neo["Discovery_year"],
        month: neo["Discovery_month"],
        day: neo["Discovery_day"]
      },
      position: {
        ra: neo["R.A."],
        dec: neo["Decl."]
      },
      vMagnitude: neo["V"],
      updated: neo["Updated"]?.toString() || "",
      nObs: neo["NObs"],
      arc: neo["Arc"],
      hMagnitude: neo["H"],
      notSeenDays: neo["Not_Seen_dys"],
      status: neo["Status"],
      source: neo["Source"],
      priority: neo["Priority"]
    }));

    await NeoObservation.insertMany(neoDocs); // más eficiente que save() uno por uno

    res.status(200).json({ message: "Todos los NEOs han sido insertados correctamente." });
  } catch (err) {
    console.error("Error insertando NEOs:", err);
    res.status(500).json({ error: "Error insertando NEOs" });
  }
};

export const searchPNeo = async (req, res) => {
  const { tempDesig } = req.params;

  try {
    const neos = await NeoObservation.findOne({ tempDesig: tempDesig.trim() });
    res.status(200).json(neos);
  } catch (err) {
    console.error("Error buscando NEOs:", err);
    res.status(500).json({ error: "Error buscando NEOs" });
  }
};

export const getRandomPNeos = async (req, res) => {
  try {
    const neos = await NeoObservation.aggregate([{ $sample: { size: 5 } }]);
    res.status(200).json(neos);
  } catch (err) {
    console.error("Error obteniendo NEOs aleatorios:", err);
    res.status(500).json({ error: "Error obteniendo NEOs aleatorios" });
  }
};
