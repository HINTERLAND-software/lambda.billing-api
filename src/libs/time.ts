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
  private _moment: moment.Moment = moment();
  private _format: string = 'YYYY-MM-DD';
  constructor(public month?: number, public year?: number) {
    if (this.month !== undefined) {
      this._moment.month(this.month - 1);
    }
    if (this.year !== undefined) {
      this._moment.year(this.year);
    }
  }

  get startOfMonth(): moment.Moment {
    return this._moment.clone().startOf('month');
  }

  get endOfMonth(): moment.Moment {
    return this._moment.clone().endOf('month');
  }

  get startOfMonthFormatted(): string {
    return this.startOfMonth.format(this._format);
  }

  get endOfMonthFormatted(): string {
    return this.endOfMonth.format(this._format);
  }

  get startOfMonthISO(): string {
    return this.startOfMonth.format();
  }

  get endOfMonthISO(): string {
    return this.endOfMonth.format();
  }

  get startOfMonthEpoch(): number {
    return this.startOfMonth.valueOf();
  }

  get endOfMonthEpoch(): number {
    return this.endOfMonth.valueOf();
  }

  get dueTimestamp(): string {
    return this.endOfMonth.utc().add(1, 'day').format();
  }
}
