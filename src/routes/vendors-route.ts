import { fetchVendors, fetchVendorsTableDetails, createVendor, fetchVendor, updateVendor, deleteVendor } from "../controllers/vendors-controller";
import { Router } from "express";

const vendorsRouter = Router();

vendorsRouter.post( '/', fetchVendors );
vendorsRouter.get( '/table-details', fetchVendorsTableDetails );
vendorsRouter.post( '/create', createVendor );
vendorsRouter.post( '/fetch', fetchVendor );
vendorsRouter.post( '/update', updateVendor );
vendorsRouter.post( '/delete', deleteVendor );

export default vendorsRouter;