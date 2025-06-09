export type VendorForm = {
  name: string;
  email: string;
  type: string;
  total_purchase: number;
  created_by: string;
}

export type GroupFilter = {
  filters: (Filter | GroupFilter)[];
  operator: OperatorType;
}

export type Filter = {
  column: ColumnInfo;
  condition: ConditionType;
  values: string[];
};

export type ColumnInfo = {
  column_name: string;
  data_type: DataType;
}

export type ColumnInfoAlias = {
  column_name: string;
  data_type: DataType;
  alias: string;
}

export type SortType = { 
  column_name: string, 
  order: 'ASC' | 'DESC' 
}

export type ConditionType = '==' | '!=' | 'in' | '!in' | '<' | '<=' | '>' | '>=' | '><' | '!><';
export type OperatorType = 'AND' | 'OR';
export type DataType = 'text' | 'number' | 'money' | 'date';
