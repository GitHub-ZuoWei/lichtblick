# Lichtblick Architecture Diagrams

## High-Level Overview

```mermaid
flowchart TD
    subgraph "Data Source Layer"
        Sources["File / Connection / Sample"]
        Factory["Data Source Factory\ndetects format, spawns worker,\ncreates player"]
        Sources --> Factory
    end

    subgraph "Player Layer"
        Player["IterablePlayer\nstate machine: play, pause, seek"]
        Buffered["Buffered + Deserialized Pipeline\nread-ahead, bytes → JS objects"]
        Range["Message Range API\nstreaming iterator for panels\nneeding full history"]
        UserScript["UserScriptPlayer\nruns user TS scripts in workers,\nproduces virtual topics"]
        Player --- Buffered
        Player --- Range
        Buffered --> UserScript
    end

    subgraph "Panel Layer"
        Pipeline["Message Pipeline\nReact context, subscriptions"]
        Panels["Panels\nconsume currentFrame or\nstream historical data"]
    end

    Factory -->|"Player instance"| Player
    UserScript -->|"PlayerState\n(messages + virtual topics)"| Pipeline
    Range -->|"async batches\nvia subscribeMessageRange"| Panels
    Pipeline -->|"render state"| Panels
    Panels -.->|"subscriptions\n(topics, preloadType, fields)"| Pipeline
    Pipeline -.->|"merged subscriptions"| Player
```

---

## 1. Data Source Layer

```mermaid
flowchart TD
    subgraph "Data Source Layer"
        subgraph "Supported Formats"
            File["File-based\n.bag, .mcap, .db3, .ulg"]
            Live["Live connections\nWebSocket, Rosbridge"]
            Sample["Sample data\nBuilt-in demos"]
        end

        subgraph "Data Source Factory"
            Detect["initialize()\nMatch source type to factory implementation"]
            Detect --> Validate["Validate args\nCheck file type, URL scheme, permissions"]
            Validate --> CreateSource["Create IIterableSource\nSpawn Web Worker, wrap source\nfor off-main-thread reading"]
            CreateSource --> CreatePlayer["Return new IterablePlayer\nConfigured with source, metricsCollector,\nand sourceId"]
        end

        File -.-> Detect
        Live -.-> Detect
        Sample -.-> Detect

        CreatePlayer --> Player[Player]
    end
```

## 1.1 Worker / Main Thread Boundary

The Web Worker is spawned during the "Create IIterableSource" step above. All file I/O and container parsing runs off the main thread.

```mermaid
flowchart LR
    subgraph "Web Worker"
        direction TB
        IO["File / Network I/O\nread bytes from .mcap, .bag, .db3, .ulg"]
        IO --> Decompress["Chunk Decompression\nzstd, lz4"]
        Decompress --> Extract["Message Record Extraction\nslice individual message payloads\nas Uint8Array from chunk"]
        Extract --> Cursor["Cursor / Iterator\nbatches ~17ms of messages\nper RPC call"]
    end

    subgraph "Transfer"
        direction TB
        Comlink["Comlink RPC\nArrayBuffers transferred\n(zero-copy, ownership moves\nto main thread)"]
    end

    subgraph "Main Thread"
        direction TB
        Buffer2["Buffered Source\nread-ahead buffer\n(producer-consumer)"]
        Buffer2 --> Schema["Schema Lookup\npre-built MessageReader\nper topic (created once\nduring initialize)"]
        Schema --> Decode["Per-message Decode\nreadMessage() or JSON.parse()\nbinary → JS object\n(pure CPU, no I/O)"]
        Decode --> Player["Player State Machine\nemits PlayerState\nto panels"]
    end

    Cursor --> Comlink --> Buffer2
```

### What runs in the Web Worker

| Step | Description |
|------|-------------|
| **File I/O** | Reads raw bytes from the data source (local file via `Blob.slice`, or network via `fetch`) |
| **Index Parsing** | Parses the container format's index/header to discover topics, schemas, time range (done once during `initialize()`) |
| **Chunk Decompression** | Decompresses message chunks (zstd, lz4) back into raw records |
| **Message Extraction** | Slices individual message payloads as `Uint8Array` from decompressed chunk data |
| **Batched Cursor** | Groups messages into ~17ms batches to minimize RPC overhead (one batch ≈ one render frame) |

### What runs on the Main Thread

| Step | Description |
|------|-------------|
| **Buffer (read-ahead)** | Producer-consumer buffer that keeps messages ready ahead of playback position |
| **Schema-based Deserialization** | Uses pre-compiled `MessageReader` instances (one per topic, built from schema during `initialize()`) to decode each `Uint8Array` into a JS object — field by field according to the encoding (CDR, protobuf, JSON, flatbuffer) |
| **Message Slicing** | Optionally picks only requested fields from the decoded object (for panels that subscribe to partial data) |
| **Player State Emission** | Packages decoded messages + metadata into `PlayerState` and delivers to panels |

### Data Transfer Mechanism

- **Comlink** provides the RPC layer between main thread and worker (proxy-based, async method calls)
- **`Comlink.transfer()`** moves `ArrayBuffer` ownership to the main thread (zero-copy, no `structuredClone`)
- **`ComlinkTransferIteratorCursor`** wraps the worker-side cursor and marks all message buffers as transferable
- **AbortSignal** is proxied across the boundary via a custom Comlink transfer handler (since it's not cloneable)

### Buffered + Deserializing Source Interaction

The playback pipeline chains three layers on the main thread. Buffering operates on **raw bytes** so the 300MB cache holds compact `Uint8Array` messages; deserialization is deferred until the consumer actually reads at playback speed.

```mermaid
sequenceDiagram
    participant W as Worker (raw source)
    participant C as CachingIterableSource
    participant B as BufferedIterableSource (producer)
    participant Q as VecQueue (cache)
    participant B2 as BufferedIterableSource (consumer)
    participant D as DeserializingIterableSource
    participant P as IterablePlayer tick loop

    Note over W,C: CachingIterableSource wraps worker source (300MB LRU)

    rect rgb(240,248,255)
        Note over B,Q: Producer coroutine (reads ahead up to 10s)
        B->>W: messageIterator({ start: readHead })
        W-->>C: Uint8Array message batches
        C-->>B: IteratorResult<Uint8Array>
        B->>Q: enqueue(result)
        B->>B: if queue past readUntil → await writeSignal
    end

    rect rgb(255,248,240)
        Note over B2,P: Consumer path (driven by playback tick)
        P->>D: next() on playback iterator
        D->>B2: next() on raw iterator
        B2->>Q: dequeue()
        Q-->>B2: IteratorResult<Uint8Array>
        B2->>B: notify writeSignal (producer can resume)
        B2-->>D: { type: "message-event", msgEvent: { message: Uint8Array } }
        D->>D: deserialize(Uint8Array) → JS object
        D->>D: pickFields() if subscription has field slice
        D-->>P: { type: "message-event", msgEvent: { message: JS object } }
    end
```

**Construction** (in `IterablePlayer` constructor for serialized sources):
```
source (WorkerSerializedIterableSource)
  └─ CachingIterableSource (LRU, 300MB max, evicts oldest blocks)
       └─ BufferedIterableSource (producer-consumer, 10s read-ahead, Condvar sync)
            └─ DeserializingIterableSource (schema decode + field slicing + sampling)
                 = #bufferedSource (what the player's tick loop reads from)
```

**Key behaviors:**
- **Producer** reads from the worker continuously, filling the `VecQueue` until 10s ahead of the consumer's `readHead`
- **Consumer** (the tick loop) dequeues one item at a time; each dequeue notifies the producer via `writeSignal`
- **Backpressure**: producer `await`s `writeSignal` when buffer is full OR the read position is >10s ahead
- **Min buffer**: consumer `await`s `readSignal` when queue is empty OR hasn't buffered at least 1s ahead (`minReadAheadDuration`)
- **Deserialization is lazy**: raw bytes sit in the queue; decode happens only when the consumer pulls an item
- **Sampling** (`latest-per-render-tick`): `DeserializingIterableSource` can drop intermediate messages for sampled topics, only deserializing the latest per window

## 1.2 Web Workers Overview

```mermaid
flowchart TD
    subgraph "Web Workers in Lichtblick"
        subgraph "Data Source Worker (1 per source)"
            DSW["McapIterableSourceWorker\nor BagIterableSourceWorker\nor Ros2IterableSourceWorker"]
        end

        subgraph "WebSocket Worker (1 per live connection)"
            WSW["WebSocket Worker\nmanages ws:// connection"]
        end

        subgraph "User Script Workers (SharedWorkers)"
            TW["Transformer Worker (1)\ncompiles user TypeScript → JS"]
            RW["Runtime Workers (1 per script)\nexecutes compiled scripts\non each message"]
        end

        subgraph "Image Decoder Worker (1 per 3D panel image)"
            IDW["WorkerImageDecoder\ndecodes raw/compressed images\nto ImageData"]
        end
    end
```

### Worker Inventory

| Worker | Type | Count | Spawned When | Purpose | Terminated When |
|--------|------|-------|--------------|---------|-----------------|
| **Data Source** | `Worker` | 1 per open file/URL | Player `initialize()` is called (not at factory time) | File I/O, index parsing, chunk decompression, raw message extraction (yields `Uint8Array`) | Player `close()` → `WorkerSerializedIterableSource.terminate()` → `worker.terminate()` |
| **WebSocket** | `Worker` | 1 per live connection | `WorkerSocketAdapter` constructor | Manages WebSocket connection off main thread, transfers binary frames via zero-copy | Connection closes or player is disposed |
| **Transformer** | `SharedWorker` | 1 total | First user script is registered | Compiles user TypeScript code to JavaScript | Never explicitly terminated (shared, lives for app lifetime) |
| **Runtime** | `SharedWorker` | 1 per active user script | Script registration succeeds | Executes compiled JS on each message to produce virtual topic output | Script is removed or errors; worker returned to `#unusedRuntimeWorkers` pool |
| **Image Decoder** | `Worker` | 1 per `ImageRenderable` instance | 3D panel renders a raw image topic | Decodes raw pixel data (bayer, YUV, etc.) to `ImageData`, transfers result back | `ImageRenderable.dispose()` → `decoder.terminate()` |

### Lifecycle

```mermaid
sequenceDiagram
    participant Factory as Data Source Factory
    participant Player as IterablePlayer
    participant Worker as Data Source Worker

    Note over Factory: Factory only stores initWorker function
    Factory->>Player: new IterablePlayer({ source })

    Note over Player: State machine enters "initialize"
    Player->>Worker: initWorker() — spawns worker
    Player->>Worker: initialize() via Comlink
    Worker-->>Player: { topics, schemas, time range }

    Note over Player: During playback / range reads
    Player->>Worker: messageIterator() or getMessageCursor()
    Worker-->>Player: Uint8Array batches (transferred)

    Note over Player: Player.close()
    Player->>Worker: terminate() → worker.terminate()
    Note over Worker: Worker thread destroyed
```

## 2. Player Layer

```mermaid
flowchart TD
    subgraph "Player Layer"
        subgraph "Playback States"
            Init[Initializing] --> Idle[Idle]
            Idle -->|"play"| Playing[Playing]
            Playing -->|"pause"| Idle
            Idle -->|"seek"| Seeking[Seeking]
            Playing -->|"seek"| Seeking
            Seeking --> Idle
        end

        subgraph "Source Pipeline (see 1.1 for details)"
            Worker["Web Worker\nI/O, decompression, extraction"] -->|"Uint8Array batches"| Buffer["Buffered Source\nread-ahead"]
            Buffer --> Deser["Deserializing Source\ndecodes bytes → JS objects"]
        end

        subgraph "Panel Data Access"
            RangeSource["Message Range Source\n(getBatchIterator)\ndirect iterator over source\nfor full-topic streaming"]
            BlockLoader["Block Loader (legacy)\npreloads into fixed blocks\nlargely unused by panels"]
        end
    end

    subgraph "Player Output"
        PS[PlayerState]
        PS --- ActiveData["Active Data\nmessages, current time,\ntopics, playback status"]
        PS --- Progress["Progress\nloaded ranges, cached blocks"]
        PS --- Presence["Presence\ninitializing / present / buffering"]
    end

    Playing & Seeking & Idle -->|"emits"| PS
```

### Panel Data Access: BlockLoader vs subscribeMessageRange

Panels that need **all historical data** (e.g., Plot in time mode, 3D transform preloading) have moved from `BlockLoader` to `subscribeMessageRange`:

| | BlockLoader (legacy) | subscribeMessageRange (current) |
|---|---|---|
| **Mechanism** | Preloads entire file into fixed-time blocks stored in memory | Provides an async iterator directly over the source |
| **Data delivery** | Panels read from `progress.messageCache.blocks` | Panels consume batches via `onNewRangeIterator` callback |
| **Memory model** | 1GB cache with block eviction | Streaming — panels manage their own data structures |
| **Cache** | Centralized block array | None — reads directly from the raw source each time |
| **Panel control** | No backpressure; loads all subscribed topics | Panel pulls at its own pace via `for await` |
| **Status** | Still runs for `preloadType: "full"` subscriptions but panels mostly ignore the blocks | Used by Plot (`PlotCoordinator`) and 3D (transform preloading) |

`getBatchIterator` on `IterablePlayer` creates a fresh `messageIterator` over the `#messageRangeSource` (a `DeserializingIterableSource` wrapping the raw source). This means each panel subscription reads directly from the underlying data source with its own deserialization pass, bypassing the buffered playback pipeline entirely.

## 3. Panel / Extension Layer

```mermaid
flowchart TD
    subgraph "Extensions"
        Ext[Extension] -->|"registers"| Panels[Panels]
        Ext -->|"registers"| Converters[Message Converters]
    end

    subgraph "Rendering Pipeline"
        Pipeline[Message Pipeline] -->|"player state updates"| Adapter[Panel Extension Adapter]
        Adapter -->|"delivers render state"| Panel[Panel]
    end

    subgraph "Render State"
        CurrentFrame["Current Frame\nmessages at current time"]
        AllFrames["All Frames\npreloaded block messages"]
        Topics["Topics"]
        Time["Current Time"]
    end

    Adapter --> CurrentFrame & AllFrames & Topics & Time
```

## 4. End-to-End Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Source Selection
    participant Factory as Data Source Factory
    participant Player as Player
    participant Source as Data Source
    participant Pipeline as Message Pipeline
    participant Panel as Panel

    User->>UI: Open data source
    UI->>Factory: Create player for source
    Factory->>Source: Initialize source
    Factory->>Player: Create player with source
    Player->>Source: Read metadata (topics, time range)
    Player->>Pipeline: Emit player state
    Pipeline->>Panel: Deliver render state
    Panel-->>Panel: Render visualization

    User->>Panel: Seek to time T
    Panel->>Player: Request seek
    Player->>Source: Fetch messages at time T
    Player->>Pipeline: Emit updated state
    Pipeline->>Panel: Deliver new frame
```
