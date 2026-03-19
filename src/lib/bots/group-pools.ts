import fs from 'fs';
import path from 'path';

export interface PoolGroup {
  id: string; // Internal ID
  name: string; // Ex: Pega Essa Promo! - Informática 01
  inviteLink: string; // Ex: https://chat.whatsapp.com/ABCD...
  memberCount: number; // Current members, can be updated later via bot sync
  maxCapacity: number; // Max members (default 250 to have some safe margin)
  isActive: boolean;
}

export interface GroupPool {
  id: string;
  category: string;
  groups: PoolGroup[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'group-pools.json');

// Garante que o diretório data existe
const ensureDataDir = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export class GroupPoolService {
  private static instance: GroupPoolService;
  private pools: GroupPool[] = [];

  private constructor() {
    this.loadPools();
  }

  public static getInstance(): GroupPoolService {
    if (!GroupPoolService.instance) {
      GroupPoolService.instance = new GroupPoolService();
    }
    return GroupPoolService.instance;
  }

  private loadPools() {
    ensureDataDir();
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        this.pools = JSON.parse(data);
      } else {
        this.pools = [];
        this.savePools();
      }
    } catch (error) {
      console.error('Error loading group pools:', error);
      this.pools = [];
    }
  }

  private savePools() {
    ensureDataDir();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.pools, null, 2));
    } catch (error) {
      console.error('Error saving group pools:', error);
    }
  }

  public getAllPools(): GroupPool[] {
    this.loadPools();
    return this.pools;
  }

  public getPoolByCategory(category: string): GroupPool | undefined {
    this.loadPools();
    return this.pools.find(p => p.category === category);
  }

  public createPool(category: string): GroupPool {
    let pool = this.getPoolByCategory(category);
    if (!pool) {
      pool = {
        id: `pool_${Date.now()}`,
        category,
        groups: []
      };
      this.pools.push(pool);
      this.savePools();
    }
    return pool;
  }

  public deletePool(poolId: string): boolean {
    this.loadPools();
    console.log(`[GroupPoolService] Deleting pool ${poolId}. Current pools:`, this.pools.map(p => p.id));
    const initialLength = this.pools.length;
    this.pools = this.pools.filter(p => p.id !== poolId);
    console.log(`[GroupPoolService] Pools after filter: ${this.pools.length}`);
    if (this.pools.length !== initialLength) {
      this.savePools();
      return true;
    }
    return false;
  }

  // --- Gerenciamento de Grupos dentro dos Pools ---

  public addGroupToPool(poolId: string, group: Omit<PoolGroup, 'id' | 'memberCount'> & { id?: string, memberCount?: number }): GroupPool | undefined {
    this.loadPools();
    const pool = this.pools.find(p => p.id === poolId);
    if (!pool) return undefined;

    const newGroup: PoolGroup = {
      ...group,
      id: group.id || `group_${Date.now()}`,
      isActive: group.isActive !== undefined ? group.isActive : true,
      memberCount: group.memberCount || 0,
      maxCapacity: group.maxCapacity || 250 // safe margin below 256
    };

    pool.groups.push(newGroup);
    this.savePools();
    return pool;
  }

  public updateGroupInPool(poolId: string, groupId: string, updates: Partial<PoolGroup>): GroupPool | undefined {
    this.loadPools();
    const pool = this.pools.find(p => p.id === poolId);
    if (!pool) return undefined;

    const groupIndex = pool.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return undefined;

    pool.groups[groupIndex] = { ...pool.groups[groupIndex], ...updates };
    this.savePools();
    return pool;
  }

  public removeGroupFromPool(poolId: string, groupId: string): GroupPool | undefined {
    this.loadPools();
    const pool = this.pools.find(p => p.id === poolId);
    if (!pool) return undefined;

    pool.groups = pool.groups.filter(g => g.id !== groupId);
    this.savePools();
    return pool;
  }

  // -- ROTAÇÃO INTELIGENTE (Smart Routing) --
  
  public findAvailableGroup(category: string): PoolGroup | undefined {
    const pool = this.getPoolByCategory(category);
    if (!pool) return undefined;

    // Filtra apenas grupos ativos que têm menos membros do que a capacidade máxima
    const availableGroups = pool.groups.filter(g => g.isActive && g.memberCount < g.maxCapacity);

    // Estratégia: encher o grupo que já tem mais gente (para focar em um por vez),
    // ou simplesmente pegar o primeiro disponível na ordem de criação.
    // Vamos ordenar por memberCount DESCendente para priorizar o preenchimento de um grupo que já está rodando
    // Mas garantir que manter a ordem de criação caso tenham mesmo count.
    
    if (availableGroups.length > 0) {
      return availableGroups.sort((a, b) => b.memberCount - a.memberCount)[0];
    }

    // Se todos estiverem lotados (ou não houver grupos ativos), retorna undefined
    return undefined;
  }
}

export const groupPoolService = GroupPoolService.getInstance();
