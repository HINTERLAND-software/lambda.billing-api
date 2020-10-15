export interface Grouped {
  [customerId: string]: GroupedTimeEntries;
}

export interface GroupedTimeEntries {
  client: Client;
  timeEntriesGroupedByProject: {
    [projectId: string]: {
      project: Project;
      totalSecondsSpent: number;
      timeEntries: TimeEntry[];
    };
  };
}

export interface TimeEntry {
  id: number;
  guid: string;
  wid: number;
  pid: string;
  billable: boolean;
  start: string;
  stop: string;
  duration: number;
  description: string;
  tags: string[];
  duronly: boolean;
  at: string;
  uid: number;
}

export interface Project {
  id: number;
  wid: number;
  cid: number;
  name: string;
  billable: boolean;
  is_private: boolean;
  active: boolean;
  at: string;
  template: boolean;
  color: string;
}

export interface Client {
  id: number;
  wid: number;
  name: string;
  at: string;
}
