export interface Payload {
  newTask: {
    columnId: string;
    swimlaneId: string;
    targetColumnId: string;
  };
  range?: {
    month?: number;
    year?: number;
  };
  dryRun?: boolean;
}

export interface NameId {
  name: string;
  uniqueId: string;
}

export interface Color {
  name: string;
  value: string;
  description: string;
}

export interface Board {
  swimlanes: NameId[];
  columns: NameId[];
  name: string;
  colors: Color[];
}

export interface Date {
  status: string;
  dateType: string;
  dueTimestamp: string;
  dueTimestampLocal: string;
  targetColumnId: string;
}

export interface Number {
  value: number;
  prefix: string;
}

export interface SubTask {
  name: string;
  finished?: boolean;
  userId?: string;
  dueDateTimestamp?: string;
  dueDateTimestampLocal?: string;
}

export interface Label {
  name: string;
  pinned: boolean;
}

export interface Collaborator {
  userId: string;
}

export interface Task {
  _id: string;
  name: string;
  columnId: string;
  swimlaneId: string;
  position: number;
  description: string;
  color: string;
  number: Number;
  responsibleUserId: string;
  totalSecondsSpent: number;
  totalSecondsEstimate: string;
  pointsEstimate?: number;
  groupingDate: string;
  dates: Date[];
  subTasks: SubTask[];
  labels: Label[];
  collaborators: Collaborator[];
}

export interface Swimlane {
  swimlaneId: string;
  swimlaneName: string;
  columnId: string;
  columnName: string;
  tasksLimited: boolean;
  tasks: Task[];
}

export interface Grouped {
  [customerName: string]: GroupedTask;
}

export interface GroupedTask {
  customerName: string;
  totalSecondsSpent: number;
  tasks: Task[];
}
