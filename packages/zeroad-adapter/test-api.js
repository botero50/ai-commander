import { PublicStreamLauncher } from './dist/stream/public-stream-launcher.js';

async function test() {
  const launcher = new PublicStreamLauncher({ statusPort: 3000 });
  
  // Start the server (just the status API, not the full stream)
  const app = launcher.app || {};
  
  // Actually, let's just test that the code compiles
  console.log('✅ PublicStreamLauncher imported successfully');
  console.log('Config:', launcher.toJSON?.());
}

test().catch(console.error);
