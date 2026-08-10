require('dotenv').config();

const app    = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '8080', 10);

async function bootstrap() {
    await connectDB();

    const server = app.listen(PORT, () => {
        logger.info(`🚀  CRM server running on port ${PORT}  [${process.env.NODE_ENV}]`);
    });

    // ─── Graceful shutdown ───────────────────────────────────────────────────
    async function shutdown(signal) {
        logger.info(`${signal} received — shutting down gracefully`);
        server.close(async () => {
            await disconnectDB();
            logger.info('Server closed');
            process.exit(0);
        });
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection:', reason);
    });
}

bootstrap().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
