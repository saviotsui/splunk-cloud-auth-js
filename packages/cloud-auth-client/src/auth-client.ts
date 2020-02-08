/*
Copyright © 2019 Splunk Inc.
SPLUNK CONFIDENTIAL – Use or disclosure of this material in whole or in part
without a valid written license from Splunk Inc. is PROHIBITED.
*/

import get from 'lodash/get';
import memoize from 'lodash/memoize';

import { AuthClientSettings, REDIRECT_PATH_PARAMS_NAME } from './auth-client-settings';
import { Logger } from './common/logger';
import { SplunkAuthClientError } from './error/splunk-auth-client-error';
import { OAuthParamManager, OAuthParamManagerSettings } from './oauth-param-manager';
import { AccessToken, TokenManager, TokenManagerSettings } from './token-manager';

/**
 * AuthClient.
 */
export class AuthClient {
    /**
     * AuthClient constructor.
     * @param settings AuthClientSettings.
     */
    public constructor(settings: AuthClientSettings) {
        if (!settings.clientId) {
            throw new SplunkAuthClientError('Missing required configuration option "clientId".');
        }

        this._settings = settings;
        this._settings.onRestorePath =
            this._settings.onRestorePath ? this._settings.onRestorePath : AuthClient.defaultRestorePath;
        this._tokenManager =
            new TokenManager(
                new TokenManagerSettings(
                    this._settings.authHost,
                    this._settings.autoTokenRenewalBuffer,
                    this._settings.clientId,
                    this._settings.redirectUri
                )
            );
        this._oauthParamManager =
            new OAuthParamManager(
                new OAuthParamManagerSettings(
                    this._settings.authHost,
                    this._settings.clientId,
                    this._settings.redirectUri
                ));

        if (this._settings.autoRedirectToLogin) {
            setTimeout(() => this.authenticate(), 0);
        }
    }

    private _settings: AuthClientSettings;

    private _tokenManager: TokenManager;

    private _oauthParamManager: OAuthParamManager;

    /**
     * Gets the access token.
     */
    public async getAccessToken(): Promise<AccessToken> {
        try {
            await this.authenticate();
        } catch {
            this.redirectToLogin();
        }
        return new Promise<AccessToken>((resolve) => resolve(this._tokenManager.get()));
    }

    /**
     * Checks whether the client is authenticated by checking for a token in storage
     * and comparing against the expiration time.
     */
    public isAuthenticated() {
        const accessToken = this._tokenManager.get();
        return accessToken
            && get(accessToken, 'expiresAt') + this._settings.maxClockSkew > Math.floor(new Date().getTime() / 1000);
    }

    /**
     * Attempt to read the token(s) returned from a redirect.
     *
     * For successful authentication requests `access_token`, `id_token`, and `code` are read from
     * the url itself.
     *
     * For authentication errors (e.g. login or consent are required), the `error` and
     * `error_description` are read from the url and used to populate and throw an SplunkOAuthError.
     *
     * For cases where no token is present, failure to verify claims, or state mismatches an
     * AuthClientError is thrown.
     */
    public async parseTokenFromRedirect(): Promise<AccessToken | null> {
        return this._oauthParamManager
            .getAccessTokenFromUrl()
            .then((accessToken: AccessToken) => {
                if (this._settings.restorePathAfterLogin) {
                    this.restorePathAfterLogin();
                }
                return accessToken;
            })
            .catch((e: any) => {
                if (e.message === 'Unable to parse a token from the url') {
                    // If there is no token nor any error messages in the url string (e.g. the page was
                    // visited for the first time) then simply return null
                    return null;
                }
                // For OAuth errors, failure to validate claims, etc. re-throw
                throw e;
            });
    }

    /**
     * Check if we already have an access token in the tokenManager (sessionStorage).
     * If not, check if there is one returned from a redirect (e.g. in the query string).
     * If that fails due to consent or login being required then redirect to the login page.
     */
    public async authenticate(redirect?: boolean): Promise<boolean> {
        const shouldRedirect = redirect === undefined ? this._settings.autoRedirectToLogin : redirect;

        if (this.isAuthenticated()) {
            return true;
        }

        try {
            const token = await this.requestToken();

            if (!token || !token.accessToken) {
                throw new SplunkAuthClientError('Token not found.', 'token_not_found');
            }

            this._tokenManager.set(token);
            return true;
        } catch (e) {
            if ((e.code === 'login_required'
                || e.code === 'consent_required'
                || e.code === 'token_not_found')
                && shouldRedirect) {
                this.redirectToLogin();
                // Change the error.message to indicate that a redirect is being performed
                Logger.warn(`${e.message} Redirecting to the login page...`);
                return false;
            }

            throw e;
        }
    }

    /* eslint-disable max-len */
    /**
     * Store window.location path information and initiate the Implicit Flow.
     * (see: https://developer.okta.com/authentication-guide/implementing-authentication/implicit#2-using-the-implicit-flow)
     *
     * If the user does not have an existing session, this will redirect to login Page. If they
     * have an existing session, or after they log in, they will be redirected back to the
     * `config.redirectUri` (or `window.location.href` if not specified) and any tokens returned
     * will be parsed via `this.parseTokensFromRedirect`.
     */
    /* eslint-enable max-len */
    public redirectToLogin() {
        if (this._settings.restorePathAfterLogin) {
            this.storePathBeforeLogin();
        }

        const additionalLoginQueryParams = this.getQueryStringForLogin();
        window.location.href = this._oauthParamManager.generateAuthUrl(additionalLoginQueryParams).href;
    }

    /**
     * Clear any tokens saved to sessionStorage. Note that session cookies are not cleared.
     */
    public logout(url?: any | string) {
        this._tokenManager.clear();
        window.location.href =
            this._oauthParamManager.generateLogoutUrl(url || this._settings.redirectUri || window.location.href).href;
    }

    /**
     * The default function to restore path if config.onRestorePath is not specified.
     */
    private static defaultRestorePath(path: string): void {
        window.history.replaceState(null, '', path);
    }

    /**
     * Check for token returned from a previous redirect, if none then call the /authorize
     */
    private requestToken = memoize(() => this.parseTokenFromRedirect());

    /**
     * Store the complete window.location information so that the state can be restored after the
     * browser is redirected to the login page and then back here.
     */
    private storePathBeforeLogin(): void {
        try {
            const path = window.location.pathname + window.location.search + window.location.hash;
            this._oauthParamManager.setRedirectPath(path);
        } catch {
            Logger.warn(`Cannot store the path at ${REDIRECT_PATH_PARAMS_NAME}`);
        }
    }

    /**
     * Retrieve the information stored in storePathBeforeLogin to restore the state of this page.
     */
    private restorePathAfterLogin(): void {
        try {
            const path = this._oauthParamManager.getRedirectPath();
            this._oauthParamManager.deleteRedirectPath();
            if (path && this._settings.onRestorePath) {
                this._settings.onRestorePath(path);
            }
        } catch {
            Logger.warn(`Cannot restore the path from ${REDIRECT_PATH_PARAMS_NAME}`);
        }
    }

    /**
     * Get the query string information for the params specified in queryParamsForLogin.
     * This is used to pass additional information via query params to the log in page.
     */
    private getQueryStringForLogin(): Map<string, string> {
        if (!this._settings.queryParamsForLogin) {
            return new Map();
        }

        const urlQueryParams = new URLSearchParams(window.location.search);
        return new Map(
            Object.entries(this._settings.queryParamsForLogin)
                .filter(
                    ([key,]) => urlQueryParams.has(key)
                )
                .map(
                    ([key, value]) => [key, String(value)]
                )
        );
    }
}