import moment from 'moment';
import { CustomerDataMapping, GlobalMeta } from './debitoor-types';
import { formatDateForInvoice } from './time';
import { ClientTimeEntries } from './toggl-types';
import { Config, initTranslate, uniquify } from './utils';

const delimiter = ',';
const wrap = (str: unknown) => `"${str}"`;
const mapWrapJoin = (...arr: unknown[]) => arr.map(wrap).join(delimiter);

const formatSeconds = (seconds: number) => {
  const minutes = seconds / 60;
  const roundedMinutes = 5 * Math.round(minutes / 5);
  const hours = roundedMinutes / 60;
  const [hrs, mnts] = `${hours}`.split('.');
  const mnt = 60 * Number.parseFloat(`0.${mnts}`);
  return [
    hrs.length === 1 ? `0${hrs}` : hrs,
    `${mnt}`.length === 1 ? `${mnt}0` : `${mnt}`,
  ].join(':');
};

export const createCsv = (
  customerTimeEntries: ClientTimeEntries[],
  customerDataMapping: CustomerDataMapping,
  config: Config,
  globalMeta: GlobalMeta
) => {
  const header = [
    'DATE',
    'DESCRIPTION',
    'LOCATION',
    'START',
    'END',
    'PAUSE',
    'TOTAL_TIME_WORKED',
  ] as const;

  return customerTimeEntries.map(({ customer, days, totalSecondsSpent }) => {
    const customerData = customerDataMapping[customer.name];
    if (!customerData)
      throw new Error(`No customer found for ${customer.name}`);
    const { meta } = customerData;
    const t = initTranslate(meta.lang);
    const company = globalMeta.companies[meta.company];
    return {
      name: customer.name,
      csv: [
        mapWrapJoin(t('TIMESHEET')),
        '',
        mapWrapJoin(
          t('FROM'),
          formatDateForInvoice(config.time.startOfMonthFormatted, meta.lang)
        ),
        mapWrapJoin(
          t('TO'),
          formatDateForInvoice(config.time.endOfMonthFormatted, meta.lang)
        ),
        mapWrapJoin(t('CLIENT'), customer.name),
        mapWrapJoin(t('PROVIDER'), `${company.name} (${company.email})`),
        mapWrapJoin(t('SERVICE_LEVEL'), t('SERVICE_LEVEL_DEFAULT')),
        '',
        mapWrapJoin(...header.map((h) => t(h))),
        ...days
          .map(
            ({
              timeEntries,
              start,
              stop,
              totalSecondsSpent: activeSeconds,
            }) => {
              const description = uniquify(
                timeEntries.map(({ description }) => description)
              )
                .sort()
                .join(', ');

              const startDate = moment(start);
              const endDate = moment(stop);
              const totalSeconds = moment
                .duration(endDate.diff(startDate))
                .asSeconds();
              const pauseSeconds = totalSeconds - activeSeconds;

              const isOnsite = timeEntries.some((entry) =>
                (entry.tags || [])
                  .map((tag) => tag.toLowerCase())
                  .includes('onsite')
              );

              const totalTimeWorked = formatSeconds(activeSeconds);

              const result: Record<typeof header[number], unknown> = {
                DATE: formatDateForInvoice(start, meta.lang),
                START: startDate.format('HH:mm'),
                END: endDate.format('HH:mm'),
                PAUSE: formatSeconds(pauseSeconds),
                DESCRIPTION: description,
                TOTAL_TIME_WORKED: totalTimeWorked,
                LOCATION: isOnsite ? t('ONSITE') : t('OFFSITE'),
              };

              return result;
            }
          )
          .map((result) => mapWrapJoin(...header.map((h) => result[h]))),
        '',
        mapWrapJoin(
          ...Array(header.length - 2).fill(''),
          t('SUM'),
          formatSeconds(totalSecondsSpent)
        ),
      ].join('\n'),
    };
  });
};
