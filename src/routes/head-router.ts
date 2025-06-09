import seedRouter from "./seed-route";
import vendorsRouter from "./vendors-route";
import { Express } from "express";
import dropRouter from "./drop-route";

function setRoutes( app: Express ) {

  app.use( '/api/seed', seedRouter );
  app.use( '/api/drop', dropRouter );
  app.use( '/api/vendors', vendorsRouter );
  app.use( '/', ( req, res ) => {
    res.json({ message: 'Express URL!' });
  })

}

export default setRoutes;