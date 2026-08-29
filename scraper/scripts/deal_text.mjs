const ISSUE_LINE_RE = /^\s*issue\s*[:\-]/i;

const NETWORK_ALIASES = ["network signal", "data signal", "signal", "network"];

const CAMERA_ALIASES = [
  "camera",
  "back cam",
  "rear cam",
  "front cam",
  "cam",
  "lens",
  "x3 camera",
  "telephoto"
];

const SCREEN_ALIASES = ["screen", "display", "lcd"];

const ALL_WORKING_PHRASES = [
  "all working",
  "working tanan",
  "working lahat",
  "okay lahat",
  "ok lahat",
  "all goods"
];

// Bare "no" after Face ID / TrueTone often starts seller boilerplate
// ("No sim restrictions", "No history of repair"), not "no face id".
const BENIGN_NO_FOLLOWERS = new Set([
  "sim",
  "sims",
  "simcard",
  "restriction",
  "restrictions",
  "history",
  "repair",
  "repairs",
  "issue",
  "issues",
  "problem",
  "problems",
  "other",
  "others",
  "dent",
  "dents",
  "scratch",
  "scratches",
  "box",
  "charger",
  "cable",
  "brick",
  "adapter",
  "password",
  "passcode",
  "icode",
  "icloud",
  "account",
  "owner",
  "openbox"
]);

const BENIGN_NO_COLLAPSED_PREFIXES = [
  "nosim",
  "nosims",
  "nosimcard",
  "norestriction",
  "norestrictions",
  "nohistory",
  "norepair",
  "norepairs",
  "noissue",
  "noissues",
  "noproblem",
  "noproblems",
  "noother",
  "noothers",
  "nodent",
  "nodents",
  "noscratch",
  "noscratches",
  "nobox",
  "nocharger",
  "nocable",
  "nopassword",
  "nopasscode",
  "noicloud",
  "noaccount",
  "noowner",
  "noopenbox"
];

function isBenignNoCollapsed(collapsed, noIdx) {
  if (noIdx < 0) return false;
  const tail = collapsed.slice(noIdx);
  return BENIGN_NO_COLLAPSED_PREFIXES.some((p) => tail.startsWith(p));
}

function isBenignNoToken(tokens, noIdx) {
  if (noIdx < 0 || tokens[noIdx] !== "no") return false;
  const next = tokens[noIdx + 1];
  return Boolean(next && BENIGN_NO_FOLLOWERS.has(next));
}

const FEATURE_RULES = {
  face_id: {
    sequences: [["face", "id"]],
    singles: ["faceid", "face_id"],
    collapsed: ["faceid", "face_id"],
    positives: ["with", "may", "working", "wrking", "ok", "okay", "functional", "gagana", "gana", "naga"],
    negatives: [
      "no", "not", "wala", "wla", "di", "dili", "dli", "indi", "way", "waay",
      "guba", "issue", "problem", "broken", "defect", "dead", "disabled",
      "unavailable", "failed", "failure", "error", "cant", "cannot", "unusable"
    ],
    allowFallbackWorking: true
  },
  trutone: {
    sequences: [["true", "tone"]],
    singles: ["truetone", "trueton", "trutone", "trueton"],
    collapsed: ["truetone", "trueton", "trutone"],
    positives: ["working", "wrking", "ok", "okay", "functional", "on", "gagana", "gana", "naga", "with", "may"],
    negatives: ["no", "not", "wala", "wla", "di", "dili", "dli", "indi", "way", "waay", "missing", "off", "dead", "guba", "naguba"],
    allowFallbackWorking: true
  },
  camera: {
    sequences: [["camera"], ["back", "cam"], ["rear", "cam"], ["front", "cam"], ["camera", "lens"]],
    singles: ["camera", "cam", "lens"],
    collapsed: ["camera", "backcam", "rearcam", "frontcam", "cam", "cameralens", "lens"],
    positives: ["working", "ok", "okay", "clear"],
    // Prefer explicit optics/OIS issues; "good" removed (matches "all goods" near camera).
    negatives: [
      "issue",
      "problem",
      "broken",
      "defect",
      "dead",
      "blur",
      "blurd",
      "blurry",
      "blurred",
      "fog",
      "crack",
      "cracked",
      "hairline",
      "shake",
      "shaking",
      "unstabilized",
      "unstable",
      "nocamera",
      "notworking",
      "notwork"
    ],
    allowFallbackWorking: false
  },
  screen: {
    sequences: [["screen"]],
    singles: ["screen", "display"],
    collapsed: ["screen", "display"],
    positives: [],
    negatives: [
      "issue", "problem", "broken", "line", "lines", "green", "pink", "flicker", "burn", "dead", "ghost",
      "crack", "cracked", "crackline", "cracklines", "dot", "dots", "pixel", "deadpixel"
    ],
    allowFallbackWorking: false
  },
  lcd: {
    sequences: [["lcd"], ["apple", "service", "center"]],
    singles: ["lcd", "oled", "display", "servicecenter"],
    collapsed: ["lcd", "oled", "display", "appleservicecenter", "servicecenter"],
    positives: ["orig", "original"],
    negatives: [
      "replace", "replaced", "replacement",
      "change", "changed", "nachange",
      "palit", "pinalitan", "ilis", "isli", "pullout", "incell"
    ],
    allowFallbackWorking: false
  },
  back_glass: {
    sequences: [["back", "glass"]],
    singles: ["backglass", "back_glass", "glass"],
    collapsed: ["backglass", "backglass", "glass"],
    positives: [],
    negatives: ["crack", "cracked", "buka", "basag", "replace", "replaced", "replacement", "palit", "pinalitan"],
    allowFallbackWorking: false
  },
  network: {
    sequences: [["network", "signal"], ["data", "signal"], ["network"], ["signal"]],
    singles: ["signal", "network", "simlock", "lock", "locked"],
    collapsed: ["networksignal", "datasignal", "signal", "network", "globelock", "smartlock", "tntlock", "globeonly", "smartonly", "tntonly", "smarttntonly"],
    positives: [],
    negatives: ["no", "not", "wala", "walang", "wla", "di", "dili", "dli", "indi", "lock", "locked", "globe", "smart", "tnt"],
    allowFallbackWorking: false
  },
  wifi_only: {
    sequences: [["wifi", "only"], ["wi", "fi"]],
    singles: ["wifi", "wifionly"],
    collapsed: ["wifionly"],
    positives: [],
    negatives: ["only", "lang"],
    allowFallbackWorking: false
  },
  battery: {
    sequences: [["battery"], ["batt"]],
    singles: ["battery", "batt"],
    collapsed: ["battery", "batt"],
    positives: [],
    negatives: [
      "replace", "replaced", "replacement",
      "change", "changed", "nachange", "nachange",
      "palit", "pinalitan", "ilis", "isli"
    ],
    allowFallbackWorking: false
  },
  button: {
    sequences: [
      ["volume", "up"],
      ["volume", "down"],
      ["volume", "button"],
      ["power", "button"],
      ["power", "key"],
      ["lock", "button"],
      ["side", "button"]
    ],
    singles: ["volume"],
    collapsed: [
      "volume",
      "volumeup",
      "volumedown",
      "volup",
      "voldown",
      "volumebutton",
      "powerbutton",
      "powerkey",
      "lockbutton",
      "sidebutton"
    ],
    positives: ["working", "ok", "okay", "functional", "gagana", "gana", "naga"],
    negatives: ["issue", "problem", "broken", "defect", "dead", "notwork", "notworking", "guba"],
    allowFallbackWorking: false,
    mentionImpliesIssue: true
  },
  audio: {
    sequences: [["microphone"], ["mic"], ["speaker"], ["earpiece"], ["loudspeaker"]],
    singles: ["microphone", "mic", "speaker", "earpiece", "loudspeaker"],
    collapsed: ["microphone", "mic", "speaker", "earpiece", "loudspeaker"],
    positives: ["working", "ok", "okay", "functional", "good", "gagana", "gana", "naga"],
    negatives: [
      "issue", "problem", "broken", "defect", "dead", "guba",
      "not", "no", "wala", "wla", "di", "dili", "dli", "indi", "way", "waay",
      "notwork", "notworking", "cant", "cannot"
    ],
    allowFallbackWorking: false,
    // Audio is commonly listed as part of "all functions working" checklists.
    // Only flag when there's an explicit negative ("no mic", "speaker issue", etc.).
    mentionImpliesIssue: false
  }
};

function normalizeLower(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildViews(text) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();
  const collapsed = lower.replace(/[^a-z0-9]+/g, "");
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  return { raw, lower, collapsed, tokens };
}

function findSequencePositions(tokens, seq) {
  const positions = [];
  if (!seq.length) return positions;
  for (let i = 0; i <= tokens.length - seq.length; i++) {
    let ok = true;
    for (let j = 0; j < seq.length; j++) {
      if (tokens[i + j] !== seq[j]) {
        ok = false;
        break;
      }
    }
    if (ok) positions.push(i);
  }
  return positions;
}

function findFeaturePositions(tokens, rule) {
  const positions = [];
  for (const seq of rule.sequences || []) {
    positions.push(...findSequencePositions(tokens, seq));
  }
  for (let i = 0; i < tokens.length; i++) {
    if ((rule.singles || []).includes(tokens[i])) positions.push(i);
  }
  return positions;
}

function hasTokenNear(tokens, positions, tokenSet, window = 3) {
  for (const pos of positions) {
    const start = Math.max(0, pos - window);
    const end = Math.min(tokens.length - 1, pos + window);
    for (let i = start; i <= end; i++) {
      if (tokenSet.has(tokens[i])) return true;
    }
  }
  return false;
}

function lineHasAny(line, needles) {
  return needles.some((n) => line.includes(n));
}

function scanIssueLines(lower) {
  const hits = { camera: false, screen: false, network: false };
  const lines = lower.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!ISSUE_LINE_RE.test(line)) continue;
    if (lineHasAny(line, CAMERA_ALIASES)) hits.camera = true;
    if (lineHasAny(line, SCREEN_ALIASES)) {
      const replacementOnly =
        /\b(replace|replaced|replacement)\b/i.test(line) &&
        /\b(apple\s*service\s*center|service\s*center|genuine|original)\b/i.test(line);
      if (!replacementOnly) hits.screen = true;
    }
    if (lineHasAny(line, NETWORK_ALIASES)) hits.network = true;
  }
  return hits;
}

function collapsedHasAny(collapsed, needles) {
  return (needles || []).some((n) => n && collapsed.includes(n));
}

function collapsedHasNegativeNear(collapsed, feature, negatives) {
  const maxDist = 12;
  const featIdx = collapsed.indexOf(feature);
  if (featIdx === -1) return false;
  for (const n of negatives || []) {
    if (!n) continue;
    let idx = collapsed.indexOf(n);
    while (idx !== -1) {
      if (n === "no" && isBenignNoCollapsed(collapsed, idx)) {
        idx = collapsed.indexOf(n, idx + n.length);
        continue;
      }
      if (n === "issue") {
        if (idx >= 2 && collapsed.slice(idx - 2, idx) === "no") {
          idx = collapsed.indexOf(n, idx + n.length);
          continue;
        }
      }
      if (n === "problem") {
        if (idx >= 2 && collapsed.slice(idx - 2, idx) === "no") {
          idx = collapsed.indexOf(n, idx + n.length);
          continue;
        }
      }
      if (idx < featIdx) {
        idx = collapsed.indexOf(n, idx + n.length);
        continue;
      }
      if (Math.abs(idx - featIdx) <= maxDist) return true;
      idx = collapsed.indexOf(n, idx + n.length);
    }
  }
  return false;
}

function collapsedHasNegationPrefix(collapsed, feature, negatives) {
  for (const n of negatives || []) {
    if (!n) continue;
    const needle = `${n}${feature}`;
    const idx = collapsed.indexOf(needle);
    if (idx === -1) continue;
    if (n === "no" && isBenignNoCollapsed(collapsed, idx)) continue;
    if (n === "issue" && idx >= 2 && collapsed.slice(idx - 2, idx) === "no") continue;
    return true;
  }
  return false;
}

function collapsedHasPositiveNear(collapsed, feature, positives) {
  const maxDist = 12;
  const featIdx = collapsed.indexOf(feature);
  if (featIdx === -1) return false;
  for (const p of positives) {
    const idx = collapsed.indexOf(p);
    if (idx === -1) continue;
    if (Math.abs(idx - featIdx) <= maxDist) return true;
  }
  return false;
}

function hasAllWorkingPhrase(lower) {
  return ALL_WORKING_PHRASES.some((p) => normalizeLower(lower).includes(p));
}

function hasNegTokenNear(tokens, positions, tokenSet, window = 2) {
  for (const pos of positions) {
    const start = Math.max(0, pos - window);
    const end = Math.min(tokens.length - 1, pos + window);
    for (let i = start; i <= end; i++) {
      const token = tokens[i];
      if (!tokenSet.has(token)) continue;
      // "no issue" / "no sim restrictions" / etc. are not feature negatives.
      if (token === "no" && isBenignNoToken(tokens, i)) continue;
      if (token === "issue" && tokens[i - 1] === "no") continue;
      return true;
    }
  }
  return false;
}

function evaluateFeature(views, rule) {
  const positions = findFeaturePositions(views.tokens, rule);
  const negSet = new Set([...(rule.negatives || [])]);
  const posSet = new Set([...(rule.positives || [])]);
  const collapsedFeatureHit = collapsedHasAny(views.collapsed, rule.collapsed || []);
  const featureHit = positions.length > 0 || collapsedFeatureHit;

  const negTokenHit = positions.length ? hasNegTokenNear(views.tokens, positions, negSet, 3) : false;
  const posTokenHit = positions.length ? hasTokenNear(views.tokens, positions, posSet, 3) : false;

  const collapsedNeg =
    featureHit &&
    ((rule.collapsed || []).some((c) => collapsedHasNegationPrefix(views.collapsed, c, rule.negatives || [])) ||
      (rule.collapsed || []).some((c) => collapsedHasNegativeNear(views.collapsed, c, rule.negatives || [])));
  const collapsedPos =
    featureHit &&
    ((rule.collapsed || []).some((c) => collapsedHasPositiveNear(views.collapsed, c, rule.positives || [])) ||
      collapsedHasAny(views.collapsed, rule.positives || []));

  let negative = negTokenHit || collapsedNeg;
  let positive = !negative && (posTokenHit || collapsedPos);

  if (rule.mentionImpliesIssue && featureHit) {
    const hasNegation = negTokenHit || collapsedNeg;
    if ((posTokenHit || collapsedPos) && !hasNegation) {
      negative = false;
      positive = true;
    } else {
      negative = true;
      positive = false;
    }
  }

  return { negative, positive };
}

export function detectIssues(text) {
  const views = buildViews(text);
  if (!views.raw) {
    return {
      face_id_working: null,
      face_id_not_working: false,
      trutone_working: null,
      trutone_missing: false,
      lcd_replaced: false,
      back_glass_replaced: false,
      back_glass_cracked: false,
      battery_replaced: false,
      camera_issue: false,
      screen_issue: false,
      network_locked: false,
      wifi_only: false,
      button_issue: false,
      audio_issue: false,
      for_parts: false,
      water_damage: false,
      dead_unit: false
    };
  }

  const face = evaluateFeature(views, FEATURE_RULES.face_id);
  const truetone = evaluateFeature(views, FEATURE_RULES.trutone);
  const camera = evaluateFeature(views, FEATURE_RULES.camera);
  const screen = evaluateFeature(views, FEATURE_RULES.screen);
  const lcd = evaluateFeature(views, FEATURE_RULES.lcd);
  const back = evaluateFeature(views, FEATURE_RULES.back_glass);
  const network = evaluateFeature(views, FEATURE_RULES.network);
  const wifi = evaluateFeature(views, FEATURE_RULES.wifi_only);
  const battery = evaluateFeature(views, FEATURE_RULES.battery);
  const button = evaluateFeature(views, FEATURE_RULES.button);
  const audio = evaluateFeature(views, FEATURE_RULES.audio);
  const issueHits = scanIssueLines(views.lower);

  const allWorking = hasAllWorkingPhrase(views.lower);

  const workingWord = "(?:working|wrking|ok|okay|functional|gagana|naga\\s*gana|gana)";
  const faceFeature = "face\\s*id";
  const truetoneFeature = "(?:true\\s*tone|truetone|trutone|trueton)";

  function hasWorkingNear(featureRe) {
    if (new RegExp(`\\b${featureRe}\\b[^\\n]{0,24}\\b${workingWord}\\b`, "i").test(views.lower)) {
      return true;
    }
    // "All working truetone & Face ID" — working before the feature is OK,
    // but not when a negation sits between them ("working … no face id").
    const rev = new RegExp(`\\b${workingWord}\\b([^\\n]{0,24})\\b${featureRe}\\b`, "i");
    const m = rev.exec(views.lower);
    if (!m) return false;
    return !/\b(no|not|wala|wla|di|dili|dli|indi|way|waay)\b/i.test(m[1]);
  }

  const faceWorkingPhrase = hasWorkingNear(faceFeature);
  const faceWorkingEmoji =
    /\bface\s*id\b[^\n]{0,6}[✅✔️]/i.test(views.lower) || /[✅✔️][^\n]{0,6}\bface\s*id\b/i.test(views.lower);
  const faceBadEmoji =
    /\bface\s*id\b[^\n]{0,6}(?:❌|✗|✘|\bx\b)/i.test(views.lower) ||
    /(?:❌|✗|✘|\bx\b)[^\n]{0,6}\bface\s*id\b/i.test(views.lower);
  const faceNegPhrase =
    /\b(no|not|wala|wla|di|dili|dli|indi|way|waay)\s+face\s*id\b/i.test(views.lower) ||
    /\bface\s*id\b[^\n]{0,24}\b(not\s*work(?:ing)?|broken|defect|dead|guba)\b/i.test(views.lower) ||
    // "issue/problem" after Face ID, but not "NO ISSUE" / "NO PROBLEM"
    /\bface\s*id\b[^\n]{0,24}\b(?<!no\s)(issue|problem)\b/i.test(views.lower) ||
    /\bissue\s*[:\-]\s*face\s*id\b/i.test(views.lower) ||
    ["faceid", "face_id"].some((tok) => {
      const idx = views.collapsed.indexOf(tok);
      if (idx === -1) return false;
      const prefixes = ["no", "not", "wala", "wla", "di", "dili", "dli", "indi", "way", "waay"];
      return prefixes.some((p) => {
        // Require the negation immediately before the feature (nofaceid),
        // not a later bare "no" from "No sim restrictions" (faceidnosim…).
        const before = views.collapsed.slice(Math.max(0, idx - p.length), idx);
        return before === p;
      });
    });
  const truetoneNoPhrase =
    /\b(no|not|wala|wla|di|dili|dli|indi|way|waay)\s+(?:true\s*tone|truetone|trutone|trueton)\b/i.test(views.lower);
  const truetoneWorkingPhrase = hasWorkingNear(truetoneFeature);
  const truetoneWorkingEmoji =
    /\b(true\s*tone|truetone|trutone|trueton)\b[^\n]{0,6}[✅✔️]/i.test(views.lower) ||
    /[✅✔️][^\n]{0,6}\b(true\s*tone|truetone|trutone|trueton)\b/i.test(views.lower);
  const truetoneBadEmoji =
    /\b(true\s*tone|truetone|trutone|trueton)\b[^\n]{0,6}(?:❌|✗|✘|\bx\b)/i.test(views.lower) ||
    /(?:❌|✗|✘|\bx\b)[^\n]{0,6}\b(true\s*tone|truetone|trutone|trueton)\b/i.test(views.lower);

  const truetoneMissing =
    (truetone.negative || truetoneNoPhrase || truetoneBadEmoji) &&
    !truetoneWorkingPhrase &&
    !truetoneWorkingEmoji;
  const faceNotWorking = faceBadEmoji
    ? true
    : faceNegPhrase
      ? true
      : !!face.negative && !(faceWorkingPhrase || faceWorkingEmoji);
  const faceWorking =
    faceNotWorking
      ? null
      : faceWorkingPhrase || faceWorkingEmoji
        ? true
        : face.positive
          ? true
          : allWorking
            ? true
            : null;
  const truetoneWorking =
    truetoneMissing
      ? null
      : truetoneWorkingPhrase || truetoneWorkingEmoji
        ? true
        : truetone.positive
          ? true
          : allWorking
            ? true
            : null;

  const touchIssue =
    /\b(no|not|wala|wla|di|dili|dli|indi)\s+touch\b/i.test(views.lower) ||
    /\btouch\b[^\n]{0,12}\b(not\s*work(?:ing)?|issue|problem|broken|dead|defect)\b/i.test(views.lower);

  const wideBlur =
    /\b(0\.5x?|0\.5|ultra\s*wide|ultrawide|wide\s*angle)\b/i.test(views.lower) &&
    /\b(blur|blurd|blurry|blurred|ga\s*blurd|ga\s*blur)\b/i.test(views.lower);

  // Bidirectional: "hairline crack sa x3 camera lens" / "camera lens crack"
  const cameraCrack =
    /\b(hairline\s*)?(crack|cracked|basag)\b[^\n]{0,32}\b(cam|camera|lens|tele(?:photo)?|x3)\b/i.test(
      views.lower
    ) ||
    /\b(cam|camera|lens|tele(?:photo)?|x3)\b[^\n]{0,32}\b(hairline\s*)?(crack|cracked|basag)\b/i.test(
      views.lower
    );

  // OIS / shake: "nag unstabilized ang x3 camera — ga shake"
  const cameraShake =
    /\b(cam|camera|lens|tele(?:photo)?|x3|ois)\b/i.test(views.lower) &&
    /\b(shake|shaking|ga\s*shake|unstabili[sz]e[sd]?|unstable|no\s*ois|ois\s*(?:issue|problem|broken|guba)|stabilizer\s*(?:issue|problem|broken|guba|dead))\b/i.test(
      views.lower
    );

  const cameraNoBlur =
    /\bno\s+(blur|blurd|blurry|blurred)\b/i.test(views.lower) &&
    /\b(cam|camera|back\s*cam|rear\s*cam|front\s*cam)\b/i.test(views.lower);
  const cameraHardNeg =
    /\b(issue|problem|broken|defect|dead|nocamera|not\s*work(?:ing)?|notwork|crack|cracked|shake|shaking|unstabili[sz]e[sd]?)\b/i.test(
      views.lower
    );

  let cameraNegative =
    camera.negative || issueHits.camera || wideBlur || cameraCrack || cameraShake;
  if (cameraNoBlur && !cameraHardNeg && !cameraCrack && !cameraShake) {
    cameraNegative = false;
  }

  const screenReplacementOnly =
    /\b(lcd|screen|display)\b[^\n]{0,32}\b(replace|replaced|replacement)\b/i.test(views.lower) &&
    /\b(apple\s*service\s*center|service\s*center|genuine|original)\b/i.test(views.lower);

  const crackLineOnly = /\bcracklines?\b/i.test(views.lower);

  const screenCrackLcd =
    /\b(crack|cracked|crackline|cracklines|basag|buka)\b[^\n]{0,12}\b(lcd|screen|display)\b/i.test(views.lower) ||
    /\b(lcd|screen|display)\b[^\n]{0,12}\b(crack|cracked|crackline|cracklines|basag|buka)\b/i.test(views.lower);

  const screenNegative =
    (screen.negative || issueHits.screen || touchIssue || screenCrackLcd || crackLineOnly) && !screenReplacementOnly;
  const networkNegative = network.negative || issueHits.network;

  const backCrack =
    /\b(crack|cracked|basag|buka)\b[^\n]{0,16}\bback\b/i.test(views.lower) ||
    /\bback\b[^\n]{0,16}\b(crack|cracked|basag|buka)\b/i.test(views.lower);
  const backReplacementMention =
    /\b(?:back\s*glass|backglass|backglas)\b[^\n]{0,16}\b(?:bag[- ]?o\s*(?:na\s*)?)?(?:replace|replaced|replacement|change|changed|nachange|ilis|islan|isli)\b/i.test(views.lower) ||
    /\b(?:bag[- ]?o\s*(?:na\s*)?)?(?:replace|replaced|replacement|change|changed|nachange|ilis|islan|isli)\b[^\n]{0,16}\b(?:back\s*glass|backglass|backglas)\b/i.test(views.lower);

  const batteryReplacementMention =
    /\b(battery|batt)\b[^\n]{0,40}\b(replace|replaced|replacement|change|changed|nachange)\b/i.test(views.lower);
  const batteryNoChange =
    /\bno\b[^\n]{0,4}\b(battery|batt)\b[^\n]{0,10}\b(change|changed|replace|replaced|replacement|nachange)\b/i.test(views.lower) ||
    /\bno\b[^\n]{0,10}\b(change|changed|replace|replaced|replacement|nachange)\b[^\n]{0,10}\b(battery|batt)\b/i.test(views.lower);
  const lcdReplacementMention =
    /\b(replace|replaced|replacement|change|changed|nachange)\b[^\n]{0,12}\b(lcd|oled|screen|display)\b/i.test(views.lower);
  const batteryReplacementTight =
    /\b(battery|batt)\b[^\n]{0,6}\b(replace|replaced|replacement|change|changed|nachange)\b/i.test(views.lower);
  const batteryNegative =
    battery.negative &&
    !batteryNoChange &&
    !(batteryReplacementMention && lcdReplacementMention && !batteryReplacementTight);

  const powerAccessoryMention =
    /\bpower\b[^\n]{0,8}\b(brick|adapter|charger|cable)\b/i.test(views.lower);
  const buttonFeatureMention =
    /\b(volume|button|key|lock|side)\b/i.test(views.lower);
  const buttonNegative =
    button.negative && !(powerAccessoryMention && !buttonFeatureMention);

  const forParts = hasForPartsRisk(views.raw);
  const waterDamage = hasWaterDamageSignal(views.raw);
  const deadUnit = hasDeadUnitSignal(views.raw);

  return {
    face_id_working: faceWorking,
    face_id_not_working: !!faceNotWorking,
    trutone_working: truetoneWorking,
    trutone_missing: !!truetoneMissing,
    lcd_replaced: !!lcd.negative,
    back_glass_replaced: backReplacementMention || (!!back.negative && views.lower.includes("replace")),
    back_glass_cracked:
      !backReplacementMention &&
      ((!!back.negative && (views.lower.includes("crack") || views.lower.includes("buka") || views.lower.includes("basag"))) ||
        backCrack),
    battery_replaced: !!batteryNegative,
    camera_issue: cameraNegative,
    screen_issue: screenNegative,
    network_locked: networkNegative,
    wifi_only: !!wifi.negative && views.lower.includes("wifi"),
    button_issue: !!buttonNegative,
    audio_issue: !!audio.negative,
    for_parts: forParts,
    water_damage: waterDamage,
    dead_unit: deadUnit
  };
}

/**
 * Dead / won't power on — English + Hiligaynon/Ilonggo + common typos.
 * Avoids "no power brick/charger" accessory phrasing.
 */
export function hasDeadUnitSignal(text) {
  const raw = String(text || "");
  if (!raw) return false;
  const s = raw.toLowerCase();
  const collapsed = s.replace(/[^a-z0-9]+/g, "");

  const patterns = [
    /\bdoesn'?t\s+turn\s+on\b/i,
    /\bdoes\s+not\s+turn\s+on\b/i,
    /\bdon'?t\s+turn\s+on\b/i,
    /\bwont\s+turn\s+on\b/i,
    /\bwon'?t\s+turn\s+on\b/i,
    /\bwill\s+not\s+turn\s+on\b/i,
    /\bcan'?t\s+turn\s+on\b/i,
    /\bcannot\s+turn\s+on\b/i,
    /\bnot\s+turning\s+on\b/i,
    /\bno\s+power\b(?!\s*(?:brick|adapter|charger|cable|cord|bank))/i,
    /\bdead\s+(?:phone|unit|board|motherboard|logic\s*board)\b/i,
    /\b(?:phone|unit)\s+is\s+dead\b/i,
    // Hiligaynon / Taglish: won't open / won't boot
    /\bdi\s*ma?g?\s*[- ]?\s*open\b/i,
    /\bindi\s*ma?g?\s*[- ]?\s*open\b/i,
    /\bindima\s*open\b/i,
    /\bindi\s*na\s*ma\s*open\b/i,
    /\bdi\s*na\s*ma\s*open\b/i,
    /\bindi\s*na\s*mag\s*open\b/i,
    /\bdi\s*na\s*mag\s*open\b/i,
    /\bindi\s*mag\s*bukas\b/i,
    /\bdi\s*mag\s*bukas\b/i,
    /\bindi\s*ma\s*bukas\b/i,
    /\bdi\s*ma\s*bukas\b/i,
    /\bwala\s*gagana\b/i,
    /\bwala\s*na\s*gagana\b/i,
    /\bwala\s*nagana\b/i,
    /\bindi\s*na\s*gagana\b/i,
    /\bdi\s*na\s*gagana\b/i,
    /\bindi\s*gagana\b/i,
    /\bdi\s*gagana\b/i
  ];
  if (patterns.some((re) => re.test(s))) return true;

  const collapsedHits = [
    "doesntturnon",
    "dontturnon",
    "wontturnon",
    "cannotturnon",
    "cantturnon",
    "dimaopen",
    "dimagopen",
    "indimaopen",
    "indimagopen",
    "indinamaopen",
    "dinamaopen",
    "indimagbukas",
    "dimagbukas",
    "walagagana",
    "walanagagana",
    "indinagagana",
    "dinagagana"
  ];
  return collapsedHits.some((tok) => collapsed.includes(tok));
}

/** Water / liquid damage signals (EN + local). Honors negation ("no water damage"). */
export function hasWaterDamageSignal(text) {
  const raw = String(text || "");
  if (!raw) return false;
  const s = raw.toLowerCase();
  const collapsed = s.replace(/[^a-z0-9]+/g, "");

  const negationRe = /\b(?:no|not|without|never|wala(?:ng)?|walang|di|dili|dli|indi|way|waay|free\s+from)\b/i;

  function isNegatedAt(index) {
    const window = s.slice(Math.max(0, index - 40), index);
    return negationRe.test(window);
  }

  function patternHit(re) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const globalRe = new RegExp(re.source, flags);
    for (const m of s.matchAll(globalRe)) {
      if (!isNegatedAt(m.index ?? 0)) return true;
    }
    return false;
  }

  const patterns = [
    /\bgot\s+wet\b/i,
    /\bwater\s*damage(?:d)?\b/i,
    /\bliquid\s*damage(?:d)?\b/i,
    /\bdropped\s+and\s+got\s+wet\b/i,
    /\bnalubog\b/i,
    /\bnaay\s+tubig\b/i,
    /\bmay\s+tubig\b/i,
    /\bna\s*wet\b/i,
    /\bnabasaan\b/i,
    /\btubig\b[^\n]{0,16}\b(?:sulod|inside|damage)\b/i
  ];
  if (patterns.some((re) => patternHit(re))) return true;

  const positiveTokens = ["waterdamage", "waterdamaged", "liquiddamage", "gotwet", "nawet", "nalubog"];
  const negPrefixes = ["no", "not", "without", "never", "wala", "walang", "walaang", "di", "dili", "indi", "way", "waay"];
  for (const tok of positiveTokens) {
    let idx = 0;
    while ((idx = collapsed.indexOf(tok, idx)) !== -1) {
      const before = collapsed.slice(Math.max(0, idx - 12), idx);
      const negated = negPrefixes.some((p) => before.endsWith(p));
      if (!negated) return true;
      idx += tok.length;
    }
  }
  return false;
}

/**
 * For-parts / for-repair listings — not a usable phone deal.
 * Combines explicit parts language + dead unit / water damage.
 * Note: "as is" alone is NOT a risk — sellers use it for normal condition sales.
 */
export function hasForPartsRisk(text) {
  const raw = String(text || "");
  if (!raw) return false;
  const s = raw.toLowerCase();
  const collapsed = s.replace(/[^a-z0-9]+/g, "");

  // Explicit "no repair" (working unit) — still allow dead/water checks below.
  const explicitParts = [
    /\bfor\s*repair\b/i,
    /\bfor\s*parts?\b/i,
    /\bparts?\s*out\b/i,
    /\bpartsout\b/i,
    /\bspare\s*parts?\b/i,
    /\bfor\s*technicians?\b/i,
    /\bideal\s+for\s+(?:repair|parts?|technicians?)\b/i,
    /\brepair\s+only\b/i,
    /\bparts?\s+only\b/i,
    // Hiligaynon / Taglish
    /\bpara\s+(?:sa\s+)?(?:repair|parts?|technicians?)\b/i,
    /\bpara\s+parts?\b/i
  ];
  if (explicitParts.some((re) => re.test(s))) return true;

  const collapsedParts = [
    "forrepair",
    "forparts",
    "forpart",
    "partsout",
    "partsoutonly",
    "spareparts",
    "pararepair",
    "paraparts"
  ];
  if (collapsedParts.some((tok) => collapsed.includes(tok))) return true;

  if (hasDeadUnitSignal(raw)) return true;
  if (hasWaterDamageSignal(raw)) return true;
  return false;
}

export function hasIcloudRisk(text) {
  const raw = String(text || "");
  if (!raw) return false;
  const s = raw.toLowerCase();
  const collapsed = s.replace(/[^a-z0-9]+/g, "");

  const bypassVariants = [
    /\b(?:pa\s*)?bypa(?:ss|s)(?:ed)?\b/i,
    /\bby\s*pass(?:ed)?\b/i,
    /\bbaypas(?:sed)?\b/i,
    /\bibypa(?:ss|s)(?:ed)?\b/i,
    /\bpabypa?s\b/i,
    /\bpabyba?s\b/i
  ];
  const bypassCollapsed = [
    "bypass",
    "bypas",
    "baypas",
    "ibypass",
    "ibypas",
    "pabypass",
    "pabypas",
    "pabybas"
  ];

  if (bypassVariants.some((re) => re.test(s))) return true;
  if (bypassCollapsed.some((token) => collapsed.includes(token))) return true;

  const resetClean =
    /\b(safe\s+to\s+reset|unli\s*reset)\b/i.test(s) &&
    /\b(icloud|activation\s*lock|lock)\b/i.test(s);
  if (resetClean) return false;

  const explicitlyClean =
    /\b(clean|clear)\s+icloud\b/i.test(s) ||
    /\bicloud\s+(clean|clear|ready|ok)\b/i.test(s) ||
    /\bno\s+icloud\b/i.test(s) ||
    /\bicloud\s+ready\s+to\s+(sign\s*in|use)\b/i.test(s);

  if (
    /\b(nalimtan|nalipatan|nalipat|nalimot|nakalimtan|nakalimot)\b[^\n]{0,24}\b(pass|password)\b[^\n]{0,24}\bicloud\b/i.test(s) ||
    /\b(pass|password)\b[^\n]{0,16}\bsa\b[^\n]{0,8}\bicloud\b/i.test(s) ||
    /\bforgot(?:ten)?\b[^\n]{0,24}\b(pass|password)\b[^\n]{0,24}\bicloud\b/i.test(s)
  ) {
    return true;
  }

  if (/\bnot\s+safe\s+to\s+reset\b/i.test(s)) return true;
  if (/\bactivation\s+lock\b/i.test(s)) return true;
  if (/\b(icloud)\b[^\n]{0,24}\b(lock|locked)\b/i.test(s)) return true;
  if (/\b(lock|locked)\b[^\n]{0,24}\b(icloud)\b/i.test(s)) return true;
  if (/\b(icloud)\b[^\n]{0,24}\b(bypass)\b/i.test(s)) return true;
  if (/\b(bypass)\b[^\n]{0,24}\b(icloud)\b/i.test(s)) return true;
  if (/\b(remove|tanggal|delete)\b[^\n]{0,24}\b(icloud)\b/i.test(s)) return true;

  if (explicitlyClean) return false;
  return false;
}

export function buildDebugReasons(text) {
  const views = buildViews(text);
  const reasons = {};
  for (const [key, rule] of Object.entries(FEATURE_RULES)) {
    const res = evaluateFeature(views, rule);
    reasons[key] = res;
  }
  return reasons;
}
