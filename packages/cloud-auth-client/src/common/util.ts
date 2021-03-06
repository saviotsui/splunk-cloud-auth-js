import CryptoJs from 'crypto-js';

import { SplunkAuthClientError } from '../error/splunk-auth-client-error';

const ACCEPTABLE_RANDOM_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklnopqrstuvwxyz0123456789';

/**
 * Generates a random string.
 * @param length Length of string.
 */
export function generateRandomString(length: number) {
    let result = '';

    const bytes = new Uint32Array(length);
    const random = window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
        result += ACCEPTABLE_RANDOM_CHARSET[random[i] % ACCEPTABLE_RANDOM_CHARSET.length];
    }
    return result;
}

/**
 * Clears the hash and search fragments from window location.
 */
export function clearWindowLocationFragments() {
    let url = `${window.location.pathname}`;
    if (window.location.search) {
        const urlQueryParams = new URLSearchParams(window.location.search.substr(1));
        urlQueryParams.delete('code');
        urlQueryParams.delete('redirect_uri');
        urlQueryParams.delete('requestId');
        urlQueryParams.delete('state');
        url += urlQueryParams.toString() ? `?${urlQueryParams.toString()}` : '';
    }

    if (window.location.hash) {
        const urlHashParams = new URLSearchParams(window.location.hash.substr(1));
        urlHashParams.delete('access_token');
        urlHashParams.delete('expires_in');
        urlHashParams.delete('id_token');
        urlHashParams.delete('redirect_uri');
        urlHashParams.delete('requestId');
        urlHashParams.delete('scope');
        urlHashParams.delete('state');
        urlHashParams.delete('token_type');
        url += urlHashParams.toString() ? `#${urlHashParams.toString()}` : '';
    }

    window.history.replaceState(null, window.document.title, url);
}

// pkce code flow
function urlEncodePkce(value: string) {
    return value
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generates the code verifier for the authorization code flow with PKCE
 * (see: https://tools.ietf.org/html/rfc7636#section-4.1)
 */
export function encodeCodeVerifier(cv: string) {
    const base64CodeVerifier = CryptoJs.enc.Base64.stringify(CryptoJs.enc.Utf8.parse(cv));
    return urlEncodePkce(base64CodeVerifier);
}

/**
 * Creates a code challenge.
 * @param codeVerifier Code verifier.
 */
export function createCodeChallenge(codeVerifier: string) {
    const codeChallenge = CryptoJs.SHA256(codeVerifier);
    const base64CodeChallenger = codeChallenge.toString(CryptoJs.enc.Base64);
    return urlEncodePkce(base64CodeChallenger);
}

/**
 * Generates a code verifier.
 * @param codeVerifierLength Code verifier length.
 */
export function generateCodeVerifier(codeVerifierLength: number) {
    if (!codeVerifierLength || codeVerifierLength < 43 || codeVerifierLength > 128) {
        throw new SplunkAuthClientError(
            `Specified code verifier length is invalid. Length=${codeVerifierLength}`
        );
    }
    return generateRandomString(codeVerifierLength);
}
