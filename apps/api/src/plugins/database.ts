import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import mongoose from 'mongoose';

function hostOf(uri: string): string {
  return uri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, '').split(/[/?]/)[0] ?? 'unknown host';
}

export const databasePlugin = fp<{ uri: string }>(async (app: FastifyInstance, { uri }) => {
  const host = hostOf(uri);
  app.log.info(`Connecting to MongoDB at ${host}`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  } catch (error) {
    app.log.error(error, `Could not connect to MongoDB at ${host}`);
    throw error;
  }
  app.log.info('Connected to MongoDB');
  app.addHook('onClose', () => mongoose.disconnect());
});
