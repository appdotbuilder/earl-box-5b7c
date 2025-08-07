
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import { 
  uploadFileInputSchema, 
  getFileByUrlInputSchema 
} from './schema';
import { uploadFile } from './handlers/upload_file';
import { getFileByUrl } from './handlers/get_file_by_url';
import { getFileStats } from './handlers/get_file_stats';
import { downloadFile } from './handlers/download_file';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  uploadFile: publicProcedure
    .input(uploadFileInputSchema)
    .mutation(({ input }) => uploadFile(input)),
    
  getFileByUrl: publicProcedure
    .input(getFileByUrlInputSchema)
    .query(({ input }) => getFileByUrl(input)),
    
  getFileStats: publicProcedure
    .query(() => getFileStats()),
    
  downloadFile: publicProcedure
    .input(getFileByUrlInputSchema)
    .query(({ input }) => downloadFile(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Earl Box TRPC server listening at port: ${port}`);
}

start();
