export interface ConflictInterface {
  packageName: string;
  conflict: {
    context: string;
    version: string;
  }[];
}
