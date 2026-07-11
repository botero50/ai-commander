/**
 * Get the actual camera position from 0 A.D. game via RL Interface
 * This will tell us what the real camera coordinates are
 */


async function getCameraPosition() {
  try {
    console.log('Connecting to 0 A.D. RL Interface (localhost:6666)...\n');

    const code = `
      let data = Engine.GetCameraData();
      print("===== ACTUAL CAMERA POSITION =====");
      print("X: " + data.x);
      print("Y: " + data.y);
      print("Z: " + data.z);
      print("Zoom Distance: " + data.distance);
      print("Rotation X: " + data.rotX);
      print("Rotation Y: " + data.rotY);
      print("===================================");
      JSON.stringify({
        x: data.x,
        y: data.y,
        z: data.z,
        distance: data.distance,
        rotX: data.rotX,
        rotY: data.rotY
      });
    `;

    const response = await fetch('http://localhost:6666/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const result = await response.text();
    console.log('Response:', result);

    try {
      const data = JSON.parse(result);
      console.log('\n✓ ACTUAL CAMERA POSITION:');
      console.log(`  X: ${data.x.toFixed(2)}`);
      console.log(`  Y: ${data.y.toFixed(2)}`);
      console.log(`  Z: ${data.z.toFixed(2)}`);
      console.log(`  Distance (Zoom): ${data.distance.toFixed(2)}`);
      console.log('\nUse these X and Z values in the memory scanner!');
    } catch (e) {
      console.log('Raw response:', result);
    }
  } catch (error) {
    console.error('Error:', error);
    console.error('\nMake sure:');
    console.error('1. 0 A.D. is running with a game in progress');
    console.error('2. Run: npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1');
  }
}

getCameraPosition();
