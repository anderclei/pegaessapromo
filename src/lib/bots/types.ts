export type BotStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';

export const GROUP_CATEGORIES = [
  { value: 'todos', label: 'Todos', icon: '🌐' },
  { value: 'informatica', label: 'Informática', icon: '💻' },
  { value: 'casa', label: 'Casa & Decoração', icon: '🏠' },
  { value: 'mulher', label: 'Moda Feminina', icon: '👗' },
  { value: 'beleza', label: 'Beleza & Cosméticos', icon: '💄' },
  { value: 'cachorro', label: 'Pet / Cachorro', icon: '🐕' },
  { value: 'ferramentas', label: 'Ferramentas', icon: '🔧' },
  { value: 'brinquedos', label: 'Brinquedos', icon: '🧸' },
  { value: 'esportes', label: 'Esportes & Fitness', icon: '⚽' },
  { value: 'automotivo', label: 'Automotivo', icon: '🚗' },
  { value: 'saude', label: 'Saúde', icon: '💊' },
  { value: 'eletronicos', label: 'Eletrônicos', icon: '📱' },
  { value: 'cozinha', label: 'Cozinha', icon: '🍳' },
  { value: 'gamer', label: 'Gamer', icon: '🎮' },
] as const;

export type GroupCategory = typeof GROUP_CATEGORIES[number]['value'];

export interface WhatsAppGroup {
  id: string;
  name: string;
  participantsCount: number;
  isAdmin: boolean;
  categories: GroupCategory[]; // categorias vinculadas a este grupo
}

export interface WhatsAppConfig {
  enabled: boolean;
  groups: string[]; // group IDs selecionados
  template: 'aida' | 'pas' | 'bab' | 'short';
  intervalMinutes: number;
}

export interface InstagramPostData {
  id: string;
  productTitle: string;
  caption: string;
  hashtags: string;
  imageUrl: string;
  affiliateLink: string;
  createdAt: string;
  status?: 'success' | 'error' | 'pending';
  message?: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number;
  template: 'aida' | 'pas' | 'bab' | 'short';
  platforms: {
    whatsapp: boolean;
    instagram: boolean;
  };
  maxPostsPerRun: number;
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
}

export interface PostLog {
  id: string;
  platform: 'whatsapp' | 'instagram';
  productTitle: string;
  groupName?: string;
  status: 'success' | 'error';
  message?: string;
  timestamp: string;
}

export interface BotState {
  whatsapp: {
    status: BotStatus;
    qrCode: string | null;
    groups: WhatsAppGroup[];
    connectedPhone?: string;
  };
  instagram: {
    posts: InstagramPostData[];
  };
  schedule: ScheduleConfig;
  logs: PostLog[];
  postedProductIds: string[];
}
