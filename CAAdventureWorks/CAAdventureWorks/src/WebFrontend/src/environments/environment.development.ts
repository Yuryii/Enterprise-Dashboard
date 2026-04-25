export const environment = {
  production: false,
  useMockAuth: true, // Enabled for development without Keycloak
  keycloak: {
    authority: 'http://localhost:8080/realms/AdventureWorks',
    clientId: 'adventureworks-web',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scope: 'openid profile email roles',
    responseType: 'code',
    silentRenew: true,
    useRefreshToken: true,
    secure: false,
    showDebugInformation: true,
  },
  apiUrl: 'http://localhost:5285',
};
