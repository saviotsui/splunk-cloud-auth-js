# Splunk Cloud Services Cloud-Auth-Client

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Splunk Cloud Services Cloud-Auth-Client contains an authentication library for front-end web applications, along with code and examples to enable you to authenticate with Splunk Cloud Services in a web application using the JavaScript programming language.

You can use the `@splunkdev/cloud-auth-client` library alone or with the [Splunk Cloud Services SDK for JavaScript](https://github.com/splunk/splunk-cloud-sdk-js/) to programatically access Splunk Cloud Services.

## Terms of Service

[Splunk Cloud Services Terms of Service](https://auth.scp.splunk.com/tos)

## Authorization Grant Types

This library supports the following OAuth authorization grant types:

-   [Implicit](https://oauth.net/2/grant-types/implicit/)
-   [Proof Key for Code Exchange](https://oauth.net/2/pkce/) (PKCE)

For more about authorization flows that are supported by Splunk Cloud Services, see [Plan apps for Splunk Cloud Services](https://dev.splunk.com/scs/docs/apps/plan#Choose-an-authorization-flow) on the Splunk Developer Portal.

## Get started

Install the `@splunkdev/cloud-auth-client` package to enable your project to authenticate with Splunk Cloud Services.

Run the following command from your project directory if you use Yarn:

```sh-session
yarn add @splunkdev/cloud-auth-client
```

Run the following command from your project directory if you use npm:

```sh-session
npm install --save @splunkdev/cloud-auth-client
```

## Migrating from @splunkdev/cloud-auth

If your apps use the previous version of the library, **@splunkdev/cloud-auth**, you'll need to migrate your apps. For details, see the [Migration Guide](https://github.com/splunk/splunk-cloud-auth-js/blob/master/packages/cloud-auth-client/MIGRATION.md).

## Example

The following example shows how to work with the `@splunkdev/cloud-auth-client` library.

### React web application

This example demonstrates how to use the `@splunkdev/cloud-auth-client` library in a React web application. For an example that you can run, see [examples/cloud-auth-client-react-example](https://github.com/splunk/splunk-cloud-auth-js/blob/master/packages/cloud-auth-client/examples/cloud-auth-client-react-example).

```ts
import {
    SplunkAuthClient,
    SplunkAuthClientSettings,
    GrantType,
} from '@splunkdev/cloud-auth-client';
import React, { Component } from 'react';

// Create settings.
const authClientSettings = new SplunkAuthClientSettings(
    GRANT_TYPE,
    CLIENT_ID,
    REDIRECT_URI,
    ON_RESTORE_PATH,
    AUTH_HOST,
    AUTO_REDIRECT_TO_LOGIN,
    RESTORE_PATH_AFTER_LOGIN,
    MAX_CLOCK_SKEW,
    QUERY_PARAMS_FOR_LOGIN,
    AUTO_TOKEN_RENEWAL_BUFFER
);

// Initialize SplunkAuthClient.
const authClient = new SplunkAuthClient(authClientSettings);

class App extends Component {
    state = {
        loggedIn: false,
        error: null,
    };

    componentDidMount() {
        // Authenticate on mount
        this.authenticate();
    }

    authenticate = async () => {
        try {
            const loggedIn = (await authClient.getAccessToken()) !== '';
            this.setState({
                loggedIn,
            });
        } catch (e) {
            let errorMessage = '';
            if (e) {
                if (e.code === ERROR_CODE_OAUTH_PARAMS_TOKEN_NOT_FOUND) {
                    // This error code is surfaced when the client is unable to retrieve the OAuth parameters (including the access token)
                    // from the current window.location.href.
                }
                if (e.code === ERROR_CODE_REDIRECT_UNAUTHENTICATED) {
                    // when autoRedirectToLogin is true, the client will redirect to the auth host /authorize endpoint for login
                    // this error code is surfaced to notify the client that an access token was not retrieved but a redirect will occur.
                }

                errorMessage = e.message ? e.message : e.toString();
            }

            this.setState({
                loggedIn: false,
                error: errorMessage,
            });
        }
    };

    render() {
        const { error, loggedIn } = this.state;

        if (error) {
            return <div>Error: {error}</div>;
        }

        if (!loggedIn) {
            return <div>Loading ...</div>;
        }

        return <div>Authenticated!</div>;
    }
}
```

#### AuthClient configuration

The following example sets configuration options for `SplunkAuthClient`.

```js
{
    // The grant type.  The SplunkAuthClient supports the following grant types: implicit, pkce.
    grantType: 'implicit', // required

    // The clientId setting identifies the app that is registered with the App Registry service.
    clientId: 'YOUR_CLIENT_ID', // required

    // The redirectUri function redirects the user to the web app after logging in.
    // The value of redirectUri must be pre-registered with the App Registry service.
    redirectUri: 'https://YOUR_REDIRECT_URI.com/', // required

    // If provided, this function is called when the user is redirected from login
    // after the auth callback is successfully applied.
    // You can use this function to integrate with third-party client-side
    // routers, such as react-router, rather than calling history.replaceState.
    onRestorePath: function(path) { /* ... */ },

    // The authorization and authentication host that is used to perform the authorization flow.
    // The default value is the Splunk authorization server.
    authHost: 'https://auth.scp.splunk.com/',

    // When this setting is enabled, the user is automatically redirected to the
    // login page when the AuthClient instance is created.
    // This setting is enabled (true) by default.
    autoRedirectToLogin: true,

    // When this setting is enabled, the cloud-auth-client library restores
    // the path of the web app after redirecting to the login page.
    // This setting is enabled (true) by default.
    restorePathAfterLogin: true,

    // This setting specifies the duration buffer, in seconds, for token expiration.
    // (now > actualExpiration - maxClockSkew) is considered to be expired.
    // The default value is 600.
    maxClockSkew: 600,

    // Additional query parameters to pass along while performing login.
    queryParamsForLogin: { /* ... */ },

    // This setting specifies the duration buffer, in seconds, for token auto-renewal.
    // (now > actualExpiration - autoTokenRenewalBuffer) triggers an auto renewal.
    // The default value is 120.
    autoTokenRenewalBuffer: 120,

    // The storage key name for managing token data.
    // The default value for storage key is 'splunk-token-storage'.
    tokenStorageName: 'splunk-token-storage',

    // The storage key name for managing URL redirect parameter data.
    // The default value for storage key is 'splunk-redirect-params-storage'.
    redirectParamsStorageName: 'splunk-redirect-params-storage',
}
```

## Documentation

For Splunk Cloud Services documentation, see the [Splunk Developer Portal](https://dev.splunk.com/scs/).

## Contact

If you have questions, reach out to us on [Slack](https://splunkdevplatform.slack.com) in the **#sdc** channel or email us at _devinfo@splunk.com_.
