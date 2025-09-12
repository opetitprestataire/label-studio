export interface TaskData {
  x: number;
  y: number;
  text?: string;
  image?: string;
  class?: string;
  time?: number;
  r?: number;
  // Allow flexible task data structures from various projects
  [key: string]: any;
}

export interface TaskPoint {
  id: string;
  data: TaskData;
}

export interface ScatterSettings {
  classField: string;
}
