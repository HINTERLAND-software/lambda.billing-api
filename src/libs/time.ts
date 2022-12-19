import moment from 'moment';
import { Locale } from './types';

export const formats = {
  de: 'DD.MM.YYYY',
  en: 'YYYY/MM/DD',
};

export const getTimeSpent = (seconds: number): string =>
  moment('2015-01-01').startOf('day').seconds(seconds).format('H:mm:ss');

export const getHours = (seconds: number): number => seconds / 3600;
export const getMinutes = (seconds: number): number => seconds / 60;

export const round = (
  number: number,
  increment: number,
  offset: number = 0
): number => {
  return Math.ceil((number - offset) / increment) * increment + offset;
};

export const getRoundedHours = (seconds: number = 0) => {
  return round(getHours(seconds), 0.25);
};

export const getLastMonth = (): number =>
  parseInt(moment().subtract(1, 'months').format('M'));

export const formatDateForInvoice = (date: string, locale: Locale = 'de') =>
  moment(date).format(formats[locale || 'de'] || formats.de);

export const sortByDate = <T>(a: T, b: T) =>
  moment(a['stop'] ?? a).isBefore(moment(b['stop'] ?? b)) ? -1 : 1;

export class Time {
  public from: moment.Moment;
  public to: moment.Moment;
  private _moment: moment.Moment = moment();
  private _format: string = 'YYYY-MM-DD';

  constructor(
    private config: {
      month?: number;
      year?: number;
      from?: string;
      to?: string;
    }
  ) {
    if (this.config.from && this.config.to) {
      this.from = moment(this.config.from);
      this.to = moment(this.config.to);
    } else {
      if (this.config.month !== undefined) {
        this._moment.month(this.config.month - 1);
      }
      if (this.config.year !== undefined) {
        this._moment.year(this.config.year);
      }
      this.from = this._moment.clone().startOf('month');
      this.to = this._moment.clone().endOf('month');
    }
  }

  get fromDateFormatted(): string {
    return this.from.format(this._format);
  }

  get toDateFormatted(): string {
    return this.to.format(this._format);
  }

  get fromAsISO(): string {
    return this.from.toISOString();
  }

  get toAsISO(): string {
    return this.to.toISOString();
  }
}
