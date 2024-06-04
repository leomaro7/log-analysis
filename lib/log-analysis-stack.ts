import { Construct } from 'constructs';
import {
  aws_s3,
  aws_athena,
  Stack,
  StackProps,
  RemovalPolicy,
  aws_glue,
} from 'aws-cdk-lib';
import * as lakeformation from 'aws-cdk-lib/aws-lakeformation';
import { principals } from './principals'; // インポート部分

export class LogAnalysisStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const s3LogsBucketNameCloudTrail = this.node.tryGetContext('s3LogsBucketNameCloudTrail');
    const s3LogsBucketNameAlb = this.node.tryGetContext('s3LogsBucketNameAlb');

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
        createTableDefaultPermissions: [
          {
            principal: {
              dataLakePrincipalIdentifier: "IAM_ALLOWED_PRINCIPALS"
            },
            permissions: []
          }
        ],
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
      { name: 'resources', type: 'array<struct<arn:string,accountId:string,type:string>>' },
      { name: 'eventType', type: 'string' },
      { name: 'apiVersion', type: 'string' },
      { name: 'readOnly', type: 'string' },
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
          location: `s3://${s3LogsBucketNameCloudTrail}/AWSLogs/`,
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
          'storage.location.template': `s3://${s3LogsBucketNameCloudTrail}/AWSLogs/\${accountid}/CloudTrail/\${region}/\${date}`,
          'classification': 'cloudtrail',
          'compressionType': 'gzip',
          'typeOfData': 'file',
        },
      },
    });

    // ALB
    // Athenaワークグループ ALB用
    new aws_athena.CfnWorkGroup(this, 'athenaWorkGroupAlb', {
      name: 'athenaWorkGroupAlb',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaQueryResultBucket.bucketName}/alb`,
        },
      },
      recursiveDeleteOption: true,
    });

    // データカタログ ALB用
    const dataCatalogAlb = new aws_glue.CfnDatabase(this, 'dataCatalogAlb', {
      catalogId: this.account,
      databaseInput: {
        createTableDefaultPermissions: [
          {
            principal: {
              dataLakePrincipalIdentifier: "IAM_ALLOWED_PRINCIPALS"
            },
            permissions: []
          }
        ],
        name: 'data_catalog_alb',
      },
    });

    // テーブルスキーマ ALB用
    const albTableColumns = [
      { name: 'type', type: 'string' },
      { name: 'time', type: 'string' },
      { name: 'elb', type: 'string' },
      { name: 'client_ip', type: 'string' },
      { name: 'client_port', type: 'int' },
      { name: 'target_ip', type: 'string' },
      { name: 'target_port', type: 'int' },
      { name: 'request_processing_time', type: 'double' },
      { name: 'target_processing_time', type: 'double' },
      { name: 'response_processing_time', type: 'double' },
      { name: 'elb_status_code', type: 'int' },
      { name: 'target_status_code', type: 'string' },
      { name: 'received_bytes', type: 'bigint' },
      { name: 'sent_bytes', type: 'bigint' },
      { name: 'request_verb', type: 'string' },
      { name: 'request_url', type: 'string' },
      { name: 'request_proto', type: 'string' },
      { name: 'user_agent', type: 'string' },
      { name: 'ssl_cipher', type: 'string' },
      { name: 'ssl_protocol', type: 'string' },
      { name: 'target_group_arn', type: 'string' },
      { name: 'trace_id', type: 'string' },
      { name: 'domain_name', type: 'string' },
      { name: 'chosen_cert_arn', type: 'string' },
      { name: 'matched_rule_priority', type: 'string' },
      { name: 'request_creation_time', type: 'string' },
      { name: 'actions_executed', type: 'string' },
      { name: 'redirect_url', type: 'string' },
      { name: 'lambda_error_reason', type: 'string' },
      { name: 'target_port_list', type: 'string' },
      { name: 'target_status_code_list', type: 'string' },
      { name: 'classification', type: 'string' },
      { name: 'classification_reason', type: 'string' },
      { name: 'tid', type: 'string' },
      { name: 'unexpected', type: 'string' },
    ];

    // データカタログテーブル ALB用
    const albTable = new aws_glue.CfnTable(this, 'albTable', {
      catalogId: this.account,
      databaseName: dataCatalogAlb.ref,
      tableInput: {
        name: 'alb_table',
        description: `Alb table for S3 bucket`,
        storageDescriptor: {
          columns: albTableColumns,
          location: `s3://${s3LogsBucketNameAlb}/AWSLogs/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.RegexSerDe',
            parameters: {
              'serialization.format': '1',
              'input.regex': '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^\s]+?)\" \"([^\s]+)\" \"([^ ]*)\" \"([^ ]*)\" ?([^ ]*) ?(.*)'
            },
          },
        },
        partitionKeys: [
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
          'projection.accountid.type': 'injected',
          'storage.location.template': `s3://${s3LogsBucketNameAlb}/AWSLogs/\${accountid}/elasticloadbalancing/${this.region}/\${date}`,
        },
      },
    });

    // LakeFormationPermission
    principals.forEach((principal, index) => {
      new lakeformation.CfnPermissions(this, `LakeFormationPermissionForCloudTrailTable${index}`, {
        dataLakePrincipal: {
          dataLakePrincipalIdentifier: `arn:aws:iam::${this.account}:${principal}`,
        },
        resource: {
          tableResource: {
            catalogId: this.account,
            databaseName: dataCatalogCloudTrail.ref,
            name: 'cloudtrail_table',
          },
        },
        permissions: ['SELECT'],
        permissionsWithGrantOption: [],
      });

      new lakeformation.CfnPermissions(this, `LakeFormationPermissionForAlbTable${index}`, {
        dataLakePrincipal: {
          dataLakePrincipalIdentifier: `arn:aws:iam::${this.account}:${principal}`,
        },
        resource: {
          tableResource: {
            catalogId: this.account,
            databaseName: dataCatalogAlb.ref,
            name: 'alb_table',
          },
        },
        permissions: ['SELECT'],
        permissionsWithGrantOption: [],
      });
    });
  }
}
