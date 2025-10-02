// Dynamic import to handle ES module
let BadWords: any;
let filter: any;

const initializeFilter = async () => {
  if (!BadWords) {
    BadWords = (await import('bad-words')).default;
    filter = new BadWords();
    // Add additional gaming/community specific inappropriate words if needed
    filter.addWords(['l33t', 'pwned', 'n00b']); // Example - you can customize this list
  }
  return filter;
};

/**
 * Check if text contains profanity
 * @param text - The text to check
 * @returns boolean - true if profanity is found
 */
export async function containsProfanity(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const profanityFilter = await initializeFilter();
  return profanityFilter.isProfane(text);
}

/**
 * Clean profanity from text by replacing with asterisks
 * @param text - The text to clean
 * @returns string - The cleaned text
 */
export async function cleanProfanity(text: string): Promise<string> {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const profanityFilter = await initializeFilter();
  return profanityFilter.clean(text);
}

/**
 * Validate username for profanity and return result with message
 * @param username - The username to validate
 * @returns object with isValid and message
 */
export async function validateUsername(username: string): Promise<{ isValid: boolean; message?: string }> {
  if (!username || typeof username !== 'string') {
    return { isValid: false, message: 'Username is required' };
  }
  
  if (username.trim().length < 2) {
    return { isValid: false, message: 'Username must be at least 2 characters long' };
  }
  
  if (username.trim().length > 50) {
    return { isValid: false, message: 'Username must be less than 50 characters' };
  }
  
  if (await containsProfanity(username)) {
    return { isValid: false, message: 'Username contains inappropriate language' };
  }
  
  return { isValid: true };
}

/**
 * Validate league name for profanity and return result with message
 * @param leagueName - The league name to validate
 * @returns object with isValid and message
 */
export async function validateLeagueName(leagueName: string): Promise<{ isValid: boolean; message?: string }> {
  if (!leagueName || typeof leagueName !== 'string') {
    return { isValid: false, message: 'League name is required' };
  }
  
  if (leagueName.trim().length < 2) {
    return { isValid: false, message: 'League name must be at least 2 characters long' };
  }
  
  if (leagueName.trim().length > 100) {
    return { isValid: false, message: 'League name must be less than 100 characters' };
  }
  
  if (await containsProfanity(leagueName)) {
    return { isValid: false, message: 'League name contains inappropriate language' };
  }
  
  return { isValid: true };
}

export default {
  containsProfanity,
  cleanProfanity,
  validateUsername,
  validateLeagueName
};