export const environment = {
  production: true,
  keycloak: {
    authority: '${KEYCLOAK_AUTHORITY}/realms/AdventureWorks',
    clientId: 'adventureworks-web',
    redirectUri: '${APP_URL}',
    postLogoutRedirectUri: '${APP_URL}',
    scope: 'openid profile email roles',
    responseType: 'code',
    silentRenew: true,
    useRefreshToken: true,
    secure: true,
    showDebugInformation: false,
  },
  apiUrl: '${API_URL}',
};
