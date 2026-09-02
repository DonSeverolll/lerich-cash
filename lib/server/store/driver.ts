import 'server-only';

import { createFileRepository } from './file-repository';
import { createFirestoreRepository, lerCredenciaisFirebase } from './firestore-repository';
import type { StoreDriver, StoreRepository } from './repository';

/**
 * Escolha do driver de persistência, feita uma vez por processo: havendo
 * credencial do Firebase, usa Firestore; caso contrário, o arquivo local.
 */

let repositorio: StoreRepository | null = null;

export function repo(): StoreRepository {
  if (repositorio) return repositorio;

  const credenciais = lerCredenciaisFirebase();

  if (credenciais) {
    try {
      repositorio = createFirestoreRepository(credenciais);
      return repositorio;
    } catch (causa) {
      // Credencial presente mas inválida: avisamos alto e seguimos em arquivo,
      // para o site não ficar fora do ar por erro de configuração.
      console.error('[lerich-finance] Falha ao conectar no Firestore, usando arquivo local:', causa);
    }
  }

  repositorio = createFileRepository();
  return repositorio;
}

export function storeDriver(): StoreDriver {
  return repo().driver;
}

export function isPersistenceAvailable(): boolean {
  return repo().gravacaoDisponivel();
}
