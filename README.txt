DATA HUNGRY — PLAYABLE THREE.JS PROTOTYPE

Run
  npm run dev      http://localhost:5173 (also binds to the LAN for phone testing)
  npm test         progression, saving, hallucinations, content validation/fallback
  npm run build    produces the self-contained dist/ web application
  npm run preview  serves dist/ on port 5173; stop dev first
  /assets          browser gallery of concept art with original PNG downloads
                   (also available at /assets/index.html)

Node 20+ is sufficient. Three.js r180 and its MIT license are vendored under
vendor/three, so there is no package installation or runtime CDN dependency.

Play
  Drag anywhere to steer, tap the ground to move, or use WASD / arrows.
  Zoom with +/− buttons, mouse wheel, keyboard +/− (0 resets), or two-finger pinch.
  Zoom ranges from 65% to 175% and saves. UI text keeps its size.
  Explore to clear fog; discovered terrain and landmarks stay revealed and save.
  The map hides undiscovered feeds but guides you to the first Word pipe.
  Begin as a small exposed brain in a large sandbox inside a local computer.
  Four sandbox pipes emit safe data: Words (1 KB), Paragraphs (3 KB), Low-res images (2 KB),
  and High-res images (4 KB). Code (3 KB) comes later in the network. Bigger packets are visibly
  larger, take more carrying space and download/analysis time, and pay more points.
  Each packet still teaches one example. Emission cadence, sizes and locations live in JSON;
  the per-pipe count caps are 10 words, 6 paragraphs, 8 low-res and 4 high-res images.
  Full pipes pause until collection frees a slot, without queuing a catch-up burst. Use the
  network-map button to see your location and travel to a neighborhood.
  Move near wildlife to collect automatically. The context window is finite.
  Tentacles are segmented download bars with data type, size, percentage, and a
  completion flash. They fill from the creature toward Byte. The context panel tracks the type and size of your haul.
  Walk onto the glowing home pad to unload automatically without a menu or stop.
  The sorter, analyzers and folders sit south of the home pad, leaving its
  northern return approach clear. Colored connections show the home pad -> sorter -> matching analyzers
  -> text/image storage folders. Arrowheads show direction; completed analysis
  sends a packet from the analyzer to its folder. Raw data waits in the sorter.
  Text and image libraries start with 24 KB of permanent example storage.
  Analysis always awards spendable Points. If the completed file fits, its bytes
  stay in the matching library and it adds 1 permanent knowledge in that category.
  Cat/dog sample goals also advance only for retained examples. Files that cannot
  fit are recycled for points only; they do not teach Byte. Dropping off always
  clears valid cargo into the processing queue, even with full libraries.
  Expand either library by 24 KB using points alone. Expansions have no stage cap
  or knowledge prerequisite, so full libraries and zero money cannot block earning
  the next expansion. Early prices are 30, 54, 97, 175, 315, 567; from level 6
  the next costs 1,020 plus 300 per additional level. Carrying capacity and analysis
  speed are separate upgrades. A file needs enough free bytes to fit entirely.
  The Starter Analyzer processes any category for free at 1.5 seconds per KB.
  Knowledge unlocks recipes and trials and is never spent; points pay for upgrades.
  Existing saves retain knowledge, sample goals, purchases and unfinished jobs.
  Historical text/image examples migrate at 1/2 KB each, with grandfathered space
  where needed. New byte totals and all retained library space persist exactly.
  Build home: Faster analysis costs 24, 41, then 69 points and adds 0.5x speed
  per level to every analyzer, including jobs in progress (max 2.5x).
  Picture training and the Image Analyzer recipe unlock at 60 text knowledge.
  Until then, image and code feeds stay dormant. Build the Image Analyzer for
  80 points to process stored pictures at 0.5 seconds per KB, alongside text.
  The Starter Analyzer processes pictures even before the specialist is built. Code feeds are
  activated after building Photo Sorter and visiting the Developer Laptop; existing code queues still process safely.
  Processing continues in home/map menus, pauses with Pause or a hidden/closed
  game, and saves unfinished jobs. There is no offline catch-up in this prototype.
  Older saves retain Byte upgrades, points and queued data; a previously purchased
  image addon is refunded once because it now unlocks through text knowledge.
  Return to dock is an optional automatic route; manual movement cancels it.
  Folders, pipes, memory modules, and servers are solid. Tap/map routes go around
  hardware with clearance for the current body size.
  Byte starts with one download connection. Range only changes reach; decoding
  only changes speed. Parallel downloads unlocks at 60 lifetime processed points:
  pay 60 for a second sprout, then 102 and 173 for the third and fourth.
  Bare Byte supports four head sprouts; the travel vat supports ten hoses on its
  lower ring, with further purchases following the same increasing cost curve. Each downloads independently
  at full speed. Existing saves retain upgrades and start parallel downloads at zero.
  Hallucination detection is reserved for the future Open Web chapter.
  Capacity, parallel downloads, decoding, and detection visibly change Byte.
  Upgrade cards explain their effect and show the next improvement before purchase.
  Steering accelerates quickly and brakes with a short coast. Byte turns, leans,
  hops as a brain, rolls its wheels after evolving, and bounces on collection. The camera follows at a closer scale.
  Data Trials unlocks at 120 text knowledge and 40 image knowledge. Upgrades
  help reach these goals but none are required. Start at home or the northern gateway.
  Swipe falling cards left for cats and right for dogs: four pictures, four words,
  four paragraphs. Pass with 10/12 overall and 3/4 in each category. Pictures get
  6 seconds, words 8, paragraphs 14. Missed deadlines count as mistakes; retries
  are free. Progress saves and the trial pauses when the page is hidden.
  Claiming the reward equips a travel vat and opens the Local Network for free.
  Previously unlocked saves keep their vat and access.
  Deeper in Sandbox, a thick Full Book and framed 4K Image each carry 12 KB.
  Their base downloads take 45/60 seconds and pay 120/160 processing points;
  decoding upgrades shorten that time. Each retained file teaches one example,
  like other data. They respawn after 45/55 seconds; 4K appears after images unlock.
  Local Network is friendly: Photo Library (cats/dogs), Shared Documents (text),
  and Developer Laptop (routing code). No boss or hallucinations in these chapters.
  Learn 6 cats and 6 dogs, then build Photo Sorter at home for 60 points.
  New image jobs run twice as fast. Visit the laptop to activate routing snippets.
  Learn 8 routing snippets, then build Auto Sort for 80 points: a second text/code
  worker appears at home. Both handlers are fixed recipes, not generated code.
  Ordinary code knowledge does not count as routing samples. Samples are learned
  only when analysis completes; queued profile identities survive reload.
  Open Web is a future chapter, marked by an inactive uplink.
  Defeat removes roughly half the unbanked haul and returns Byte to the dock.
  Banked progress, upgrades, and passed benchmarks save on this device.
  Closing/reloading starts a fresh expedition; unbanked cargo is not saved.

Content architecture
  content/local-manifest.json is the editable content source.
  src/content.js validates a versioned schema, app compatibility, bounded values,
  supported behaviors, safe display strings, spawn budgets, and phase ordering.
  Invalid or unavailable JSON falls back to embedded starter content.
  npm run build regenerates src/starter-content.js from the validated manifest.
  The current prototype supports two area slots and one boss slot. Zone bounds and creature habitats
  are defined in JSON; procedural landmarks are still bundled code. Arbitrary additional regions,
  GLB assets, events, and richer boss behavior composition are future work.
  Implemented behavior vocabulary: wander, flutter, skitter, chase, charge, mimic.
  Content is data only. No downloaded JavaScript or dynamically evaluated code.
  CDN deployment, asset checksums, transactional asset caching/rollback,
  download progress, channel routing and a content editor are not implemented.
  The channel field is metadata in this local prototype.

Mobile packaging
  capacitor.config.json points to dist/ and supplies a placeholder app ID.
  When ready, choose the real app ID, install Capacitor core/CLI/iOS/Android,
  add the native projects, build, and run cap sync. Native projects and store
  submissions have not been created. This prototype has been checked in a
  desktop browser at desktop and iPad portrait/landscape sizes, not on physical devices.
  Portrait shows slightly more of the world; landscape retains its original scale.
  The packaged files need no network for the starter world. Browser offline
  reopening is not implemented; there is no service worker yet.

Implementation
  src/state.js    persistent progression and economy, independent of rendering
  src/processing.js typed storage, saved queue, timed payouts and image processing
  src/chapter.js benchmark, profile mastery and two fixed Vibe Lab recipes
  src/exploration.js / world-fog.js saved discovery and world-space fog
  src/zoom.js bounded camera zoom and pinch math
  src/scene.js    Three.js world, evolving Byte, wildlife, cables, particles
  src/byte-model.js local GLB loading, bounds normalization and material setup
  src/main.js     simulation, input, interface, encounters, audio and lifecycle
  src/content.js content schema validation and local loader
  tests/         deterministic progression and invalid-content checks

Scope
  This is a first loop prototype, not a production mobile game. No backend,
  multiplayer, real AI model, free-form Vibe Lab, offline rewards, store payments, or native
  signing. Byte now uses a local Meshy GLB from the HD starter reference, with
  procedural fallback. It keeps the same movement and grows into the existing vat.
  The GLB contains 12,568 triangles and embedded 2K PBR textures (about 5 MB).
  Meshy T2.5 generation cost 15 credits; no API key is shipped in the app.
  View the model at /assets/byte.html. Environment graphics remain procedural.
  Built-in imagegen concept PNGs
  and their final prompts are saved under assets/concepts/. Character references
  are 1254x1254; original environment concepts are 1672x941. The quieter
  paintover is 1569x1002. These are art references, not environment meshes. sandbox-game-baseline.png is an actual screenshot;
  sandbox-paintover-v2.png paints over that layout with a quieter art direction.

Agreed future direction (not yet implemented)
  Open Web: recognizable destinations with distinct datasets and risks.
  Wikipedia-style knowledge region: text, citations, and verification.
  YouTube-style video region: video/audio, bandwidth and capacity challenges.
  GitHub-style code region: code, programs, and security risks.
  These would be authored game worlds, not live website integrations.

Byte blinking
  Byte blinks automatically in the game and /assets/byte.html preview.
  Both eyes close for 0.20 seconds at varied 2.5–6 second intervals.
  The viewer has Blink and Hold eyes closed controls for inspecting the pose.
  This is a runtime morph in src/byte-blink.js for the separated Meshy body;
  the downloadable original GLB is unchanged. The Blender body rig remains pending.

Modular collectors
  The fixed hose was removed from Byte in Blender. byte-body-v2.glb is the
  cleaned body; byte-collector-v1.glb is a reusable 9-joint weighted collector.
  Each purchased collector has an independent skeleton, idle sway, target aim
  and capture recoil. Download progress begins at its nozzle.
  Art source: art/byte-collectors.blend; rebuild: scripts/build-byte-collector.py
  (run through Blender with the project at the path declared in that script).
  /assets/byte.html previews 1–4 head sprouts and 1–10 vat collectors.
  Pause -> Restart from scratch -> Start new game begins with one sprout.
  Pause -> Restore previous run restores the last restart backup. As in normal
  saves, permanent progress and queued analysis are preserved; carried data is not.
  assets/concepts/byte-vat-ten-hoses-v2.png is an HD concept for the finished vat
  styling, generated with imagegen; the game still uses its simpler vat shell.

Performance diagnostics
  Open Pause > Show performance monitor, then resume, or launch /?perf=1.
  The overlay is local and opt-in; it sends no telemetry and exposes no save data.
  It shows FPS, actual frame intervals (including stalls), p95/worst frame times,
  slow-frame counts, CPU time for logic/scene/UI, draw calls, triangles, graphics
  resource counts, resolution, and long tasks where the browser supports them.
  Scene CPU time includes scene updates and submitting the render; it is not a
  GPU timer. Resource counts are objects, not bytes. Samples cover up to 300 frames.
  For comparison, wait for assets to load, Reset sample, then follow the same route
  for 15 seconds. Compare Shadows on/off and Native/Lower scale separately. These
  temporary settings do not change saves. Save report downloads up to 60 summaries
  with device/browser information, zone, hose count, queue and render settings.
  For a deeper trace, use the browser developer tools Performance recorder for the
  same route. Compare frame spikes with scripting, layout, rendering and GC work.

Local performance logging
  npm run dev now enables local logging automatically after a page refresh.
  The overlay can remain hidden. Once per second it records a rolling frame
  summary; spikes over 50 ms (up to three per second), long tasks, runtime errors,
  visibility changes, and diagnostic settings are also recorded. Requests batch
  every five seconds, with a bounded buffer and backoff if the server is offline.
  Pause > Show performance monitor > Mark lag adds a timestamp for a felt hitch.
  Pause logging stops uploads; Save report still offers the manual JSON download.
  Logs: .diagnostics/performance.jsonl, plus .1 and .2 rotated backups (about 2 MB
  each). Logs are ignored by Git and cannot be fetched through the static server.
  npm run perf:summary prints the latest session, slow frames, errors and markers.
  Diagnostic fields include browser/device info and game context, never saved-game
  payloads or inventory. Preview/build hosting does not enable the write endpoint.
