import seedDatabase from "../controllers/seed/seed-controller";
import { Router } from "express";

const seedRouter = Router();

seedRouter.get( '/', seedDatabase );

export default seedRouter;