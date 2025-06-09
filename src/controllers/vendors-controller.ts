import { createTableRow, deleteTableRow, fetchTable, fetchTableFilter, fetchTableRow, updateTableRow } from './general-controller';
import { ColumnInfo, ColumnInfoAlias, GroupFilter, SortType, VendorForm } from '../definitions';

import { Response, Request } from 'express';
import { DateTime } from 'luxon';

export async function fetchVendorsTableDetails( req: Request, res: Response ) {

  const vendorsTableDetails: ColumnInfo[] = [
    { column_name: 'vendor_id', data_type: 'number' },
    { column_name: 'name', data_type: 'text' },
    { column_name: 'email', data_type: 'text' },
    { column_name: 'type', data_type: 'text' },
    { column_name: 'total_purchase', data_type: 'money' },
    { column_name: 'created_by', data_type: 'date' }
  ]

  res.json({ success: true, data: vendorsTableDetails });

}

export async function fetchVendors( req: Request, res: Response ) {

  let { groupFilter, sort, limit, offset, groupby }: { groupFilter: GroupFilter, sort: SortType, limit: number, offset: number, groupby: string[] } = { 
    groupFilter: { filters: [], operator: 'AND' }, 
    sort: { column_name: 'id', order: 'ASC' }, 
    limit: 0, 
    offset: 0,
    groupby: []
  };

  try {

    groupFilter = req.body.groupFilter;
    sort = { column_name: req.body.sort.column_name, order: req.body.sort.order };
    limit = Math.trunc( Number( req.body.limit ) );
    offset = Math.trunc( Number( req.body.offset ) );
    groupby = req.body.groupby;

    const vendorsTableDetails: ColumnInfoAlias[] = [
      { column_name: 'vendor_id', data_type: 'number', alias: 'vendor_id' },
      { column_name: 'name', data_type: 'text', alias: 'vendors.name' },
      { column_name: 'email', data_type: 'text', alias: 'email' },
      { column_name: 'type', data_type: 'text', alias: 'vendor_types.name' },
      { column_name: 'total_purchase', data_type: 'money', alias: 'total_purchase' },
      { column_name: 'created_by', data_type: 'date', alias: 'created_by' }
    ];

    const { data, count } = await fetchTableFilter( 
      [ 'vendors INNER JOIN vendor_types ON vendors.type_id = vendor_types.type_id' ], 
      vendorsTableDetails,
      [ 'vendor_id', 'vendors.name AS name', 'email', 'vendor_types.name AS type', 'total_purchase', 'created_by::timestamptz' ],
      groupFilter,
      sort,
      limit,
      offset,
      groupby,
    );

    res.json({ success: true, data: data, count: count });

  } catch ( error ) {

    res.json({ success: false });
    console.error( 'Could not fetch from database due to error: ', error );

  }

}

export async function createVendor( req: Request, res: Response ) {

  let { newVendor }: { newVendor: VendorForm } = { newVendor: { 
    name: '', 
    email: '', 
    created_by: '', 
    type: '', 
    total_purchase: 0 
  } };

  try {

    newVendor = req.body.newVendor;

    const nameMatch = new RegExp( '^([\\w]+[ ]?)*$' );
    const emailMatch = new RegExp( '^[\\w-\\.]+@([\\w-]+[\\.])+[\\w-]{2,4}$' );
    const totalPurchaseMatch = new RegExp( '^([0-9]{1,10}\\.?[0-9]{0,2}|[0-9]{0,10}\\.?[0-9]{1,2})$' );

    const vendorTypes = await fetchTable(
      [ 'vendor_types' ]
    );

    for ( const data in newVendor ) {
      
      switch ( data ) {

        case 'name':
          if ( !nameMatch.test( newVendor[data] ) || newVendor[data].length > 255 ) {
            res.json({ success: false });
            return;
          }
          break;

        case 'email':
          if ( !emailMatch.test( newVendor[data] ) || newVendor[data].length > 255 ) {
            res.json({ success: false });
            return;
          }
          break;

        case 'created_by':
          if ( !DateTime.fromISO( newVendor[data] ) ) {
            res.json({ success: false });
            return;
          }
          break;

        case 'type':
          const typeId = vendorTypes.find( (element) => element.name === newVendor[data] );
          if ( !typeId ) {
            res.json({ success: false });
            return;
          } else {
            newVendor[data] = typeId.type_id;
          }
          break;

        case 'total_purchase':
          if ( !totalPurchaseMatch.test( newVendor[data].toString() ) ) {
            res.json({ success: false });
            return;
          }
          break;

        default:
          res.json({ success: false });
          return;

      }

    }

    await createTableRow( 
      'vendors', 
      [ 'name', 'email', 'total_purchase', 'type_id', 'created_by' ], 
      [ '$1', '$2', '$3', '$4', '$5::timestamptz' ], 
      [ newVendor.name.trim(), newVendor.email, Number( newVendor.total_purchase ), Number( newVendor.type ), newVendor.created_by ]
    );

    

    res.json({ success: true });

  } catch( error ) {

    res.json({ success: false });
    console.error( 'Could not create to database due to error: ', error );

  }

}

export async function fetchVendor( req: Request, res: Response ) {

  let { vendorId }: { vendorId: number } = { vendorId: 0 } ;

  try {

    vendorId = Number( req.body.vendorId );

    const vendorData: any[] = await fetchTableRow( 
      [ 'vendors INNER JOIN vendor_types ON vendors.type_id = vendor_types.type_id' ], 
      [ 'vendors.name AS name', 'email', 'vendor_types.name AS type', 'total_purchase', 'created_by::timestamptz' ], 
      'vendor_id = $1', 
      [ vendorId ],
    );

    if ( vendorData.length > 0 ) {

      res.json({ success: true, data: vendorData[0] });

    } else {

      res.json({ success: false });

    }

  } catch ( error ) {

    res.json({ success: false });
    console.error( 'Could not fetch from database due to error: ', error );

  }

}

export async function updateVendor( req: Request, res: Response ) {

  let { vendorId, updateVendor }: { vendorId: number, updateVendor: VendorForm } = { vendorId: 0, updateVendor: { name: '', email: '', created_by: '01/01/2025', type: 'Goods', total_purchase: 0 } };
  let originalVendor: any[] = [];

  try {

    vendorId = Number( req.body.vendorId );
    updateVendor = req.body.updateVendor;

    originalVendor = await fetchTableRow( 
      [ 'vendors INNER JOIN vendor_types ON vendors.type_id = vendor_types.type_id' ], 
      [ 'vendors.name AS name', 'email', 'vendor_types.name AS type', 'total_purchase', 'created_by::timestamptz' ], 
      'vendor_id = $1', 
      [ vendorId ],
    );

    if ( originalVendor.length == 0 ) {

      res.json({ success: false });
      return;

    }

    let addList: string[] = [];
    let valueList: any[] = [];
    let currentIndex: number = 0;

    const nameMatch = new RegExp( '^([\\w]+[ ]?)*$' );
    const emailMatch = new RegExp( '^[\\w-\\.]+@([\\w-]+[\\.])+[\\w-]{2,4}$' );
    const totalPurchaseMatch = new RegExp( '^([0-9]{1,10}\\.?[0-9]{0,2}|[0-9]{0,10}\\.?[0-9]{1,2})$' );

    const vendorTypes = await fetchTable(
      [ 'vendor_types' ]
    );

    for ( const data in updateVendor ) {
      
      switch ( data ) {

        case 'name':
          if ( !nameMatch.test( updateVendor[data] ) ) {
            res.json({ success: false });
            return;
          } else {

            addList = [ ...addList.slice(), `${data} = $${++currentIndex}`];
            valueList = [ ...valueList.slice(), updateVendor[data].trim() ];

          }
          break;

        case 'email':
          if ( !emailMatch.test( updateVendor[data] ) ) {
            res.json({ success: false });
            return;
          } else {

            addList = [ ...addList.slice(), `${data} = $${++currentIndex}`];
            valueList = [ ...valueList.slice(), updateVendor[data] ];

          }
          break;

        case 'total_purchase':
          if ( !totalPurchaseMatch.test( updateVendor[data].toString() ) ) {
            res.json({ success: false });
            return;
          } else {

            addList = [ ...addList.slice(), `${data} = $${++currentIndex}`];
            valueList = [ ...valueList.slice(), Number( updateVendor[data] ) ];

          }
          break;

        case 'type':
          const typeId = vendorTypes.find( (element) => element.name === updateVendor[data] );
          if ( !typeId ) {
            res.json({ success: false });
            return;
          } else {

            updateVendor[data] = typeId.type_id;

            addList = [ ...addList.slice(), `type_id = $${++currentIndex}`];
            valueList = [ ...valueList.slice(), Number( updateVendor[data] ) ];

          }
          break;

        case 'created_by':
          if ( !DateTime.fromISO( updateVendor[data] ) ) {
            res.json({ success: false });
            return;
          } else {

            addList = [ ...addList.slice(), `${data} = $${++currentIndex}::timestamptz`];
            valueList = [ ...valueList.slice(), updateVendor[data] ];

          }
          break;

        default:
          res.json({ success: false });
          return;

      }

    }

    if ( addList.length > 0 ) {
    
      const updateString: string = addList.join(', ');
      valueList = [ ...valueList.slice(), vendorId ];
    
      await updateTableRow( 
        'vendors', 
        updateString, 
        `vendor_id = $${++currentIndex}`, 
        valueList 
      );
    
    }

    res.json({ success: true });

  } catch( error ) {

    res.json({ success: false });
    console.error( 'Could not update to database due to error: ', error );

  }

}

export async function deleteVendor( req: Request, res: Response ) {

  let { vendorId }: { vendorId: number | null } = { vendorId: null };

  try {

    vendorId = Number( req.body.vendorId );

    await deleteTableRow( 
      'vendors', 
      'vendor_id = $1', 
      [ vendorId ] 
    );

    res.json({ success: true });

  } catch ( error ) {

    res.json({ success: false });
    console.error( 'Could not delete from database due to error: ', error );

    return;

  }

}
