import dotenv from 'dotenv';
import path from 'path';

// This config file is imported by services in the `apps` directory.
// We need to go up three levels from `packages/backend-common/src` to the root,
// then down into `apps/[service-name]`.
// However, a simpler approach is to rely on the CWD (current working directory)
// when the service is started. `pnpm` runs scripts from the package's root.
// So, `path.resolve(process.cwd(), '.env')` will correctly find the .env
// in `apps/http-backend` or `apps/ws-backend`.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-is-at-least-32-characters-long";

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in the environment variables.");
    console.error(`CWD: ${process.cwd()}`);
    console.error("Ensure you have a .env file in your service's root with JWT_SECRET defined.");
    process.exit(1);
}

export { JWT_SECRET };
