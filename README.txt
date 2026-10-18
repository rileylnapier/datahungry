DATA HUNGRY — PLAYABLE THREE.JS PROTOTYPE

Debug / chapter testing
  Pause > Debug tools offers Fresh sandbox, Start Local Network, and Test all
  network tools. Each replaces only the test save, identified by ?debug=1 and a
  TEST SAVE badge. Return to normal save in that menu leaves normal progress intact.
  Network start: vat, four hoses, level-5 capacity/range/decoding, level-3 analysis,
  Image Analyzer, 120 text + 60 image knowledge, expanded libraries, 250 points.
  Network recipes remain unbuilt. All-tools additionally grants both helpers,
  shield/cleaner, Photo Sorter/Auto Sort, 24 code knowledge and 1,000 points; rooms
  are revealed for testing. Debug runs and restart backups have their own namespace.

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
  Knowledge appears beside the objective: first text progress toward images, then
  text/image progress toward the vat. Completed goals show a check mark.
  /preview.html previews phone and tablet layouts in portrait/landscape; Auto
  fills the browser. Pause on localhost also links to it. Resizing preserves the
  current session and uses real iframe viewport sizes, scaled to fit the preview.
  The preview shares this browser’s save; it does not reset progress.
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
  available as soon as the guest key opens the shared network; existing code queues still process safely.
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
  Data Trials unlocks at 120 text knowledge and 60 image knowledge. Upgrades
  help reach these goals but none are required. Start at home or the northern gateway.
  Swipe falling cards left for cats and right for dogs: four pictures, four words,
  four paragraphs. Pass with 10/12 overall and 3/4 in each category. Pictures get
  6 seconds, words 8, paragraphs 14. Missed deadlines count as mistakes; retries
  are free. Progress saves and the trial pauses when the page is hidden.
  Claiming the reward equips a travel vat. A separate guest key from PATCH opens the shared network.
  Previously unlocked saves keep their vat and access.
  Deeper in Sandbox, a thick Full Book and framed 4K Image each carry 12 KB.
  The Full Book wanders in a small northern clearing west of the gateway,
  separate from the paragraph feed and the other training habitats.
  Their base downloads take 45/60 seconds and pay 120/160 processing points;
  decoding upgrades shorten that time. Each retained file teaches one example,
  like other data. They respawn after 45/55 seconds; 4K appears after images unlock.
  Shared Network now branches across eight districts: Router Hub, Family Photo Library,
  Shared Inbox, Developer Workstation, Photo Archive, Infected Media Server,
  Corrupted Backup and Quarantine Crossing. Rooms and corridors are defined in the local manifest; the
  rendered walls and collision obstacles come from the same geometry. The central
  path stays clear of the router and laptop, including at maximum vat size.
  The first rooms are safe. One early malware patrol stays in Quarantine Crossing;
  further malware stays inside the marked server and backup rooms. Retreat to safe rooms.
  Regular cat/dog photos are 6 KB, archive photos 8 KB, articles/scripts 6 KB.
  The archive also holds a 12 KB 4K image; documents include a full book.
  Earning the vat grants an extra 48 KB text / 96 KB image library space once,
  including for existing vat saves. This leaves room for the first network goals.
  There is no boss or hallucination minigame in this chapter.
  Photo Sorter is optional: learn 6 cats and 6 dogs and pay 60 points to double
  image processing speed. It does not gate code, agents, or the story. The map and
  Network workshop guide directly to safe code at the Developer Workstation.
  Code is available on network entry; the Starter Analyzer handles it for free.
  Learn 8 routing snippets, then build Auto Sort for 80 points: a second text/code
  worker appears at home. Both handlers are fixed recipes, not generated code.
  Ordinary code knowledge does not count as routing samples. Samples are learned
  only when analysis completes; queued profile identities survive reload.
  Network workshop (Home > Build home) unlocks four fixed programs using code:
    Courier Agent: 6 code knowledge + 90 points. Call from the HUD; picks up at most
      24 KB, leaves noise with Byte, carries real files home for normal analysis.
    Malware Shield: 8 code knowledge + 100 points. Reduces damage by 60% and skips
      corrupted files until a cleaner is installed. Home heals and purges noise.
    Collector Agent: 14 code knowledge + 180 points, requires courier. Assign a
      discovered safe room at home. Downloads up to 18 KB then carries it home.
      Stop/reassign while carrying data returns that cargo first. One of each agent.
    Malware Cleaner: 16 code knowledge + 180 points, requires shield. Byte's hoses
      turn malware into 6 KB of code and clean corrupted files into useful code.
  Knowledge is never spent. Agents use visible floating robot placeholders with
  distinct silhouettes: mint courier cargo pod, lavender collector suction nozzle.
  Agent cargo and assignments save; deliveries award points/knowledge only through
  the base analyzers. Agents pause with the game and do not work while it is closed.
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

  Brain hose roots bind to crown surface triangles and follow brain movement,
  tilt and deformation. Vat hoses remain mounted to the hardware ring.

STORY CHAPTER: A LITTLE BIT READY
  Opening: Developer teaches text, then pictures, then Data Trials. After the vat,
  the developer mentions learning sound/video and eventually helping with the
  computer. Byte starts early, posts to the Help Board, and accepts PATCH's guest key.
  Shared Inbox: read the unread email about a broken media server. This unlocks
  3 KB cyan waveform creatures at Family Photo Library and 6 KB pink film creatures
  at Photo Archive. Learn 3 sound and 3 video examples by dropping clips at home.
  Media clips use normal context capacity, queues, saved jobs, processing time and
  points. For this first media lesson, the starter streams audio/video/code directly
  into knowledge; they do not occupy the text/image libraries or need new storage.
  Read the media report, then the workstation maintenance node. Build the shield
  (8 code knowledge / 100 points), repair sound on the Infected Media Server, build
  the cleaner (16 code / 180 points), and restore the video index from the backup.
  Repairs light the server's speakers and animate its screen. Story components are
  permanent and independent of carried data, defeat, or library space.
  The missing decoder lives outside. Check the firewall, assemble the Web Bridge
  at home at no extra cost, then connect the northern relay. The firewall remains
  active; the relay is the allowed outside route. Open Web is a future chapter.
  Navigation: tap the current HUD assignment, or open the assignment-log button.
  Approach terminals and use the on-screen interaction button or E. Dialogue can
  be closed anytime and resumes at its saved line. Completed conversations remain
  in the log. Base processing continues through conversations; Pause stops it.
  Authoring: src/story-dialogue.js contains dialogue only. src/story.js owns gates,
  destinations and save migration. Change dialogue wording without changing IDs.
  Story version 2 replaces the early missing-dog preview, retaining the guest key,
  hardware, money, knowledge and queues. Existing pre-story vat saves keep access.
  Debug tools include After Data Trials (meet PATCH), Start Local Network (read the
  email), and Server repaired (assemble and test the Web Bridge), all on test saves.

DEVICE HOSE CONNECTIONS
----------------------
Training Terminal and network consoles have glowing service sockets. Interacting
with a nearby device plugs one existing hose into its socket, sends light pulses
toward Byte, and releases when the conversation closes. New games still start
with the bare brain and one head hose; the vat uses its nearest unlocked hose.
Home keeps its separate multi-hose unloading ring. Remote assignment-log reading
does not create a cable across the map. Connected conversations leave the world
visible, with a raised camera and bottom dialogue sheet on smaller screens.
