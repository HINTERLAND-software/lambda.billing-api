import { EnrichedCustomer, EnrichedProject } from './types';

export interface Day {
  start: string;
  stop: string;
  totalSecondsSpent: number;
  timeEntries: EnrichedTimeEntry[];
}

export interface ProjectTimeEntries {
  customer: EnrichedCustomer;
  project: EnrichedProject;
  totalSecondsSpent: number;
  timeEntries: EnrichedTimeEntry[];
  days: Day[];
}

export interface ClientTimeEntries {
  customer: EnrichedCustomer;
  project: EnrichedProject;
  totalSecondsSpent: number;
  timeEntries: EnrichedTimeEntry[];
  days: Day[];
  projects: ProjectTimeEntries[];
}

export interface EnrichedTimeEntry extends TimeEntry {
  project: EnrichedProject;
  customer: EnrichedCustomer;
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

export interface Customer {
  id: number;
  wid: number;
  name: string;
  at: string;
  notes?: string;
}
