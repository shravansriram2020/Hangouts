const {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} = require('obscenity');

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

const censor = new TextCensor();

function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  
  try {
    return matcher.hasMatch(text);
  } catch (error) {
    console.error('Profanity check error:', error);
    return false;
  }
}

function censorProfanity(text) {
  if (!text || typeof text !== 'string') return text;
  
  try {
    const matches = matcher.getAllMatches(text);
    return censor.applyTo(text, matches);
  } catch (error) {
    console.error('Profanity censor error:', error);
    return text;
  }
}

function getProfanityError(fieldName) {
  return `Please choose a different ${fieldName}. The one you entered contains inappropriate language.`;
}

module.exports = {
  containsProfanity,
  censorProfanity,
  getProfanityError,
};
