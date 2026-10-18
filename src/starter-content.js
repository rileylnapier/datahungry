// Generated from content/local-manifest.json by scripts/build.mjs.
export default {
  "schemaVersion": 1,
  "contentVersion": 18,
  "minimumAppVersion": "0.1.0",
  "channel": "development",
  "disabled": false,
  "balance": {
    "startingCapacity": 12,
    "capacityPerLevel": 6,
    "startingRange": 2.15,
    "rangePerLevel": 0.6,
    "upgradeGrowth": 1.7,
    "gateTraining": 120,
    "gateUpgrades": 2,
    "parallelTraining": 60,
    "startingSpeed": 4.4,
    "vatSpeedBonus": 0.1,
    "speedPerLevel": 0.05
  },
  "creatures": {
    "text": {
      "behavior": "wander",
      "size": 1,
      "value": 3,
      "decode": 0.75,
      "speed": 0.48
    },
    "image": {
      "behavior": "flutter",
      "size": 2,
      "value": 8,
      "decode": 1.25,
      "speed": 0.8
    },
    "code": {
      "behavior": "skitter",
      "size": 3,
      "value": 15,
      "decode": 1.8,
      "speed": 1.15
    },
    "audio": {
      "behavior": "wander",
      "size": 3,
      "value": 12,
      "decode": 2.4,
      "speed": 0.65
    },
    "video": {
      "behavior": "wander",
      "size": 6,
      "value": 30,
      "decode": 4.8,
      "speed": 0.35
    }
  },
  "upgrades": {
    "capacity": {
      "base": 24
    },
    "range": {
      "base": 30
    },
    "decode": {
      "base": 36
    },
    "clarity": {
      "base": 42
    },
    "parallel": {
      "base": 60
    },
    "speed": {
      "base": 60
    }
  },
  "areas": [
    {
      "id": "localhost",
      "zone": 0,
      "name": "Sandbox",
      "bounds": {
        "minX": -18,
        "maxX": 18,
        "minZ": -29,
        "maxZ": 14
      },
      "spawns": [
        {
          "creature": "text",
          "count": 10,
          "habitat": {
            "minX": -14,
            "maxX": -7,
            "minZ": -11,
            "maxZ": -5.5
          },
          "emitter": {
            "x": -12,
            "z": -8,
            "interval": 1.5,
            "id": "words",
            "name": "Word pipe"
          },
          "packetSize": 1
        },
        {
          "creature": "text",
          "count": 6,
          "packetSize": 3,
          "habitat": {
            "minX": -16,
            "maxX": -10,
            "minZ": -25,
            "maxZ": -16
          },
          "emitter": {
            "id": "paragraphs",
            "name": "Paragraph pipe",
            "x": -12,
            "z": -21,
            "interval": 2.5
          }
        },
        {
          "creature": "image",
          "count": 8,
          "habitat": {
            "minX": 3,
            "maxX": 16,
            "minZ": -18,
            "maxZ": 6
          },
          "emitter": {
            "x": 6,
            "z": -7,
            "interval": 1.8,
            "id": "snapshots",
            "name": "Low-res image pipe"
          },
          "packetSize": 2
        },
        {
          "creature": "image",
          "count": 4,
          "packetSize": 4,
          "habitat": {
            "minX": 6,
            "maxX": 16,
            "minZ": -17,
            "maxZ": -10
          },
          "emitter": {
            "id": "bundles",
            "name": "High-res image pipe",
            "x": 12,
            "z": -14,
            "interval": 3
          }
        },
        {
          "creature": "text",
          "profile": "full_book",
          "count": 1,
          "packetSize": 12,
          "habitat": {
            "minX": -6,
            "maxX": -4,
            "minZ": -28,
            "maxZ": -26
          }
        },
        {
          "creature": "image",
          "profile": "image_4k",
          "count": 1,
          "packetSize": 12,
          "habitat": {
            "minX": 1,
            "maxX": 6,
            "minZ": -26,
            "maxZ": -21
          }
        }
      ],
      "hostiles": [],
      "hallucinations": {
        "behavior": "mimic",
        "count": 0
      }
    },
    {
      "id": "local_network",
      "zone": 1,
      "name": "Shared Network",
      "bounds": {
        "minX": -36,
        "maxX": 36,
        "minZ": -112,
        "maxZ": -35
      },
      "spawns": [
        {
          "creature": "image",
          "count": 5,
          "packetSize": 6,
          "habitat": {
            "minX": -31,
            "maxX": -25,
            "minZ": -54,
            "maxZ": -43
          },
          "profile": "cat"
        },
        {
          "creature": "image",
          "count": 5,
          "packetSize": 6,
          "habitat": {
            "minX": -23,
            "maxX": -17,
            "minZ": -54,
            "maxZ": -43
          },
          "profile": "dog"
        },
        {
          "creature": "text",
          "count": 6,
          "packetSize": 3,
          "habitat": {
            "minX": 17,
            "maxX": 24,
            "minZ": -54,
            "maxZ": -42
          }
        },
        {
          "creature": "text",
          "count": 3,
          "packetSize": 6,
          "habitat": {
            "minX": 25,
            "maxX": 31,
            "minZ": -54,
            "maxZ": -43
          },
          "profile": "article"
        },
        {
          "creature": "code",
          "count": 6,
          "packetSize": 3,
          "habitat": {
            "minX": -8,
            "maxX": -2,
            "minZ": -77,
            "maxZ": -67
          },
          "profile": "routing"
        },
        {
          "creature": "code",
          "count": 3,
          "packetSize": 6,
          "habitat": {
            "minX": 2,
            "maxX": 8,
            "minZ": -77,
            "maxZ": -67
          },
          "profile": "script"
        },
        {
          "creature": "image",
          "count": 3,
          "packetSize": 8,
          "habitat": {
            "minX": 17,
            "maxX": 23,
            "minZ": -82,
            "maxZ": -70
          },
          "profile": "cat"
        },
        {
          "creature": "image",
          "count": 3,
          "packetSize": 8,
          "habitat": {
            "minX": 25,
            "maxX": 31,
            "minZ": -82,
            "maxZ": -70
          },
          "profile": "dog"
        },
        {
          "creature": "image",
          "count": 1,
          "packetSize": 12,
          "habitat": {
            "minX": 22,
            "maxX": 27,
            "minZ": -84,
            "maxZ": -80
          },
          "profile": "image_4k"
        },
        {
          "creature": "text",
          "count": 4,
          "packetSize": 4,
          "habitat": {
            "minX": -30,
            "maxX": -18,
            "minZ": -87,
            "maxZ": -74
          },
          "profile": "corrupt_text"
        },
        {
          "creature": "code",
          "count": 3,
          "packetSize": 8,
          "habitat": {
            "minX": -9,
            "maxX": 9,
            "minZ": -107,
            "maxZ": -98
          },
          "profile": "corrupt_code"
        },
        {
          "creature": "text",
          "count": 3,
          "packetSize": 1,
          "habitat": {
            "minX": -2,
            "maxX": 2,
            "minZ": -60,
            "maxZ": -55
          }
        },
        {
          "creature": "text",
          "count": 1,
          "packetSize": 12,
          "habitat": {
            "minX": 25,
            "maxX": 30,
            "minZ": -56,
            "maxZ": -53
          },
          "profile": "full_book"
        },
        {
          "creature": "audio",
          "count": 4,
          "packetSize": 3,
          "habitat": {
            "minX": -29,
            "maxX": -18,
            "minZ": -53,
            "maxZ": -47
          }
        },
        {
          "creature": "video",
          "count": 4,
          "packetSize": 6,
          "habitat": {
            "minX": 18,
            "maxX": 30,
            "minZ": -81,
            "maxZ": -71
          }
        }
      ],
      "hostiles": [
        {
          "enemy": "malware",
          "count": 3,
          "habitat": {
            "minX": -31,
            "maxX": -17,
            "minZ": -88,
            "maxZ": -73
          }
        },
        {
          "enemy": "malware",
          "count": 3,
          "habitat": {
            "minX": -9,
            "maxX": 9,
            "minZ": -108,
            "maxZ": -98
          }
        },
        {
          "enemy": "malware",
          "count": 1,
          "habitat": {
            "minX": -2.6,
            "maxX": 2.6,
            "minZ": -61,
            "maxZ": -54
          }
        }
      ],
      "hallucinations": {
        "behavior": "mimic",
        "count": 0
      },
      "districts": [
        {
          "id": "router",
          "name": "Router Hub",
          "bounds": {
            "minX": -9,
            "maxX": 9,
            "minZ": -52,
            "maxZ": -35
          },
          "color": "#86cdd5",
          "safe": true
        },
        {
          "id": "photos",
          "name": "Family Photo Library",
          "bounds": {
            "minX": -33,
            "maxX": -15,
            "minZ": -57,
            "maxZ": -39
          },
          "color": "#b9a5ef",
          "safe": true
        },
        {
          "id": "documents",
          "name": "Shared Inbox",
          "bounds": {
            "minX": 15,
            "maxX": 33,
            "minZ": -57,
            "maxZ": -39
          },
          "color": "#d8efa8",
          "safe": true
        },
        {
          "id": "developer",
          "name": "Developer Workstation",
          "bounds": {
            "minX": -11,
            "maxX": 11,
            "minZ": -80,
            "maxZ": -64
          },
          "color": "#f3b77f",
          "safe": true
        },
        {
          "id": "archive",
          "name": "Photo Archive",
          "bounds": {
            "minX": 15,
            "maxX": 33,
            "minZ": -86,
            "maxZ": -66
          },
          "color": "#92aaf4",
          "safe": true
        },
        {
          "id": "infected",
          "name": "Infected Media Server",
          "bounds": {
            "minX": -33,
            "maxX": -15,
            "minZ": -91,
            "maxZ": -70
          },
          "color": "#ef8b91",
          "safe": false
        },
        {
          "id": "backup",
          "name": "Corrupted Backup",
          "bounds": {
            "minX": -12,
            "maxX": 12,
            "minZ": -110,
            "maxZ": -95
          },
          "color": "#e3a273",
          "safe": false
        },
        {
          "id": "quarantine",
          "name": "Quarantine Crossing",
          "bounds": {
            "minX": -4,
            "maxX": 4,
            "minZ": -62,
            "maxZ": -53
          },
          "color": "#ef8b91",
          "safe": false
        }
      ],
      "corridors": [
        {
          "minX": -17,
          "maxX": -7,
          "minZ": -50,
          "maxZ": -42
        },
        {
          "minX": 7,
          "maxX": 17,
          "minZ": -50,
          "maxZ": -42
        },
        {
          "minX": -4,
          "maxX": 4,
          "minZ": -98,
          "maxZ": -48
        },
        {
          "minX": -17,
          "maxX": -9,
          "minZ": -79,
          "maxZ": -71
        },
        {
          "minX": 9,
          "maxX": 17,
          "minZ": -77,
          "maxZ": -69
        }
      ]
    }
  ],
  "enemies": {
    "malware": {
      "behavior": "chase",
      "speed": 1.3,
      "detection": 5,
      "damage": 14
    }
  },
  "bosses": [
    {
      "id": "gatekeeper",
      "name": "Stress Test",
      "integrity": 80,
      "damage": 22,
      "decodeRate": 8,
      "reward": 90,
      "phases": [
        {
          "untilHealth": 0.45,
          "behaviors": [
            {
              "type": "chase",
              "speed": 0.8
            }
          ]
        },
        {
          "untilHealth": 0,
          "behaviors": [
            {
              "type": "chase",
              "speed": 1.1
            },
            {
              "type": "charge",
              "speed": 5.5,
              "duration": 0.6,
              "interval": 3.8
            }
          ]
        }
      ],
      "enabled": false
    }
  ],
  "processing": {
    "secondsPerKB": 1.5,
    "imageSecondsPerKB": 0.5,
    "imageMuncherCost": 80,
    "textKnowledgeGoal": 60,
    "analyzerSpeedCost": 24
  },
  "chapter": {
    "sandboxText": 120,
    "sandboxImages": 60,
    "trialText": 6,
    "trialImages": 4,
    "photoGoal": 6,
    "codeGoal": 8,
    "photoCost": 60,
    "autoSortCost": 80
  },
  "benchmark": {
    "id": "animal-recognition-v1",
    "passScore": 10,
    "minimumPerKind": 3,
    "cards": [
      {
        "id": "cat-picture-1",
        "kind": "picture",
        "answer": "cat",
        "variant": 0
      },
      {
        "id": "dog-picture-1",
        "kind": "picture",
        "answer": "dog",
        "variant": 0
      },
      {
        "id": "cat-picture-2",
        "kind": "picture",
        "answer": "cat",
        "variant": 1
      },
      {
        "id": "dog-picture-2",
        "kind": "picture",
        "answer": "dog",
        "variant": 1
      },
      {
        "id": "cat-word-1",
        "kind": "word",
        "answer": "cat",
        "text": "Meow"
      },
      {
        "id": "dog-word-1",
        "kind": "word",
        "answer": "dog",
        "text": "Bark"
      },
      {
        "id": "cat-word-2",
        "kind": "word",
        "answer": "cat",
        "text": "Kitten"
      },
      {
        "id": "dog-word-2",
        "kind": "word",
        "answer": "dog",
        "text": "Puppy"
      },
      {
        "id": "cat-paragraph-1",
        "kind": "paragraph",
        "answer": "cat",
        "text": "She curls up on the windowsill. When I stroke her soft fur, she purrs and gives a little meow."
      },
      {
        "id": "dog-paragraph-1",
        "kind": "paragraph",
        "answer": "dog",
        "text": "He waits by the door with his leash. Outside, he barks happily and fetches the ball I throw."
      },
      {
        "id": "cat-paragraph-2",
        "kind": "paragraph",
        "answer": "cat",
        "text": "The kitten spots a toy mouse. She pounces, then climbs onto my lap and starts to purr."
      },
      {
        "id": "dog-paragraph-2",
        "kind": "paragraph",
        "answer": "dog",
        "text": "The puppy trots beside me on our walk. He wags his tail and gives a friendly woof to another puppy."
      }
    ]
  }
};
