import { InMemoryAdminAuthProvider } from './admin-auth';

// 실제 관리자 계정과 영속 세션 공급자가 연결되기 전까지 사용하는 로컬 경계다.
export const adminAuthProvider = new InMemoryAdminAuthProvider();
