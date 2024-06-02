import { Construct } from 'constructs';
import {
  aws_s3,
  aws_athena,
  Stack,
  StackProps,
  RemovalPolicy,
  aws_glue,
} from 'aws-cdk-lib';

export class LogAnalysisStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const s3LogsBucketName = this.node.tryGetContext('s3LogsBucketName');

    // 共通
    // Athenaクエリ結果格納バケット
    const athenaQueryResultBucket = new aws_s3.Bucket(this, 'athenaQueryResultBucket', {
      bucketName: `athena-query-result-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // CloudTrail
    // Athenaワークグループ CloudTrail用
    new aws_athena.CfnWorkGroup(this, 'athenaWorkGroupCloudTrail', {
      name: 'athenaWorkGroupCloudTrail',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaQueryResultBucket.bucketName}/cloudtrail`,
        },
      },
      recursiveDeleteOption: true,
    });

    // データカタログ CloudTrail用
    const dataCatalogCloudTrail = new aws_glue.CfnDatabase(this, 'dataCatalogCloudTrail', {
      catalogId: this.account,
      databaseInput: {
        createTableDefaultPermissions: [],
        name: 'data_catalog_cloudtrail',
      },
    });

    // テーブルスキーマ CloudTrail用
    const cloudTrailTableColumns = [
      { name: 'eventVersion', type: 'string' },
      { name: 'userIdentity', type: 'struct<type:string,principalId:string,arn:string,accountId:string,invokedBy:string,accessKeyId:string,userName:string,sessionContext:struct<attributes:struct<mfaAuthenticated:string,creationDate:string>,sessionIssuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:map<string,string>>>' },
      { name: 'eventTime', type: 'string' },
      { name: 'eventSource', type: 'string' },
      { name: 'eventName', type: 'string' },
      { name: 'awsRegion', type: 'string' },
      { name: 'sourceIpAddress', type: 'string' },
      { name: 'userAgent', type: 'string' },
      { name: 'errorCode', type: 'string' },
      { name: 'errorMessage', type: 'string' },
      { name: 'requestParameters', type: 'string' },
      { name: 'responseElements', type: 'string' },
      { name: 'additionalEventData', type: 'string' },
      { name: 'requestId', type: 'string' },
      { name: 'eventId', type: 'string' },
      { name: 'readOnly', type: 'string' },
      { name: 'resources', type: 'array<struct<arn:string,accountId:string,type:string>>' },
      { name: 'eventType', type: 'string' },
      { name: 'apiVersion', type: 'string' },
      { name: 'recipientAccountId', type: 'string' },
      { name: 'serviceEventDetails', type: 'string' },
      { name: 'sharedEventID', type: 'string' },
      { name: 'vpcEndpointId', type: 'string' },
      { name: 'eventcategory', type: 'string' },
      { name: 'tlsDetails', type: 'struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>' },
    ];

    // データカタログテーブル CloudTrail用
    const cloudTrailTable = new aws_glue.CfnTable(this, 'cloudTrailTable', {
      catalogId: this.account,
      databaseName: dataCatalogCloudTrail.ref,
      tableInput: {
        name: 'cloudtrail_table',
        description: `CloudTrail table for S3 bucket`,
        storageDescriptor: {
          columns: cloudTrailTableColumns,
          location: `s3://${s3LogsBucketName}/AWSLogs/`,
          inputFormat: 'com.amazon.emr.cloudtrail.CloudTrailInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hive.hcatalog.data.JsonSerDe',
          },
        },
        partitionKeys: [
          { name: 'region', type: 'string' },
          { name: 'date', type: 'string' },
          { name: 'accountid', type: 'string' },
        ],
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'projection.enabled': 'true',
          'projection.date.type': 'date',
          'projection.date.range': '2024/01/01,NOW',
          'projection.date.format': 'yyyy/MM/dd',
          'projection.date.interval': '1',
          'projection.date.interval.unit': 'DAYS',
          'projection.region.type': 'enum',
          'projection.region.values': 'us-east-1,us-east-2,us-west-1,us-west-2,af-south-1,ap-east-1,ap-south-1,ap-northeast-2,ap-southeast-1,ap-southeast-2,ap-northeast-1,ca-central-1,eu-central-1,eu-west-1,eu-west-2,eu-south-1,eu-west-3,eu-north-1,me-south-1,sa-east-1',
          'projection.accountid.type': 'injected',
          'storage.location.template': `s3://${s3LogsBucketName}/AWSLogs/\${accountid}/CloudTrail/\${region}/\${date}`,
          'classification': 'cloudtrail',
          'compressionType': 'gzip',
          'typeOfData': 'file',
        },
      },
    });

    // Alb
    // Athenaワークグループ Alb用
    new aws_athena.CfnWorkGroup(this, 'athenaWorkGroupAlb', {
      name: 'athenaWorkGroupAlb',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaQueryResultBucket.bucketName}/alb`,
        },
      },
      recursiveDeleteOption: true,
    });

    // データカタログ Alb用
    const dataCatalogAlb = new aws_glue.CfnDatabase(this, 'dataCatalogAlb', {
      catalogId: this.account,
      databaseInput: {
        createTableDefaultPermissions: [],
        name: 'data_catalog_alb',
      },
    });

    // テーブルスキーマ ALB用
    const albTableColumns = [
      { name: 'time', type: 'string' },
      { name: 'client_ip', type: 'string' },
      { name: 'client_port', type: 'int' },
      { name: 'listener_port', type: 'int' },
      { name: 'tls_protocol', type: 'string' },
      { name: 'tls_cipher', type: 'string' },
      { name: 'tls_handshake_latency', type: 'double' },
      { name: 'leaf_client_cert_subject', type: 'string' },
      { name: 'leaf_client_cert_validity', type: 'string' },
      { name: 'leaf_client_cert_serial_number', type: 'string' },
      { name: 'tls_verify_status', type: 'string' },
    ];

    // // データカタログテーブル Alb用
    const albTable = new aws_glue.CfnTable(this, 'albTable', {
      catalogId: this.account,
      databaseName: dataCatalogAlb.ref,
      tableInput: {
        name: 'alb_connection_logs',
        description: `Alb table for S3 bucket`,
        storageDescriptor: {
          columns: albTableColumns,
          location: `s3://${s3LogsBucketName}/AWSLogs/`,
          inputFormat: 'org.apache.hadoop.hive.ql.io.HiveInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.RegexSerDe',
            parameters: {
              'serialization.format': '1',
              'input.regex': '([^ ]*) ([^ ]*) ([0-9]*) ([0-9]*) ([A-Za-z0-9.-]*) ([^ ]*) ([-.0-9]*) \\"([^\\"]*)\\" ([^ ]*) ([^ ]*) ([^ ]*)',
            },
          },
        },
        partitionKeys: [
          { name: 'day', type: 'string' },
          { name: 'accountid', type: 'string' },
        ],
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'projection.enabled': 'true',
          'projection.day.type': 'date',
          'projection.day.range': '2024/01/01,NOW',
          'projection.day.format': 'yyyy/MM/dd',
          'projection.day.interval': '1',
          'projection.day.interval.unit': 'DAYS',
          'projection.accountid.type': 'injected',
          'storage.location.template': `s3://${s3LogsBucketName}/AWSLogs/\${accountid}/elasticloadbalancing/${this.region}/\${day}`,
        },
      },
    });
  }
}