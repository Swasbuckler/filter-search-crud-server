import { Pool, QueryResult } from 'pg';
import { vendorTypes, vendors } from './seeding-data';

import { Response, Request } from 'express';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL!, });

async function seedVendorTypes(): Promise<void> {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_types (
      type_id INT GENERATED ALWAYS AS IDENTITY,
      name VARCHAR(255) NOT NULL,
      PRIMARY KEY(type_id)
    );
  `);

  const checkSeeded: QueryResult = await pool.query(`
    SELECT *
    FROM vendor_types
    LIMIT 1;
  `);

  if ( checkSeeded.rowCount === 0 ) {
    for ( const type of vendorTypes ) {

      const query: string = `
        INSERT INTO vendor_types(name)
        VALUES($1);
      `;
      const values: any[] = [ type.name ];

      await pool.query( query, values );
    }
  }

}

async function seedVendors(): Promise<void> {

  await seedVendorTypes();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id INT GENERATED ALWAYS AS IDENTITY,
      type_id INT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(100) NOT NULL,
      total_purchase NUMERIC(12, 2) DEFAULT 0 NOT NULL,
      created_by TIMESTAMPTZ NOT NULL,
      PRIMARY KEY(vendor_id),
      CONSTRAINT fk_type
        FOREIGN KEY(type_id)
        REFERENCES vendor_types(type_id)
        ON DELETE SET NULL 
    );
  `);

  const checkSeeded: QueryResult = await pool.query(`
    SELECT *
    FROM vendors
    LIMIT 1;
  `);

  if ( checkSeeded.rowCount === 0 ) {
    for ( const vendor of vendors ) {

      const query: string = `
        INSERT INTO vendors(type_id, name, email, total_purchase, created_by)
        VALUES($1, $2, $3, $4, $5::timestamptz);
      `;
      const values: any[] = [ vendor.type_id, vendor.name, vendor.email, vendor.total_purchase, vendor.created_by ];

      await pool.query( query, values );
    }
  }
}

export default async function seedDatabase( req: Request, res: Response ) {

  try {

    await seedVendors();

    res.json({ message: 'The database has been seeded successfully' });

  } catch ( error ) {

    res.json({ 
      message: 'Seeding has failed', 
      error: error,
      status: 500,
    });
    console.log( error );

  }
    
}
