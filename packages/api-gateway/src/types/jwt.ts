import { UserContext } from './index.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: UserContext;
  }
}