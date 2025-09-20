import express from "express";
import cors from 'cors';
import helmet from "helmet";
import morgan from "morgan";
import { dbConnection } from "./mongo.js";



import FormulasRoutes from "../src/Formulas/FormulasRoutes.js";
import FetchRoutes from "../src/fetch/FetchRoutes.js";  
import PneosRoutes from "../src/PNeos/pNeos.routes.js";
import limiter from "../src/middlewares/validate-cant-request.js";

const conectarDB = async () => {
    try {
        await dbConnection();
        console.log('Successful connection to the database');
    } catch (error) {
        console.log('Failed to connect to database');
    }
}

const middlewares = (app) => {
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(cors());
    app.use(helmet());
    app.use(morgan('dev'));
    app.use(limiter)
}

const routes = (app) => {
    app.use('/MeteorMadnes/formulas', FormulasRoutes);
    app.use('/MeteorMadnes/fetch', FetchRoutes);
    app.use('/MeteorMadnes/PNeos', PneosRoutes);
}


export const initServer = async () => {
    const app = express();
    const port = process.env.PORT || 3000;
    try {
        middlewares(app);
        routes(app);
        conectarDB();
        app.listen(port);
    
        console.log(`server running on port ${port}`)
    } catch (error) {
        console.log(`server init failed: ${error}`);
    }
}