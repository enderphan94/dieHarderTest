// const fs = require('fs');
// const crypto = require('crypto');

// const TOTAL_BALLS = 7; // Total balls to generate
// const OUTPUT_FILE = 'random_balls.bin'; // Output file for the binary data
// const NUMBER_OF_GENERATIONS = 100_000_000; // Number of random balls to generate

// async function generateRandomBalls() {
//   const randomBalls = [];

//   for (let i = 0; i < NUMBER_OF_GENERATIONS; i++) {
//     const randomBytes = crypto.randomBytes(4); // Generate 4 random bytes
//     const randomIndex = randomBytes.readUInt32BE(0) % TOTAL_BALLS; // Get a random index for balls
//     randomBalls.push(randomIndex + 1); // Store the ball number (1 to 7)
//     console.log("At",i)
//   }

//   // Convert the random balls to a continuous bitstream
//   const bitstream = randomBalls.map(ball => {
//     const bits = (ball).toString(2).padStart(3, '0'); // Convert to binary and pad to 3 bits
//     return bits;
//   }).join(''); // Join all bits into a single string

//   // Write the bitstream to a binary file
//   const buffer = Buffer.from(bitstream, 'binary');
//   fs.writeFileSync(OUTPUT_FILE, buffer);
//   console.log(`Generated ${NUMBER_OF_GENERATIONS} random balls and saved to ${OUTPUT_FILE}`);
// }

// // Call the function to generate the random balls
// generateRandomBalls().catch(console.error);



// const fs = require('fs');
// const crypto = require('crypto');

// const TOTAL_BALLS = 7; // Total balls to generate (1 to 7)
// const OUTPUT_FILE = 'random_balls.bin'; // Output file for the binary data
// const NUMBER_OF_GENERATIONS = 100_000_000; // Total number of random balls to generate
// const BATCH_SIZE = 100_000; // Number of balls to process in each batch

// // Function to generate a secure random number between 1 and TOTAL_BALLS
// function generateRandomBall() {
//   const randomBytes = crypto.randomBytes(4);
//   const randomIndex = randomBytes.readUInt32BE(0) % TOTAL_BALLS;
//   return randomIndex + 1; // Store ball numbers as 1 to 7
// }

// // Function to generate and write random balls incrementally to the file
// async function generateRandomBalls() {
//   const fileStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w' });

//   for (let batchStart = 0; batchStart < NUMBER_OF_GENERATIONS; batchStart += BATCH_SIZE) {
//     const currentBatchSize = Math.min(BATCH_SIZE, NUMBER_OF_GENERATIONS - batchStart);
//     const bitstreamArray = [];

//     for (let i = 0; i < currentBatchSize; i++) {
//       const randomBall = generateRandomBall();
//       const bits = randomBall.toString(2).padStart(3, '0'); // Convert to binary (3 bits)
//       bitstreamArray.push(bits);
//     }

//     const bitstream = bitstreamArray.join('');
//     const buffer = Buffer.from(bitstream, 'binary');
//     fileStream.write(buffer);

//     console.log(`Processed ${batchStart + currentBatchSize} of ${NUMBER_OF_GENERATIONS} random balls...`);
//   }

//   // Close the file stream after writing all data
//   fileStream.end(() => {
//     console.log(`Generated ${NUMBER_OF_GENERATIONS} random balls and saved to ${OUTPUT_FILE}`);
//   });
// }

// // Call the function to generate the random balls
// generateRandomBalls().catch(console.error);





const fs = require('fs');
const crypto = require('crypto');

const TOTAL_BALLS = 7; 
const OUTPUT_FILE = 'random_balls.bin'; 
const NUMBER_OF_GENERATIONS = 100_000_000; 
const BATCH_SIZE = 100_000; 
const BITS_PER_BALL = 3; 

// Function to generate a secure random number between 1 and TOTAL_BALLS, applying dynamic XOR mask
// Problem: The XOR mask is generated once and reused for every number, which means its influence on the randomness is uniform across all numbers. This can negate its intended effect by introducing a consistent pattern to all numbers.
function generateMaskedRandomBall() {
  const randomBytes = crypto.randomBytes(4);
  const randomIndex = randomBytes.readUInt32BE(0) % TOTAL_BALLS;
  const xorMask = crypto.randomBytes(4).readUInt32BE(0);  // Dynamic XOR mask generation
  const maskedBall = ((randomIndex + 1) ^ xorMask) >>> 0; // Apply XOR mask dynamically
  return maskedBall % (1 << BITS_PER_BALL);  // Ensure it still uses only the required bits
}

// Function to generate and write packed masked random balls incrementally to the file
async function generateRandomBalls() {
  const fileStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w' });

  for (let batchStart = 0; batchStart < NUMBER_OF_GENERATIONS; batchStart += BATCH_SIZE) {
    const currentBatchSize = Math.min(BATCH_SIZE, NUMBER_OF_GENERATIONS - batchStart);
    const packedBuffer = Buffer.alloc(Math.ceil(currentBatchSize * BITS_PER_BALL / 8)); // Adjust buffer size for packing

    let bitOffset = 0;

    for (let i = 0; i < currentBatchSize; i++) {
      const maskedRandomBall = generateMaskedRandomBall();
      
      const byteIndex = Math.floor(bitOffset / 8);
      const bitIndex = bitOffset % 8;
      const bitsAvailable = 8 - bitIndex; // Bits available in the current byte

      if (bitsAvailable >= BITS_PER_BALL) {
        packedBuffer[byteIndex] |= maskedRandomBall << (bitsAvailable - BITS_PER_BALL);
      } else {
        // If not enough space in the current byte, split the bits
        packedBuffer[byteIndex] |= maskedRandomBall >> (BITS_PER_BALL - bitsAvailable);
        packedBuffer[byteIndex + 1] = maskedRandomBall << (8 - BITS_PER_BALL + bitsAvailable);
      }

      bitOffset += BITS_PER_BALL;
    }

    fileStream.write(packedBuffer);
    console.log(`Processed ${batchStart + currentBatchSize} of ${NUMBER_OF_GENERATIONS} packed random balls...`);
  }

  fileStream.end(() => {
    console.log(`Generated ${NUMBER_OF_GENERATIONS} packed random balls and saved to ${OUTPUT_FILE}`);
  });
}

generateRandomBalls().catch(console.error);
