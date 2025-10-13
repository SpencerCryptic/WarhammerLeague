/**
 * Auth utilities for handling JWT token refresh
 */

interface DecodedToken {
  exp: number;
  iat: number;
  id: number;
}

/**
 * Decode JWT token without verification (client-side only)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired or will expire soon (within 1 day)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;

  // Token expires in less than 1 day (86400 seconds)
  return expiresIn < 86400;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Refresh the JWT token by re-authenticating
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      console.log('No token or user found, cannot refresh');
      return null;
    }

    // If token is completely expired, user needs to log in again
    if (isTokenExpired(token)) {
      console.log('Token is expired, user needs to log in');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
      return null;
    }

    // Fetch current user data with existing token to get a new token
    const response = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Token is still valid, no need to refresh yet
      // Strapi doesn't have a built-in refresh endpoint, so we just verify the token is valid
      console.log('Token is still valid');
      return token;
    } else {
      // Token is invalid, clear and redirect to login
      console.log('Token is invalid, clearing and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Initialize token refresh checker
 * This should be called once when the app loads
 */
export function initTokenRefresh() {
  // Check token immediately
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    console.log('Token expired on load, redirecting to login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
    return;
  }

  // Check token every 5 minutes
  setInterval(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      if (isTokenExpired(currentToken)) {
        console.log('Token expired, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      } else if (isTokenExpiringSoon(currentToken)) {
        console.log('Token expiring soon, consider refreshing');
        // In Strapi, the best way to "refresh" is to have the user log in again
        // Or we can show a warning to the user
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}
