import * as CFRichTextTypes from '@contentful/rich-text-types';
import * as Contentful from 'contentful';

export interface TypeCompanyFields {
  name: Contentful.EntryFields.Symbol;
  abbreviation: Contentful.EntryFields.Symbol;
  isDefault: Contentful.EntryFields.Boolean;
  website: Contentful.EntryFields.Symbol;
  email: Contentful.EntryFields.Symbol;
  logo: Contentful.Asset;
  incomeTax: Contentful.EntryFields.Integer;
  state?: 'Berlin' | 'Brandenburg' | 'Hamburg' | 'Schleswig-Holstein';
  monthlyWageGoal?: Contentful.EntryFields.Number;
  workingDays?: (
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday'
  )[];
  averageWage?: Contentful.EntryFields.Number;
}

export type TypeCompany = Contentful.Entry<TypeCompanyFields>;

export interface TypeCustomerFields {
  name: Contentful.EntryFields.Symbol;
  additionalName?: Contentful.EntryFields.Symbol;
  taxId?: Contentful.EntryFields.Symbol;
  emails?: Contentful.EntryFields.Symbol[];
  emailCCs?: Contentful.EntryFields.Symbol[];
  phone?: Contentful.EntryFields.Symbol;
  address?: Contentful.EntryFields.Text;
  countryCode?:
    | 'AF'
    | 'AL'
    | 'DZ'
    | 'AS'
    | 'AD'
    | 'AO'
    | 'AI'
    | 'AQ'
    | 'AG'
    | 'AR'
    | 'AM'
    | 'AW'
    | 'AU'
    | 'AT'
    | 'AZ'
    | 'BS'
    | 'BH'
    | 'BD'
    | 'BB'
    | 'BY'
    | 'BE'
    | 'BZ'
    | 'BJ'
    | 'BM'
    | 'BT'
    | 'BO'
    | 'BQ'
    | 'BA'
    | 'BW'
    | 'BV'
    | 'BR'
    | 'IO'
    | 'BN'
    | 'BG'
    | 'BF'
    | 'BI'
    | 'CV'
    | 'KH'
    | 'CM'
    | 'CA'
    | 'KY'
    | 'CF'
    | 'TD'
    | 'CL'
    | 'CN'
    | 'CX'
    | 'CC'
    | 'CO'
    | 'KM'
    | 'CD'
    | 'CG'
    | 'CK'
    | 'CR'
    | 'HR'
    | 'CU'
    | 'CW'
    | 'CY'
    | 'CZ'
    | 'CI'
    | 'DK'
    | 'DJ'
    | 'DM'
    | 'DO'
    | 'EC'
    | 'EG'
    | 'SV'
    | 'GQ'
    | 'ER'
    | 'EE'
    | 'SZ'
    | 'ET'
    | 'FK'
    | 'FO'
    | 'FJ'
    | 'FI'
    | 'FR'
    | 'GF'
    | 'PF'
    | 'TF'
    | 'GA'
    | 'GM'
    | 'GE'
    | 'DE'
    | 'GH'
    | 'GI'
    | 'GR'
    | 'GL'
    | 'GD'
    | 'GP'
    | 'GU'
    | 'GT'
    | 'GG'
    | 'GN'
    | 'GW'
    | 'GY'
    | 'HT'
    | 'HM'
    | 'VA'
    | 'HN'
    | 'HK'
    | 'HU'
    | 'IS'
    | 'IN'
    | 'ID'
    | 'IR'
    | 'IQ'
    | 'IE'
    | 'IM'
    | 'IL'
    | 'IT'
    | 'JM'
    | 'JP'
    | 'JE'
    | 'JO'
    | 'KZ'
    | 'KE'
    | 'KI'
    | 'KP'
    | 'KR'
    | 'KW'
    | 'KG'
    | 'LA'
    | 'LV'
    | 'LB'
    | 'LS'
    | 'LR'
    | 'LY'
    | 'LI'
    | 'LT'
    | 'LU'
    | 'MO'
    | 'MG'
    | 'MW'
    | 'MY'
    | 'MV'
    | 'ML'
    | 'MT'
    | 'MH'
    | 'MQ'
    | 'MR'
    | 'MU'
    | 'YT'
    | 'MX'
    | 'FM'
    | 'MD'
    | 'MC'
    | 'MN'
    | 'ME'
    | 'MS'
    | 'MA'
    | 'MZ'
    | 'MM'
    | 'NA'
    | 'NR'
    | 'NP'
    | 'NL'
    | 'NC'
    | 'NZ'
    | 'NI'
    | 'NE'
    | 'NG'
    | 'NU'
    | 'NF'
    | 'MP'
    | 'NO'
    | 'OM'
    | 'PK'
    | 'PW'
    | 'PS'
    | 'PA'
    | 'PG'
    | 'PY'
    | 'PE'
    | 'PH'
    | 'PN'
    | 'PL'
    | 'PT'
    | 'PR'
    | 'QA'
    | 'MK'
    | 'RO'
    | 'RU'
    | 'RW'
    | 'RE'
    | 'BL'
    | 'SH'
    | 'KN'
    | 'LC'
    | 'MF'
    | 'PM'
    | 'VC'
    | 'WS'
    | 'SM'
    | 'ST'
    | 'SA'
    | 'SN'
    | 'RS'
    | 'SC'
    | 'SL'
    | 'SG'
    | 'SX'
    | 'SK'
    | 'SI'
    | 'SB'
    | 'SO'
    | 'ZA'
    | 'GS'
    | 'SS'
    | 'ES'
    | 'LK'
    | 'SD'
    | 'SR'
    | 'SJ'
    | 'SE'
    | 'CH'
    | 'SY'
    | 'TW'
    | 'TJ'
    | 'TZ'
    | 'TH'
    | 'TL'
    | 'TG'
    | 'TK'
    | 'TO'
    | 'TT'
    | 'TN'
    | 'TR'
    | 'TM'
    | 'TC'
    | 'TV'
    | 'UG'
    | 'UA'
    | 'AE'
    | 'GB'
    | 'UM'
    | 'US'
    | 'UY'
    | 'UZ'
    | 'VU'
    | 'VE'
    | 'VN'
    | 'VG'
    | 'VI'
    | 'WF'
    | 'EH'
    | 'YE'
    | 'ZM'
    | 'ZW'
    | 'AX';
  paymentTerm: Contentful.EntryFields.Integer;
  language: 'de' | 'en';
  notes?: CFRichTextTypes.Block | CFRichTextTypes.Inline;
  flags?: (
    | 'attachTimesheet'
    | 'billPerProject'
    | 'bookInvoice'
    | 'sendEmail'
  )[];
}

export type TypeCustomer = Contentful.Entry<TypeCustomerFields>;

export interface TypeProductFields {
  name: Contentful.EntryFields.Symbol;
  type: 'Product' | 'Service';
  skuPrefix: 'DEVELOPMENT' | 'HOSTING' | 'DOMAIN' | 'PHOTOGRAPHY' | 'STOCK';
  skuSuffix: Contentful.EntryFields.Symbol;
  netPrice: Contentful.EntryFields.Number;
  unit?:
    | 'assignment'
    | 'day'
    | 'each'
    | 'flat rate'
    | 'hour'
    | 'minute'
    | 'month'
    | 'night'
    | 'package'
    | 'running metre'
    | 'week'
    | 'year';
  description?: Contentful.EntryFields.Text;
  tax: Contentful.EntryFields.Integer;
}

export type TypeProduct = Contentful.Entry<TypeProductFields>;

export interface TypeProjectFields {
  name: Contentful.EntryFields.Symbol;
  company: Contentful.Entry<TypeCompanyFields>;
  customer: Contentful.Entry<TypeCustomerFields>;
  product: Contentful.Entry<TypeProductFields>;
}

export type TypeProject = Contentful.Entry<TypeProjectFields>;

export interface TypeResourceFields {
  key: Contentful.EntryFields.Symbol;
  value: Contentful.EntryFields.Text;
}

export type TypeResource = Contentful.Entry<TypeResourceFields>;
