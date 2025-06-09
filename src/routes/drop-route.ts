import dropDatabase from "../controllers/drop-controller";
import { Router } from "express";

const dropRouter = Router();

dropRouter.get( '/', dropDatabase );

export default dropRouter;