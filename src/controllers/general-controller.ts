import pg from 'pg';
import { Pool, QueryResult } from 'pg';
import { ColumnInfoAlias, DataType, Filter, GroupFilter, SortType } from '../definitions';
import { DateTime } from 'luxon';

pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, value => value.replace(' ', 'T'));

const pool = new Pool({ connectionString: process.env.POSTGRES_URL!, });

export async function fetchTable( fromList: string[] ): Promise<any[]> {

  if ( fromList.length <= 0 ) {
    throw Error;
  }

  const rowData: QueryResult = await pool.query(`
    SELECT *
    FROM ${ fromList.join(', ') }
  `);

  return rowData.rows;
}

export async function fetchTableCount( fromList: string[], condition: string = '', values: any[] = [] ): Promise<number> {

  if ( fromList.length <= 0 ) {
    throw Error;
  }

  const totalCount: QueryResult<{ count: number }> = await pool.query(`
    SELECT COUNT(*) as count
    FROM ${ fromList.join(', ') }
    ${ (condition !== '' ? 'WHERE ' + condition : '') };
  `, values );

  return totalCount.rows[0].count;
}

export async function fetchTableFilter( fromList: string[], tableDetails: ColumnInfoAlias[], columnList: string[], groupFilter: GroupFilter, sort: SortType, limit: number, offset: number, groupby: string[] ): Promise<{ data: any[], count: number }>  {

  if ( fromList.length <= 0 ) {
    throw Error;
  }

  let valueList: any[] = [];
  let currentIndex: number = 0;

  let theFilterString: string = '';
  let theValues: any[] = [];
  let theNewIndex: number = 0;

  if ( isGroupFilter( groupFilter ) ) {

    const { filterString, values, newIndex } = handleGroupFilter( tableDetails, groupFilter, theNewIndex );

    theFilterString = filterString;
    theValues = values;
    theNewIndex = newIndex;

  }

  valueList = [ ...theValues ];
  currentIndex = theNewIndex;

  const sortColumn = tableDetails.find(( element ) => element.column_name === sort.column_name );

  const query: string = `
    SELECT ${ columnList.join(', ') } 
    FROM ${ fromList.join(', ') } 
    ${ (theFilterString.length > 0 ? 'WHERE ' + theFilterString : '') } 
    ORDER BY ${ sortColumn ? sortColumn.alias : tableDetails[0].alias } ${ ['ASC', 'DESC'].find(( order ) => order === sort.order ) ? sort.order : 'ASC' }
    ${ (groupby.length > 0 ? '' : `LIMIT $${++currentIndex} OFFSET $${++currentIndex}`) };
  `;

  const tableRows: number = await fetchTableCount( fromList, (theFilterString.length > 0 ? theFilterString : ''), valueList );

  if ( groupby.length <= 0 ) {
    valueList = [ ...valueList.slice(), limit, offset ];
  }
  
  const tableData: QueryResult = await pool.query( query, valueList );

  if ( groupby.length <= 0 ) {

    return { data: tableData.rows, count: tableRows };

  } else {

    return { data: [ handleGroupings( tableData.rows, tableDetails, groupby, 0 ) ], count: tableRows };

  }

}

function handleGroupFilter( tableDetails: ColumnInfoAlias[], groupFilter: GroupFilter, currentIndex: number ): { filterString: string, values: any[], newIndex: number } {

  let filterList: string[] = [];
  let valueList: any[] = [];
  let thisIndex: number = currentIndex;

  for ( const filter of groupFilter.filters ) {

    if ( isFilter( filter ) ) {
    
      const { filterString, filterValue, newIndex } = handleFilter( tableDetails, filter, thisIndex );
      
      if ( filterString !== '' ) {
        filterList = [ ...filterList, filterString ];
        valueList = [ ...valueList, ...filterValue ];
        thisIndex = newIndex;
      }

    } else if ( isGroupFilter( filter ) ) {

      const { filterString, values, newIndex } = handleGroupFilter( tableDetails, filter, thisIndex );

      if ( filterString !== '' ) {
        filterList = [ ...filterList, filterString ];
        valueList = [ ...valueList, ...values ];
        thisIndex = newIndex;
      }

    }

  }

  let filterString = '';
  if ( filterList.length > 0 ) {

    filterString = '(' + filterList.join(` ${ groupFilter.operator } `) + ')';

  }
  
  return { filterString: filterString, values: valueList, newIndex: thisIndex };
}

function handleFilter( tableDetails: ColumnInfoAlias[], filter: Filter, currentIndex: number ): { filterString: string, filterValue: any, newIndex: number } {

  let filterString: string = '';
  let filterValue: any = '';
  let thisIndex: number = currentIndex;

  const column = tableDetails.find(( element ) => element.column_name === filter.column.column_name );

  if ( !column ) return { filterString, filterValue, newIndex: thisIndex };

  let dataType: DataType = column.data_type;

  if ( dataType === 'number' || dataType === 'money' ) {

    const numberMatch = new RegExp( '^([0-9]+\\.?[0-9]*|[0-9]*\\.?[0-9]+)$' );
    
    for (const value of filter.values ) {

      if ( !numberMatch.test( value ) ) return { filterString, filterValue, newIndex: thisIndex };

    }

  } else if ( dataType === 'date' ) {
    
    for (const value of filter.values ) {
      
      if ( !DateTime.fromISO( value ).isValid ) return { filterString, filterValue, newIndex: thisIndex };

    }

  }

  switch ( filter.condition ) {

    case '==':
      filterString = `(${ column.alias }::text = $${++thisIndex})`;
      filterValue = [ filter.values[0].toString() ];
      break;

    case '!=':
      filterString = `(${ column.alias }::text != $${++thisIndex})`;
      filterValue = [ filter.values[0].toString() ];
      break;

    case 'in':
      filterString = `(${ column.alias }::text ILIKE $${++thisIndex})`;
      filterValue = [ filter.values[0].toString() ];
      break;

    case '!in':
      filterString = `(${ column.alias }::text NOT ILIKE $${++thisIndex})`;
      filterValue = [ filter.values[0].toString() ];
      break;

    case '<':
      if ( dataType === 'number' || dataType === 'money' ) {
        filterString = `(${ column.alias } < $${++thisIndex})`;
        filterValue = Number( filter.values[0] );
      } else if ( dataType === 'date' ) {
        filterString = `(${ column.alias } < $${++thisIndex}::timestamptz)`;
        filterValue = [ filter.values[0] ];
      }
      break;

    case '<=':
      if ( dataType === 'number' || dataType === 'money' ) {
        filterString = `(${ column.alias } <= $${++thisIndex})`;
        filterValue = Number( filter.values[0] );
      } else if ( dataType === 'date' ) {
        filterString = `(${ column.alias } <= $${++thisIndex}::timestamptz)`;
        filterValue = [ filter.values[0] ];
      }
      break;

    case '>':
      if ( dataType === 'number' || dataType === 'money' ) {
        filterString = `(${ column.alias } > $${++thisIndex})`;
        filterValue = Number( filter.values[0] );
      } else if ( dataType === 'date' ) {
        filterString = `(${ column.alias } > $${++thisIndex}::timestamptz)`;
        filterValue = [ filter.values[0] ];
      }
      break;

    case '>=':
      if ( dataType === 'number' || dataType === 'money' ) {
        filterString = `(${ column.alias } >= $${++thisIndex})`;
        filterValue = Number( filter.values[0] );
      } else if ( dataType === 'date' ) {
        filterString = `(${ column.alias } >= $${++thisIndex}::timestamptz)`;
        filterValue = [ filter.values[0] ];
      }
      break;

    case '><':
      if ( dataType === 'number' || dataType === 'money' ) {
        filterString = `(${ column.alias } BETWEEN $${++thisIndex} AND $${++thisIndex})`;
        filterValue = [ Number( filter.values[0] ), Number( filter.values[1] ) ];
      } else if ( dataType === 'date' ) {
        filterString = `(${ column.alias } BETWEEN $${++thisIndex}::timestamptz AND $${++thisIndex}::timestamptz)`;
        filterValue = [ filter.values[0], filter.values[1] ];
      }
      break;

    case '!><':
      if ( dataType === 'number' || dataType === 'money' ) {
        filterString = `(${ column.alias } NOT BETWEEN $${++thisIndex} AND $${++thisIndex})`;
        filterValue = [ Number( filter.values[0] ), Number( filter.values[1] ) ];
      } else if ( dataType === 'date' ) {
        filterString = `(${ column.alias } NOT BETWEEN $${++thisIndex}::timestamptz AND $${++thisIndex}::timestamptz)`;
        filterValue = [ filter.values[0], filter.values[1] ];
      }
      break;

    default:
      return { filterString, filterValue, newIndex: thisIndex };

  }

  return { filterString, filterValue, newIndex: thisIndex };
}

export function isFilter( obj: (Filter | GroupFilter) ): obj is Filter {
  
  return ( 
    obj && 
    (Object.hasOwn( obj, 'column' ) && Object.hasOwn( obj, 'condition' ) && Object.hasOwn( obj, 'values' ))
  );
}

export function isGroupFilter( obj: GroupFilter ): obj is GroupFilter {

  return (
    obj && 
    (Object.hasOwn( obj, 'filters' ) && Object.hasOwn( obj, 'operator' ))
  );
}

function handleGroupings( tableData: any[], tableDetails: ColumnInfoAlias[], groupList: string[], depth: number ): Record<string, any> {

  let newTableData: Record<string, any> = {};
  const maxDepth: number = groupList.length - 1;

  const column = tableDetails.find(( element ) => element.column_name === groupList[depth] );

  if ( column ) {

    const unique: string[] = [ ...new Set(tableData.map(( row ) => row[column.column_name])) ];

    for ( const value of unique ) {

      newTableData[value] = [];

    }

    for ( const row of tableData ) {

      newTableData[row[column.column_name]] = [ ...newTableData[row[column.column_name]], row ];

    }

    if ( depth < maxDepth ) {

      for ( const group in newTableData ) {

        newTableData[group] = handleGroupings( newTableData[group], tableDetails, groupList, depth + 1 );

      }

    }

  } else {

    newTableData['Invalid Group'] = [ ...tableData ];

  }

  return newTableData;

}

export async function createTableRow( tableName: string, columnList: string[], indexList: string[], values: any[] ): Promise<void> {

  await pool.query(`
    INSERT INTO ${ tableName }(${ columnList.join(', ') })
    VALUES(${ indexList.join(', ') });
  `, values );

  return;
}

export async function fetchTableRow( fromList: string[], columnList: string[], condition: string, values: any[] ): Promise<any[]> {

  if ( fromList.length <= 0 ) {
    throw Error;
  }

  const rowData: QueryResult = await pool.query(`
    SELECT ${ columnList.join(', ') } 
    FROM ${ fromList.join(', ') }
    WHERE ${ condition };
  `, values );

  return rowData.rows;
}

export async function updateTableRow( tableName: string, setString: string, condition: string, values: any[] ): Promise<void> {

  await pool.query(`
    UPDATE ${ tableName } 
    SET ${ setString }
    WHERE ${ condition };
  `, values );

  return;
}

export async function deleteTableRow( tableName: string, uniqueCondition: string, uniqueValues: any[] ): Promise<void> {

  await pool.query(`
    DELETE FROM ${ tableName }
    WHERE ${ uniqueCondition };
  `, uniqueValues );

  return;
}

