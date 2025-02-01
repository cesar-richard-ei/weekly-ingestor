export interface PreviewData {
  date: string;
  client: string;
  duration: string;
  description: string;
  type: 'empty' | 'weekend' | 'holiday' | 'off' | 'half_off' | 'work';
  project?: string;
} 