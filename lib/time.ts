import moment from 'moment';

export const getTimeSpent = (seconds: number): string =>
  moment('2015-01-01').startOf('day').seconds(seconds).format('H:mm:ss');

export class Time {
  private _moment: moment.Moment = moment().utc();
  private _format: string = 'YYYY-MM-DD';
  constructor(month?: number, year?: number) {
    this.month = month ? month - 1 : this._moment.month();
    this.year = year || this._moment.year();
  }

  public isBetweenStartAndEndOfMonth(date: string): boolean {
    const momentDate = moment(date);
    return (
      this.startOfMonth.isBefore(momentDate) &&
      this.endOfMonth.isAfter(momentDate)
    );
  }

  set month(month: number) {
    this._moment.month(month);
  }

  set year(year: number) {
    this._moment.year(year);
  }

  get startOfMonth(): moment.Moment {
    return this._moment.startOf('month');
  }

  get endOfMonth(): moment.Moment {
    return this._moment.endOf('month');
  }

  get startOfMonthFormatted(): string {
    return this.startOfMonth.format(this._format);
  }

  get endOfMonthFormatted(): string {
    return this.endOfMonth.format(this._format);
  }

  get startOfMonthEpoch(): number {
    return this.startOfMonth.valueOf();
  }

  get endOfMonthEpoch(): number {
    return this.endOfMonth.valueOf();
  }

  get dueTimestamp(): string {
    return this.endOfMonth.add(1, 'day').format();
  }
}
