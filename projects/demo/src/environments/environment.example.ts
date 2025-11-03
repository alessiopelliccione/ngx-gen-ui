export interface AppEnvironment {
  production: boolean;
  firebase: {
    apiKey: string;
    projectId: string;
    authDomain: string;
    appId: string;
  };
  firebaseVertexModel: string;
}

export const environment: AppEnvironment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    appId: 'YOUR_FIREBASE_APP_ID'
  },
  firebaseVertexModel: 'YOUR_VERTEX_MODEL_NAME'
};
