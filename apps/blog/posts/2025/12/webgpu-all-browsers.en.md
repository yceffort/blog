---
title: 'WebGPU Is Finally Available in Every Browser'
tags:
  - webgpu
  - ai
  - browser
published: true
date: 2025-12-30 12:00:00
description: 'In July 2025, the browser GPU API changed generations for the first time in 14 years'
art:
  layout: rings
  hue: violet
  tone: dark
  hero: 'WebGPU'
---

## Table of Contents

## Introduction

In July 2025, Firefox 141 shipped official WebGPU support, which means WebGPU is now available in all four major browsers: Chrome, Edge, Safari, and Firefox. It's the first generational change in browser GPU APIs in the 14 years since WebGL arrived in 2011.

| Browser | Support Since     | Notes                        |
| ------- | ----------------- | ---------------------------- |
| Chrome  | April 2023 (v113) | Windows, macOS, ChromeOS     |
| Edge    | April 2023 (v113) | Same as Chrome               |
| Safari  | June 2025 (v26)   | macOS, iOS, iPadOS, visionOS |
| Firefox | July 2025 (v141)  | Windows, macOS ARM64 (v145)  |

Chrome got there two years earlier, but with Safari and Firefox joining back to back this year, WebGPU is now usable on [roughly 85% of desktop browsers](https://web.dev/blog/webgpu-supported-major-browsers). It's finally at the point where WebGPU is worth considering in production.

## WebGL vs WebGPU: What's Different

WebGL is an API from 2011. That's 14 years ago. Back then the iPhone 4S was the latest phone, and GPUs were toys compared to what we have now. The problem is that GPU hardware has changed completely since then, while WebGL has stayed the same.

### The Limits of WebGL

WebGL has two fundamental problems.

**1. The state machine model**

WebGL draws by constantly mutating global state. To draw something, you first set the "current buffer", "current texture", and "current shader", and then issue a draw command.

```javascript
// WebGL: keep mutating global state
gl.bindBuffer(gl.ARRAY_BUFFER, buffer1)
gl.bindTexture(gl.TEXTURE_2D, texture1)
gl.useProgram(program1)
gl.drawArrays(gl.TRIANGLES, 0, 3) // draws with the "current state" at this moment

gl.bindBuffer(gl.ARRAY_BUFFER, buffer2) // state change
gl.bindTexture(gl.TEXTURE_2D, texture2) // another change
gl.useProgram(program2) // and another
gl.drawArrays(gl.TRIANGLES, 0, 3) // draws with the changed state
```

On every draw call, the driver has to verify "what's bound right now? Do the shader inputs match the buffer layout?" That overhead accumulates and becomes a CPU bottleneck.

**2. The immediate execution model**

In WebGL, API calls go straight to the driver. When JavaScript calls `gl.bindBuffer()`, the driver changes state immediately. Sending 100 commands means 100 round trips between JS and the driver.

### WebGPU's Approach

WebGPU solves these problems in two ways.

**1. Explicit binding**: Instead of a state machine, you bundle the resources you need ahead of time into a pipeline. No state validation is needed at runtime.

**2. Command buffers**: Commands aren't executed immediately; they're recorded into a command buffer and sent to the GPU all at once.

```javascript
// WebGPU: record commands and submit them in one go
const commandEncoder = device.createCommandEncoder()

const pass1 = commandEncoder.beginRenderPass(renderPassDescriptor1)
pass1.setPipeline(pipeline1) // precompiled pipeline
pass1.setBindGroup(0, bindGroup1) // bundle of resources
pass1.draw(3)
pass1.end()

const pass2 = commandEncoder.beginRenderPass(renderPassDescriptor2)
pass2.setPipeline(pipeline2)
pass2.setBindGroup(0, bindGroup2)
pass2.draw(3)
pass2.end()

// send all commands to the GPU at once
device.queue.submit([commandEncoder.finish()])
```

### Technical Differences at a Glance

| Aspect           | WebGL                                 | WebGPU                         |
| ---------------- | ------------------------------------- | ------------------------------ |
| Underlying tech  | OpenGL ES (designed in 2007)          | Vulkan/Metal/D3D12 (post-2015) |
| Command handling | Immediate execution, always validated | Record, then submit in batch   |
| State management | Global state machine                  | Explicit binding               |
| Pipelines        | Created at runtime                    | Precompiled                    |
| Compute Shader   | Not supported                         | Supported                      |
| Multithreading   | Not possible                          | Possible                       |

The net result is that WebGPU dramatically reduces the bottleneck between JavaScript and the GPU. Babylon.js's Snapshot Rendering feature achieved [roughly 10x faster rendering](https://web.dev/blog/webgpu-supported-major-browsers) on WebGPU. That's an extreme optimization case, of course, but in complex scenes with many draw calls, WebGPU's advantage is clear.

### The More Important Difference: Compute Shaders

But honestly, graphics performance is the secondary story. What really matters about WebGPU is that it supports **compute shaders**.

WebGL can only do "graphics": draw triangles, apply textures, put pixels on the screen. That's it. To do general-purpose computation, you had to resort to tricks: encode your data into a texture, "pretend to draw a picture" with a shader while actually performing computation, and read the results back out of a texture. Slow and full of constraints.

WebGPU supports general-purpose GPU computation (GPGPU) from the ground up. With compute shaders you can use the GPU not as a "graphics card" but as a "parallel compute device". Thousands of cores multiply matrices and process tensor operations simultaneously.

Shader code is written in a separate language called WGSL (WebGPU Shading Language). It's code that runs on the GPU, not JavaScript. From JS, you pass this code as a string to be compiled and executed.

```javascript
// pass the WGSL shader as a string from JavaScript
const shaderCode = `
  @group(0) @binding(0) var<storage, read> input_a: array<f32>;
  @group(0) @binding(1) var<storage, read> input_b: array<f32>;
  @group(0) @binding(2) var<storage, read_write> output: array<f32>;

  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let index = id.x;
    output[index] = input_a[index] + input_b[index];
  }
`

// compile the shader on the GPU
const shaderModule = device.createShaderModule({code: shaderCode})

// create and run the pipeline
const pipeline = device.createComputePipeline({
  layout: 'auto',
  compute: {module: shaderModule, entryPoint: 'main'},
})
```

This is the key to running AI inference practically in the browser. Machine learning models are ultimately a long chain of matrix operations, and now those can be processed natively on the GPU. Of course, if you use libraries like TensorFlow.js or Transformers.js, you don't need to write this low-level code yourself.

## The Actual Performance Difference

So how much faster is it in practice?

### WebGPU vs WebGL vs CPU

[TensorFlow.js shows roughly 3x faster inference on the WebGPU backend compared to WebGL](https://web.dev/blog/webgpu-supported-major-browsers). The more complex the model, the wider the gap.

A medium-sized language model inference that took 2-3 seconds on the CPU drops to 200-400ms with WebGPU. That's a difference you can feel.

| Backend    | Inference Time (relative) | Notes                     |
| ---------- | ------------------------- | ------------------------- |
| CPU (WASM) | 10x                       | Baseline                  |
| WebGL      | 3x                        | Texture-based computation |
| WebGPU     | 1x                        | Compute Shader            |

### Practical Limits

What you can realistically run in the browser is models under 5-10B parameters. GPT-4-class models are obviously out. But tasks like these are entirely feasible:

- Text classification, sentiment analysis
- Embedding generation
- Small LLMs (Phi-3, Gemma 2B, etc.)
- Image classification, object detection
- Speech recognition (Whisper tiny/base)

## Browser ML Libraries

Working with WebGPU directly means writing shader code, but in most cases you can just use a library. Here are the main libraries that support a WebGPU backend.

### TensorFlow.js

An ML library for the browser and Node.js built by Google. It's the oldest and has the broadest ecosystem.

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-backend-webgpu
```

- **Pros**: rich set of pretrained models, supports converting TensorFlow/Keras models, stable
- **Cons**: large bundle size, low-level API
- **Good for**: custom models, porting existing TensorFlow models

### Transformers.js

A library from [Hugging Face](https://huggingface.co/). It's a JavaScript port of Python's `transformers` library, letting you use models from the Hugging Face Hub directly in the browser.

```bash
npm install @huggingface/transformers
```

- **Pros**: supports recent models (BERT, ViT, Whisper, etc.), high-level `pipeline()` API, ONNX-based
- **Cons**: fewer model types than TensorFlow.js
- **Good for**: common tasks like NLP, image classification, speech recognition

Most models tagged `ONNX` on the Hugging Face Hub work with Transformers.js. The [Xenova](https://huggingface.co/Xenova) namespace has many WebGPU-optimized models.

### ONNX Runtime Web

A runtime for executing ONNX models, built by Microsoft. Transformers.js uses it under the hood.

```bash
npm install onnxruntime-web
```

- **Pros**: direct support for the ONNX format, choice of WebGPU/WebGL/WASM backends
- **Cons**: low-level API, you implement model loading/preprocessing yourself
- **Good for**: running ONNX models converted from PyTorch/TensorFlow

### Which One Should You Use?

| Situation                                       | Recommendation                     |
| ----------------------------------------------- | ---------------------------------- |
| NLP (embeddings, classification, summarization) | Transformers.js                    |
| Image classification/object detection           | Transformers.js or TensorFlow.js   |
| Training custom models                          | TensorFlow.js                      |
| Running existing ONNX models                    | ONNX Runtime Web                   |
| Quick prototyping                               | Transformers.js (`pipeline()` API) |

In most cases I'd recommend starting with **Transformers.js**. The `pipeline()` API is intuitive, and enabling WebGPU is a single line: `{device: 'webgpu'}`.

## Hands-On: Using WebGPU with TensorFlow.js

Let's try it ourselves. This example runs simple inference on TensorFlow.js's WebGPU backend.

### 1. Project Setup

```bash
npm init -y
npm install @tensorflow/tfjs @tensorflow/tfjs-backend-webgpu
```

### 2. Initializing the WebGPU Backend

```typescript
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgpu'

async function initWebGPU() {
  // check whether WebGPU is supported
  if (!navigator.gpu) {
    console.error('WebGPU not supported')
    return false
  }

  // set the WebGPU backend
  await tf.setBackend('webgpu')
  await tf.ready()

  console.log('Backend:', tf.getBackend()) // 'webgpu'
  return true
}
```

### 3. A Simple Matrix Multiplication Benchmark

Let's verify WebGPU's performance difference ourselves.

```typescript
async function benchmark() {
  const size = 1024

  // create large matrices
  const a = tf.randomNormal([size, size])
  const b = tf.randomNormal([size, size])

  // warmup (the first run includes compilation time)
  const warmup = tf.matMul(a, b)
  await warmup.data()
  warmup.dispose()

  // actual benchmark
  const iterations = 10
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    const result = tf.matMul(a, b)
    await result.data() // wait for the GPU computation to finish
    result.dispose()
  }

  const elapsed = performance.now() - start
  console.log(`${size}x${size} matmul: ${(elapsed / iterations).toFixed(2)}ms`)

  // clean up memory
  a.dispose()
  b.dispose()
}
```

### 4. Loading a Pretrained Model and Running Inference

Let's run an actual model. We'll do image classification with MobileNet.

```typescript
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgpu'

async function classifyImage(imageElement: HTMLImageElement) {
  // initialize WebGPU
  await tf.setBackend('webgpu')
  await tf.ready()

  // load the MobileNet model
  const model = await tf.loadGraphModel(
    'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/classification/5/default/1',
    {fromTFHub: true},
  )

  // preprocess the image
  const tensor = tf.browser
    .fromPixels(imageElement)
    .resizeBilinear([224, 224])
    .expandDims(0)
    .div(255.0)

  // inference
  const start = performance.now()
  const predictions = model.predict(tensor) as tf.Tensor
  const data = await predictions.data()
  const elapsed = performance.now() - start

  console.log(`Inference time: ${elapsed.toFixed(2)}ms`)

  // top 5 predictions
  const top5 = Array.from(data)
    .map((prob, i) => ({index: i, prob}))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 5)

  // clean up memory
  tensor.dispose()
  predictions.dispose()

  return {top5, inferenceTime: elapsed}
}
```

### 5. A Backend Comparison Utility

If you want to compare WebGL and WebGPU performance directly:

```typescript
async function compareBackends() {
  const backends = ['webgl', 'webgpu']
  const results: Record<string, number> = {}

  for (const backend of backends) {
    try {
      await tf.setBackend(backend)
      await tf.ready()

      const size = 512
      const a = tf.randomNormal([size, size])
      const b = tf.randomNormal([size, size])

      // warmup
      const warmup = tf.matMul(a, b)
      await warmup.data()
      warmup.dispose()

      // benchmark
      const start = performance.now()
      for (let i = 0; i < 20; i++) {
        const r = tf.matMul(a, b)
        await r.data()
        r.dispose()
      }
      results[backend] = (performance.now() - start) / 20

      a.dispose()
      b.dispose()
    } catch (e) {
      console.log(`${backend} not available`)
    }
  }

  console.table(results)
}
```

## Hands-On: Text Embeddings with Transformers.js

For a more practical example, let's generate text embeddings with Transformers.js. This is useful for search, similarity comparison, and RAG systems.

```typescript
import {pipeline} from '@huggingface/transformers'

async function generateEmbeddings(texts: string[]) {
  // create the embedding pipeline (using WebGPU)
  const extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    {device: 'webgpu'},
  )

  const start = performance.now()

  // generate embeddings
  const output = await extractor(texts, {
    pooling: 'mean',
    normalize: true,
  })

  const elapsed = performance.now() - start
  console.log(`${texts.length} texts embedded in ${elapsed.toFixed(2)}ms`)

  return output.tolist()
}

// usage example
const texts = [
  'The weather is nice today',
  'It is a sunny day',
  'The stock market fell',
]

const embeddings = await generateEmbeddings(texts)

// compute cosine similarity
function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dot / (normA * normB)
}

console.log(
  'Similarity between weather sentences:',
  cosineSimilarity(embeddings[0], embeddings[1]),
)
console.log(
  'Similarity across different topics:',
  cosineSimilarity(embeddings[0], embeddings[2]),
)
```

## Hands-On: Image Classification with Transformers.js

Image classification is just as simple. This example uses a ViT (Vision Transformer) model to figure out what an image contains.

```typescript
import {pipeline} from '@huggingface/transformers'

async function classifyImage(imageUrl: string) {
  // create the image classification pipeline (using WebGPU)
  const classifier = await pipeline(
    'image-classification',
    'Xenova/vit-base-patch16-224',
    {device: 'webgpu'},
  )

  // run classification
  const results = await classifier(imageUrl, {topk: 5})

  // results: [{label: 'golden retriever', score: 0.95}, ...]
  return results
}

// usage example
const results = await classifyImage('/path/to/image.jpg')
console.log(results[0].label) // the label with the highest probability
console.log(results[0].score) // probability (0-1)
```

You can pass a file upload, a URL, or a canvas element. The model is downloaded on first load (about 350MB for ViT-base) and cached in the browser afterwards.

![WebGPU image classification demo - correctly classifying a pug with 89.7% probability](webgpu-image-classification.png)

## The Potential of Client-Side AI

What do we gain from being able to run AI in the browser with WebGPU?

### Privacy

The key point is that **you don't have to send sensitive data to a server**.

Say you want to summarize or translate a confidential document at work. If you use the ChatGPT or Claude API, the document's contents leave for an external server. Many companies' security policies simply don't allow that. With WebGPU, you can bring the model to the browser and process the document locally. The data never leaves the device.

It's useful in scenarios like these:

- **Confidential document processing**: summarize and translate internal documents without an external API
- **Local semantic search**: meaning-based search across notes and bookmarks stored in the browser
- **Real-time video processing**: video call background blur, noise cancellation (camera/mic data never goes to a server)
- **Sensitive information classification**: detecting personal information in emails or documents (national ID numbers, card numbers, etc.)

### Offline Operation

Once a model is downloaded, you can run inference without a network. Combined with a Service Worker, you can build a fully offline AI app.

If you think about it, there are plenty of useful scenarios:

- **Translation apps**: translate while traveling abroad without data
- **Note apps**: offline text summarization, automatic tag generation
- **Photo apps**: image classification and object detection without a network

### Use Cases That Are Already Practical

I said "it's already practical for certain use cases", so what specifically?

**1. Text embeddings & semantic search**

As shown in the example above, converting text to vectors is already practical. Models like `all-MiniLM-L6-v2` are small at around 22MB and run fast enough in the browser. You can use them for blog search, document similarity comparison, and simple RAG systems.

**2. Image classification & object detection**

Lightweight models like MobileNet and EfficientNet make image classification possible. Something like "is there a cat in this photo?" can be answered in the browser in real time. Real-time object detection through a webcam works too.

**3. Speech recognition**

Whisper tiny/base models can convert speech to text. Accuracy is lower than server models, but it's good enough for simple voice memos or command recognition.

**4. Small LLM chat**

Small language models like Phi-3 and Gemma 2B can run in the browser. Response speed is slow (tens to hundreds of ms per token), but they're usable for simple Q&A or text generation. The [WebLLM](https://webllm.mlc.ai/) project demonstrates this well.

### Limitations

Of course, the limitations are clear too:

| Limitation      | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| Model size      | Browser memory limits; large models also mean long download times |
| Device variance | Slow or non-functional on low-end devices                         |
| Battery         | GPU usage on mobile drains the battery significantly              |
| Model security  | The model is exposed to the client (can be extracted)             |
| Accuracy        | Lower accuracy than large server-side models                      |

Ultimately, the right approach isn't "all AI in the browser" but "carefully selecting the use cases that fit".

## Closing

With WebGPU supported in every major browser, we can now run AI at a practical level in the browser. Text embeddings, image classification, and simple speech recognition are already worth considering in production.

Two things stand out:

**1. When privacy matters**

- Analyzing transaction history in a finance app (fraud detection, spending pattern classification)
- Symptom checking in a health app (sensitive medical information never leaves for a server)
- Automatic tagging in note/diary apps (personal content stays off the server)
- Enterprise document classification (internal confidential documents never go to an external API)

**2. When offline operation is needed**

- Translation while traveling abroad (real-time translation without data roaming)
- Voice memo to text conversion on a plane or subway
- Automatic photo classification while shooting in remote areas (no internet available)
- Manual search for field workers (factories, construction sites, and other places with unstable networks)

If you're interested, just experiment with the WebGPU backend of TensorFlow.js or Transformers.js yourself. Setup is simpler than you'd expect, and the performance difference is something you can feel.

**[👉 Try the WebGPU demo yourself](/demos/webgpu/)**

```bash
# TensorFlow.js
npm install @tensorflow/tfjs @tensorflow/tfjs-backend-webgpu

# Transformers.js
npm install @huggingface/transformers
```

## References

- [WebGPU is now supported in major browsers - web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- [WebGPU - Wikipedia](https://en.wikipedia.org/wiki/WebGPU)
- [WebGPU - Can I use](https://caniuse.com/webgpu)
- [Shipping WebGPU on Windows in Firefox 141 - Mozilla Gfx Team Blog](https://mozillagfx.wordpress.com/2025/07/15/shipping-webgpu-on-windows-in-firefox-141/)
- [WebGPU Just Got Real: What Firefox 141 and Upcoming Safari Mean for AI in the Browser - Zircon Tech](https://zircon.tech/blog/webgpu-just-got-real-what-firefox-141-and-upcoming-safari-mean-for-ai-in-the-browser/)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
