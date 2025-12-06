const badWords = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fck', 'fuk',
  'shit', 'shitting', 'shitty', 'sh1t',
  'asshole', 'asswipe',
  'bitch', 'bitches', 'b1tch',
  'dick', 'dickhead', 'd1ck',
  'cunt',
  'bastard',
  'whore', 'slut',
  'cock',
  'pussy',
  'nigger', 'n1gger', 'nigga', 'n1gga',
  'faggot', 'fag',
  'retard', 'retarded',
  'douche', 'douchebag',
  'wanker',
  'twat',
  'prick',
  'motherfucker', 'mofo',
];

function containsProfanity(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  const normalizedText = lowerText
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a');
  
  for (const word of badWords) {
    const wordPattern = new RegExp(`\\b${word}\\b`, 'i');
    if (wordPattern.test(lowerText) || wordPattern.test(normalizedText)) {
      return true;
    }
  }
  
  return false;
}

function getProfanityError(fieldName) {
  return `Please choose a different ${fieldName}. The one you entered contains inappropriate language.`;
}

module.exports = {
  containsProfanity,
  getProfanityError,
};
