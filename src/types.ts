export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ConversionData {
  provider?: string;
  amount?: number;
  targetType?: 'ewallet' | 'bank';
  targetName?: string;
  accountNumber?: string;
}
