import { SplunkOAuthError } from '../../../src/error/splunk-oauth-error';
import { validateOAuthParameters, validateSearchParameters } from '../../../src/validator/pkce-param-validators';

describe('validateSearchParameters', () => {
    it('successfully validates parameters', () => {
        // Arrange
        const searchParameters = new URLSearchParams();
        searchParameters.append('code', 'abcdef');
        searchParameters.append('state', 'some-state');

        // Act/Arrange
        expect(() => validateSearchParameters(searchParameters)).not.toThrow();
    });

    it('throws SplunkOAuthError when parameters contains error and error_description', () => {
        // Arrange
        const error = 'some error';
        const errorDescription = 'some error description';
        const searchParameters = new URLSearchParams();
        searchParameters.append('error', error);
        searchParameters.append('error_description', errorDescription);

        // Act/Arrange
        expect(() => validateSearchParameters(searchParameters)).toThrow(new SplunkOAuthError(errorDescription, error));
    });

    it('throws SplunkOAuthError when parameters does not contain code', () => {
        // Arrange
        const searchParameters = new URLSearchParams();

        // Act/Arrange
        expect(() => validateSearchParameters(searchParameters))
            .toThrow(new SplunkOAuthError('Unable to parse the code search parameter from the url.', 'token_not_found'));
    });

    it('throws SplunkOAuthError when parameters does not contain state', () => {
        // Arrange
        const searchParameters = new URLSearchParams();
        searchParameters.append('code', 'abcdsef');

        // Act/Arrange
        expect(() => validateSearchParameters(searchParameters))
            .toThrow(new SplunkOAuthError('Unable to parse the state search parameter from the url.', 'token_not_found'));
    });
});

describe('validateOAuthParameters', () => {
    it('successfully validates parameters', () => {
        // Arrange
        const searchParameters = {
            state: 'state',
            codeVerifier: 'abcdsf'
        };

        // Act/Arrange
        expect(() => validateOAuthParameters(searchParameters)).not.toThrow();
    });

    it('throws SplunkOAuthError when parameters does not contain state', () => {
        // Arrange
        const searchParameters = {
            state: undefined,
            codeVerifier: undefined
        };

        // Act/Arrange
        expect(() => validateOAuthParameters(searchParameters))
            .toThrow(new SplunkOAuthError('Unable to retrieve state from redirect params storage.', 'token_not_found'));
    });

    it('throws SplunkOAuthError when parameters does not contain codeVerifer', () => {
        // Arrange
        const searchParameters = {
            state: 'state',
            codeVerifier: undefined
        };

        // Act/Arrange
        expect(() => validateOAuthParameters(searchParameters))
            .toThrow(
                new SplunkOAuthError(
                    'Unable to retrieve codeVerifier from redirect params storage.',
                    'token_not_found'));
    });
});
