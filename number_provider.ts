export interface NumberProvider {
  readNumbers(): Promise<Array<number>>;
}
