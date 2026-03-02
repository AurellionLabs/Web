export interface GroupedStakes {
  hourly: { [key: string]: number };
  daily: { [key: string]: number };
  weekly: { [key: string]: number };
  monthly: { [key: string]: number };
  yearly: { [key: string]: number };
}
