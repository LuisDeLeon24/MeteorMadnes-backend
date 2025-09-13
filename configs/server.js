import express from "express";
import cors from 'cors';
import helmet from "helmet";
import morgan from "morgan";



import FormulasRoutes from "../src/Formulas/FormulasRoutes.js";
import FetchRoutes from "../src/fetch/FetchRoutes.js";  
import limiter from "../src/middlewares/validate-cant-request.js";


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
}


export const initServer = async () => {
    const app = express();
    const port = process.env.PORT || 3000;
    try {
        middlewares(app);
        routes(app);
        app.listen(port);

    
        console.log(`server running on port ${port}`)
    } catch (error) {
        console.log(`server init failed: ${error}`);
    }
}