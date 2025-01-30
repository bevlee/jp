import levenshteinDistance from "js-levenshtein";

export const sameWord = (wordA, wordB) => {
  let stemmedA = getStem(wordA);
  let stemmedB = getStem(wordB);
  return stemmedA == stemmedB;
};
export const getStem = (word) => {
  return word.trim().toLowerCase();
};

// return true if it matches the secret word or one of the words
// allow the guess to be 1 levenshtein distance away per 4 chars in secret word
export const correctGuess = (guess, secretWord) => {
  const secretWordLength = secretWord.length;
  let distanceAllowed = Math.floor(secretWordLength / 4);
  let normalizedGuess = guess.toLowerCase();
  let normalizedWord = secretWord.toLowerCase();

  if (levenshteinDistance(normalizedGuess, normalizedWord) <= distanceAllowed) {
    return true;
  }
  // allow guess to be one part of a multi-part secret word
  // The inaccuracy should be equivalent to the individual word not the whole string
  for (let splitWord of normalizedWord.split(" ")) {
    distanceAllowed = Math.floor(splitWord.length / 4);
    if (levenshteinDistance(splitWord, normalizedGuess) <= distanceAllowed) {
      return true;
    }
  }
  return false;
};
