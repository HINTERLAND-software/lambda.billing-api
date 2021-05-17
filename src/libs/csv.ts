import moment from 'moment';
import { GroupedTimeEntries } from './toggl-types';

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

export const createCsv = (clients: GroupedTimeEntries[]) => {
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
  return clients.map((client) => ({
    name: client.client.name,
    projects: client.projects.map((project) => ({
      name: project.project.name,
      csv: [
        header.map(wrap).join(';'),
        ...project.timeEntriesPerDay
          ?.map(
            ({
              date,
              timeEntries,
              start,
              stop,
              totalSecondsSpent: activeSeconds,
            }) => {
              const description = [
                ...new Set(
                  timeEntries.reduce((acc, { description }) => {
                    return [
                      ...acc,
                      ...description.split(',').map((x) => x.trim()),
                    ];
                  }, [])
                ),
              ]
                .sort()
                .join(', ');

              const startDate = moment(start);
              const endDate = moment(stop);
              const totalSeconds = moment
                .duration(endDate.diff(startDate))
                .asSeconds();
              const pauseSeconds = totalSeconds - activeSeconds;

              const result = {
                date,
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
    })),
  }));
};
