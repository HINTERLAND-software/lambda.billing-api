import moment from 'moment';

export const getTimeSpent = (seconds: number): string =>
  moment('2015-01-01').startOf('day').seconds(seconds).format('H:mm:ss');

export const getHours = (seconds: number): number => seconds / 3600;

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

export const formatDateForInvoice = (date: string) =>
  moment(date).format('DD.MM.YYYY');

export class Time {
  private _moment: moment.Moment = moment();
  private _format: string = 'YYYY-MM-DD';
  constructor(month?: number, year?: number) {
    if (month) {
      this._moment.set('month', month - 1);
    }
    if (year) {
      this._moment.set('year', year);
    }
  }

  public isBetweenStartAndEndOfMonth(date: string): boolean {
    const groupingDate = moment(date).valueOf();
    return (
      this.startOfMonthEpoch <= groupingDate &&
      this.endOfMonthEpoch >= groupingDate
    );
  }

  set month(month: number) {
    month && this._moment.month(month);
  }

  set year(year: number) {
    year && this._moment.year(year);
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
