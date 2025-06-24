import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '@nestjs/config';

export const fetchAndInjectSecrets = async (secretName: string) => {
  const configService = new ConfigService();
  const region = configService.get('AWS_REGION');
  const client = new SecretsManagerClient({ region });

  console.log('AWS Region:', region);

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      }),
    );
    const secrets = JSON.parse(response.SecretString);
    console.log('Fetched secrets successfully');

    process.env.DATABASE_TYPE = secrets.engine;
    process.env.DATABASE_HOST = secrets.host;
    process.env.DATABASE_PORT = secrets.port;
    process.env.DATABASE_NAME = secrets.dbname;
    process.env.DATABASE_USERNAME = secrets.username;
    process.env.DATABASE_PASSWORD = secrets.password;
  } catch (error) {
    console.error('Error fetching secrets:', error);
    throw error;
  }
};
