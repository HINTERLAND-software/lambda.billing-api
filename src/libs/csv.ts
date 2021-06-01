import moment from 'moment';
import { CustomerDataMapping } from './debitoor-types';
import { formatDateForInvoice } from './time';
import { ClientTimeEntries } from './toggl-types';
import { uniquify } from './utils';

const wrap = (str: unknown) => `"${str}"`;

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
  customerDataMapping: CustomerDataMapping
) => {
  const header = [
    'Date',
    'Start',
    'End',
    'Pause',
    'Description',
    'Location',
    'Total',
    'Active',
  ];
  return customerTimeEntries.map(({ customer, days }) => {
    const customerData = customerDataMapping[customer.name];
    if (!customerData)
      throw new Error(`No customer found for ${customer.name}`);
    return {
      name: customer.name,
      csv: [
        header.map(wrap).join(';'),
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

              const result = {
                date: formatDateForInvoice(start, customerData.meta.lang),
                start: startDate.format('HH:mm'),
                end: endDate.format('HH:mm'),
                pause: formatSeconds(pauseSeconds),
                description,
                total: formatSeconds(totalSeconds),
                active: formatSeconds(activeSeconds),
                location: 'Offsite',
              };

              return result;
            }
          )
          .map((result) =>
            header.map((h) => wrap(result[h.toLowerCase()])).join(';')
          ),
      ].join('\n'),
    };
  });
};
