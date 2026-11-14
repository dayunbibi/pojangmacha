export type GameProps = {
  // shot = picture of the board when the dish is done, shown on the plate
  onDone: (score: number, note: string, shot?: string) => void;
};
