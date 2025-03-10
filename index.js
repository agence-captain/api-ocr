import Fastify from 'fastify';
import { createWorker } from 'tesseract.js';

const fastify = Fastify({
  logger: true
});

// Initialize Tesseract worker
let worker = null;

// Initialize the worker when the server starts
const initializeWorker = async () => {
  worker = await createWorker('fra');
  console.log('Worker initialized');
};

// Initialize worker
initializeWorker().catch(console.error);

// Route to process image
fastify.post('/ocr', async (request, reply) => {
  try {
    const { image } = request.body;

    // Validate request body
    if (!image) {
      return reply.code(400).send({
        success: false,
        error: 'No image provided'
      });
    }

    // Validate base64 format
    if (!image.match(/^data:image\/(png|jpeg|jpg|gif);base64,/)) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid image format. Must be base64 encoded image with data URI scheme'
      });
    }

    // Check if worker is ready
    if (!worker) {
      return reply.code(503).send({
        success: false,
        error: 'OCR service is initializing. Please try again in a few seconds'
      });
    }

    // Process the image
    const { data: { text } } = await worker.recognize(image);

    return {
      success: true,
      data: {
        text: text.trim()
      }
    };

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Error processing image'
    });
  }
});

// Graceful shutdown
const cleanup = async () => {
  if (worker) {
    await worker.terminate();
  }
  await fastify.close();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
try {
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
  console.log('Server is running on http://localhost:3000');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}