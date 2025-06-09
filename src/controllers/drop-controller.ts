import { Pool } from 'pg';

import { Response, Request } from 'express';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL!, });

async function dropVendorTypes(): Promise<void> {

  await pool.query(`
    DROP TABLE IF EXISTS vendor_types;
  `);

}

async function dropVendors(): Promise<void> {

  await pool.query(`
    DROP TABLE IF EXISTS vendors;
  `);

  await dropVendorTypes();

}

export default async function dropDatabase( req: Request, res: Response ) {

  try {

    await dropVendors();

    res.json({ message: 'The database has been dropped successfully' });

  } catch ( error ) {

    res.json({ 
      message: 'Dropping has failed', 
      error: error,
      status: 500,
    });
    console.log( error );

  }

}
