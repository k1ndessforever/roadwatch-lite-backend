// backend/services/contentClassifier.js
// AI-based content classification using keyword matching

const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

const CORRUPTION_KEYWORDS = [
  'corruption', 'scam', 'fraud', 'bribery', 'embezzlement',
  'kickback', 'money laundering', 'tax evasion', 'illegal',
  'misappropriation', 'graft', 'nepotism', 'crony'
];

const HERO_KEYWORDS = [
  'rescued', 'saved', 'helped', 'honesty', 'bravery', 'courage',
  'social work', 'donation', 'volunteer', 'award', 'recognition',
  'achievement', 'innovation', 'inspiring', 'humanitarian', 'selfless'
];

const CATEGORIES = {
  corruption: ['political', 'financial', 'bureaucratic', 'police', 'judicial', 'corporate'],
  hero: ['rescue', 'social-service', 'honesty', 'bravery', 'innovation', 'humanitarian']
};

function classify(text) {
  const lowerText = text.toLowerCase();
  const tokens = tokenizer.tokenize(lowerText);
  
  let corruptionScore = 0;
  let heroScore = 0;
  
  // Count keyword matches
  tokens.forEach(token => {
    if (CORRUPTION_KEYWORDS.some(kw => token.includes(kw))) {
      corruptionScore++;
    }
    if (HERO_KEYWORDS.some(kw => token.includes(kw))) {
      heroScore++;
    }
  });
  
  // Determine type and confidence
  let type = 'unknown';
  let confidence = 0;
  let category = null;
  let tags = [];
  
  if (corruptionScore > heroScore && corruptionScore > 0) {
    type = 'corruption';
    confidence = Math.min(corruptionScore / 10, 1.0);
    category = detectCategory(lowerText, CATEGORIES.corruption);
    tags = extractTags(lowerText, CORRUPTION_KEYWORDS);
  } else if (heroScore > corruptionScore && heroScore > 0) {
    type = 'hero';
    confidence = Math.min(heroScore / 10, 1.0);
    category = detectCategory(lowerText, CATEGORIES.hero);
    tags = extractTags(lowerText, HERO_KEYWORDS);
  }
  
  return {
    type,
    confidence,
    category,
    tags,
    scores: { corruption: corruptionScore, hero: heroScore }
  };
}

function detectCategory(text, categories) {
  for (const cat of categories) {
    if (text.includes(cat) || text.includes(cat.replace('-', ' '))) {
      return cat;
    }
  }
  return categories[0]; // Default to first category
}

function extractTags(text, keywords) {
  const tags = [];
  keywords.forEach(kw => {
    if (text.includes(kw)) {
      tags.push(kw);
    }
  });
  return tags.slice(0, 5); // Limit to 5 tags
}

module.exports = {
  classify
};
