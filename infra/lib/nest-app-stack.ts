import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import * as path from 'path';

export class NestAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbCredentialsSecret = new secretsmanager.Secret(
      this,
      'NestAppDBCredentials',
      {
        secretName: 'NestAppDBCredentialsName',
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'myadminuser',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      },
    );

    const vpc = new ec2.Vpc(this, 'NestAppVPC', {
      maxAzs: 2, // Default is all AZs in the region
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      description: 'Allow access to RDS instance from any IP address',
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow inbound PostgreSQL access from any IP',
    );

    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: [dbSecurityGroup],
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    const rdsParamsGroup = new rds.ParameterGroup(
      this,
      'NestAppRDSParamsGroup',
      {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15,
        }),
        name: 'NestAppRDSParamsGroup',
        description: 'Parameter group for Nest.js application RDS instance',
        parameters: {
          'rds.force_ssl': '0', // Disable enforce SSL connections
        },
      },
    );

    const dbInstance = new rds.DatabaseInstance(this, 'NestAppDBInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      databaseName: 'nestappdb',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      parameterGroup: rdsParamsGroup,
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const cartServiceLambda = new lambdaNodejs.NodejsFunction(
      this,
      'CartServiceLambda',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        entry: path.join(__dirname, '../../src/main-lambda.ts'),
        timeout: cdk.Duration.seconds(300),
        handler: 'handler',
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
        allowPublicSubnet: true,
        environment: {
          AWS_SECRETS_MANAGER_NAME: dbCredentialsSecret.secretName,
        },
        bundling: {
          esbuildArgs: {
            '--resolve-extensions': '.js',
          },
          externalModules: [
            'aws-sdk',
            '@nestjs/microservices',
            'class-transformer',
            '@nestjs/websockets/socket-module',
            'cache-manager',
            'class-validator',
          ], // Exclude non-runtime dependencies
        },
      },
    );

    const api = new apigateway.RestApi(this, 'CartApi', {
      restApiName: 'Cart API',
      defaultCorsPreflightOptions: {
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowOrigins: ['https://d33a3jyn7jy5kc.cloudfront.net'],
      },
      description:
        'This service serves a Nest.js application for /cart API endpoint',
    });

    const cartServiceLambdaIntegration = new apigateway.LambdaIntegration(
      cartServiceLambda,
    );

    api.root.addProxy({
      defaultIntegration: cartServiceLambdaIntegration,
    });

    cartServiceLambda.addPermission('ApiGatewayInvokePermission', {
      principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: api.arnForExecuteApi(),
    });

    dbCredentialsSecret.grantRead(cartServiceLambda);
    dbInstance.connections.allowDefaultPortFrom(cartServiceLambda);
  }
}
